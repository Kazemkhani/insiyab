"""What the day itself adds to a forecast, from public tables (opendata/public/, each with its source note beside it),
and two signals from the buses' own records. Every value here is known at the moment a forecast is made:

  heat index         from the hourly temperature and humidity of the last full hour before the forecast (Open-Meteo)
  school holiday     from the calendar: 1 where schools are closed on a working day
  public holiday     from the calendar
  prev_trip_late     how late the same vehicle ended its previous trip, in seconds: the "bus still out" signal as a number
  headway_dev        at a stop, the gap to the bus in front less the gap the timetable gives, in seconds

One day has one calendar: the two flags are the same for every row, so a model cannot learn from them on one day.
They are built so that more days need no new code, and the card says they added nothing here."""
import os
import numpy as np
import pandas as pd

PUBLIC = os.path.join(os.path.dirname(os.path.abspath(globals().get("__file__", "model/context.py"))), "..", "opendata", "public")
# The one day RTA supplied, copied from the two public tables, for where the repository is not beside the engine (a Dataiku notebook).
# tests/test_forecast_v2.py requires this copy to equal the tables. temperature in degrees Celsius and humidity in percent, hour 0 to 23.
CARRIED = {"2025-12-15": {"temperature_c": [21.8, 20.5, 19.8, 18.9, 18.3, 18.2, 17.9, 17.6, 19.0, 22.0, 24.8, 26.7, 28.1, 29.2, 30.3, 30.5, 28.7, 28.0, 27.2, 25.9, 24.7, 24.0, 23.7, 23.4], "humidity_percent": [68, 73, 77, 81, 80, 81, 83, 84, 76, 62, 53, 42, 39, 36, 32, 30, 42, 44, 46, 56, 63, 69, 72, 73],
                          "public_holiday": 0, "school_day": 0, "weekend": 0}}
NEW = {"heat_index": "how hot it feels (heat index, from the last full hour's temperature and humidity)",
       "school_holiday": "whether schools are on holiday",
       "public_holiday": "whether it is a public holiday",
       "prev_trip_late": "how late the same vehicle ended its previous trip",
       "headway_dev": "the gap to the bus in front, against the gap the timetable gives"}


def heat_index_c(temp_c, humidity):
    """Heat index in degrees Celsius. Steadman's simple formula as the US weather service states it, averaged with the
    temperature; where that reaches 80 F the Rothfusz regression (a fit to Steadman's table) is used, with its two corrections."""
    t = np.asarray(temp_c, dtype=float) * 9 / 5 + 32; rh = np.asarray(humidity, dtype=float)
    simple = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + rh * 0.094)
    full = (-42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t - 0.05481717 * rh * rh
            + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh)
    with np.errstate(invalid="ignore"):
        full = full - np.where((rh < 13) & (t >= 80) & (t <= 112), (13 - rh) / 4 * np.sqrt(np.clip(17 - np.abs(t - 95), 0, None) / 17), 0)
    full = full + np.where((rh > 85) & (t >= 80) & (t <= 87), (rh - 85) / 10 * (87 - t) / 5, 0)
    hi = np.where((simple + t) / 2 >= 80, full, (simple + t) / 2)
    return (hi - 32) * 5 / 9


def day_context(service_date, folder=PUBLIC):
    """The public tables for one service day. heat[h] is the heat index of clock hour h of the service day (h may pass 24).
    Where a table or the day is missing, the values are 0 and 'found' says so: the engine still runs, and the card reports it."""
    out = {"heat": {}, "school_holiday": 0.0, "public_holiday": 0.0, "found": {"weather": False, "calendar": False}}
    flags = lambda r: (float(r["public_holiday"]), float(int(r["school_day"]) == 0 and int(r["weekend"]) == 0 and int(r["public_holiday"]) == 0))
    try:
        w = pd.read_csv(os.path.join(folder, "weather-hourly.csv"), dtype={"date": str})
        nxt = (pd.Timestamp(service_date) + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
        for date, shift in ((service_date, 0), (nxt, 24)):
            d = w[w["date"] == date]
            for h, hi in zip(d["hour"].astype(int), heat_index_c(d["temperature_c"], d["humidity_percent"])):
                out["heat"][int(h) + shift] = round(float(hi), 2)
        out["found"]["weather"] = any(h < 24 for h in out["heat"])
    except (OSError, KeyError):
        pass
    try:
        c = pd.read_csv(os.path.join(folder, "calendar.csv"), dtype={"date": str}); c = c[c["date"] == service_date]
        if len(c):
            r = c.iloc[0]; out["found"]["calendar"] = True
            out["public_holiday"], out["school_holiday"] = flags(r)
    except (OSError, KeyError):
        pass
    carried = CARRIED.get(service_date)
    if carried and not out["found"]["weather"]:
        out["heat"] = {h: round(float(x), 2) for h, x in enumerate(heat_index_c(carried["temperature_c"], carried["humidity_percent"]))}; out["found"]["weather"] = True
    if carried and not out["found"]["calendar"]:
        out["public_holiday"], out["school_holiday"] = flags(carried); out["found"]["calendar"] = True
    return out


def heat_at(ctx, seconds):
    """The heat index of the last full clock hour before each moment: a reading for 14:00 to 15:00 is used from 15:00 on."""
    hours = (np.asarray(seconds, dtype=float) // 3600).astype(int) - 1
    known = ctx["heat"]; fill = float(np.mean(list(known.values()))) if known else 0.0
    return np.array([known.get(int(h), fill) for h in hours])


def enrich(visits):
    """Adds prev_trip_late and headway_dev to a copy of the visits. Each value at a visit rests only on records from
    before the bus left that stop (act_dep): the previous trip had ended, and the bus in front had already left."""
    v = visits.copy()
    v["late_arr_"] = v["act_arr"] - v["sched_arr"]
    last = v.sort_values(["trip_id", "seq"], kind="stable").groupby("trip_id", sort=False).agg(vehicle=("vehicle", "first"), start=("act_dep", "min"), end=("act_arr", "max"), end_late=("late_arr_", "last")).reset_index()
    last = last.sort_values(["vehicle", "start", "trip_id"], kind="stable")
    g = last.groupby("vehicle", sort=False)
    last["prev_end"] = g["end"].shift(1); last["prev_late"] = g["end_late"].shift(1)
    v = v.merge(last[["trip_id", "prev_end", "prev_late"]], on="trip_id", how="left")
    ok = v["prev_end"].notna() & (v["prev_end"] <= v["act_dep"])                     # the previous trip had ended by the time this bus left this stop
    v["prev_trip_late"] = np.where(ok, v["prev_late"], 0.0)
    v["_row"] = np.arange(len(v))
    left = v[["_row", "route_id", "direction", "stop_id", "act_dep", "sched_dep"]].sort_values("act_dep", kind="stable")
    front = left.rename(columns={"act_dep": "front_dep", "sched_dep": "front_sched", "_row": "_front"})
    m = pd.merge_asof(left, front, left_on="act_dep", right_on="front_dep", by=["route_id", "direction", "stop_id"], direction="backward", allow_exact_matches=False)
    dev = ((m["act_dep"] - m["front_dep"]) - (m["sched_dep"] - m["front_sched"])).fillna(0.0).clip(-3600, 3600)
    v["headway_dev"] = pd.Series(dev.to_numpy(), index=m["_row"].to_numpy()).reindex(v["_row"]).to_numpy()
    return v.drop(columns=["late_arr_", "prev_end", "prev_late", "_row"])
