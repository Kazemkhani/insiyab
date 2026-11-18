"""The forecast of a trip's running time, against the timetable (the third target).

One row is one trip. The model forecasts the stretch (actual running time over the time the timetable gives) and
multiplies it by the timetable's time, so a short route and a long one are on the same scale.
Every feature is known before the trip leaves: route, direction, hour and minute of the scheduled departure, the
timetable's running time, the planned break since the same vehicle's previous trip, and the vehicle's type and seats.

The split is by the clock: learn from trips scheduled before 16:00, forecast trips scheduled from 16:00.
  strict       learns only from trips that had also finished by 16:00, so nothing from the held-out hours is seen
  as_pitched   learns from every trip scheduled before 16:00, as the first-round deck did; a trip that left at 15:40
               and ended at 16:30 is learned from, which a forecast made at 16:00 could not have done
Both are reported; the strict one is the one to quote."""
import numpy as np
import pandas as pd
from .forecast import SEED, UNTOUCHED

NUM = ["sched", "hour", "dep_min", "seats", "layover"]
CAT = ["route_c", "direction_c", "bus_type_c"]
FEATURES = NUM + CAT
MIN_TRIPS = 200
DRAWS = 200
BANDS = [("16:00 to 18:59", 16, 18), ("16:00 to 19:59", 16, 19), ("From 20:00", 20, 99), ("Every held-out trip", 16, 99)]
METHODS = {"timetable": "The timetable's running time", "simple_rule": "This route's usual stretch before 16:00, times the timetable", "linear": "A plain linear model (ridge regression)", "trees": "Boosted trees"}


def trips(visits):
    v = visits.sort_values(["trip_id", "seq"], kind="stable"); g = v.groupby("trip_id", sort=False)
    t = g.agg(route=("route_id", "first"), direction=("direction", "first"), vehicle=("vehicle", "first"), bus_type=("bus_type", "first"), seats=("seats", "first"),
              sd=("sched_dep", "first"), ad=("act_dep", "first"), sa=("sched_arr", "last"), aa=("act_arr", "last")).reset_index()
    t["sched"] = (t["sa"] - t["sd"]) / 60.0; t["actual"] = (t["aa"] - t["ad"]) / 60.0
    seen = len(t); t = t[(t["sched"] >= 5) & (t["actual"] > 0)].copy(); t["ratio"] = t["actual"] / t["sched"]; t = t[t["ratio"].between(0.4, 2.5)].copy()
    t = t.sort_values(["vehicle", "sd", "trip_id"], kind="stable").reset_index(drop=True)
    t["layover"] = ((t["sd"] - t.groupby("vehicle", sort=False)["sa"].shift(1)) / 60.0).clip(-120, 240)     # the planned break: timetable times only
    t["hour"] = (t["sd"] // 3600).astype(int); t["dep_min"] = (t["sd"] % 3600) // 60
    for c in ("route", "direction", "bus_type"):
        t[c + "_c"] = pd.factorize(t[c].astype(str), sort=True)[0]
    t["seats"] = pd.to_numeric(t["seats"], errors="coerce")
    return t, seen


def _trees(X, y):
    try:
        import lightgbm as lgb
        return lgb.LGBMRegressor(objective="regression_l1", n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=20, random_state=SEED, deterministic=True, force_row_wise=True, n_jobs=1, verbose=-1).fit(X, y, categorical_feature=[FEATURES.index(c) for c in CAT])
    except ImportError:
        from sklearn.ensemble import HistGradientBoostingRegressor
        return HistGradientBoostingRegressor(loss="absolute_error", max_iter=400, learning_rate=0.05, random_state=SEED, categorical_features=[FEATURES.index(c) for c in CAT]).fit(X, y)


def _linear(tr, te):
    from sklearn.linear_model import Ridge
    cats = ["hour", "direction", "bus_type", "route"]; both = pd.concat([tr, te])
    A = pd.get_dummies(both[cats].astype(str)); A = A[sorted(A.columns)].to_numpy(dtype=float)
    A = np.column_stack([A, both["sched"].to_numpy() / 60.0, both["layover"].fillna(16).to_numpy() / 60.0])
    return te["sched"].to_numpy() * Ridge(alpha=1.0).fit(A[:len(tr)], tr["ratio"].to_numpy()).predict(A[len(tr):])


def _forecast(tr, te):
    te = te.copy(); te["timetable"] = te["sched"]
    te["trees"] = te["sched"].to_numpy() * _trees(tr[FEATURES].to_numpy(dtype=float), tr["ratio"].to_numpy()).predict(te[FEATURES].to_numpy(dtype=float))
    te["linear"] = _linear(tr, te)
    usual = tr.groupby(["route", "direction"])["ratio"].median(); every = float(tr["ratio"].median())
    te["simple_rule"] = te["sched"].to_numpy() * np.array([usual.get(k, every) for k in zip(te["route"], te["direction"])])
    return te


def _table(te):
    """By band and method: MAE, RMSE and MAPE in minutes, and how much closer than the timetable, with a range from drawing whole routes again."""
    out = []; rng = np.random.default_rng(SEED)
    for band, lo, hi in BANDS:
        d = te[te["hour"].between(lo, hi)]
        if not len(d):
            continue
        act = d["actual"].to_numpy(); base = np.abs(d["timetable"].to_numpy() - act); code, names = pd.factorize(d["route"]); picks = rng.integers(0, len(names), size=(DRAWS, len(names)))
        b_sum = np.bincount(code, base, len(names))
        for m in METHODS:
            e = d[m].to_numpy() - act; row = {"band": band, "method": m, "trips": int(len(d)), "routes": int(len(names)), "mae_min": round(float(np.abs(e).mean()), 4), "rmse_min": round(float(np.sqrt((e ** 2).mean())), 4),
                                               "mape": round(float((np.abs(e) / act).mean()), 4), "closer_than_timetable": None, "closer_lo": None, "closer_hi": None, "share_of_trips_closer": None}
            if m != "timetable" and base.sum() > 0:
                m_sum = np.bincount(code, np.abs(e), len(names)); gains = 1 - m_sum[picks].sum(axis=1) / np.maximum(b_sum[picks].sum(axis=1), 1e-9)
                row.update(closer_than_timetable=round(float(1 - np.abs(e).mean() / base.mean()), 4), closer_lo=round(float(np.quantile(gains, 0.025)), 4), closer_hi=round(float(np.quantile(gains, 0.975)), 4),
                           share_of_trips_closer=round(float((np.abs(e) < base).mean()), 4))
            out.append(row)
    return out


def run(visits):
    """Returns None where the day is too thin, else the summary and the held-out trips' errors (no trip, vehicle or route is named in a point)."""
    t, seen = trips(visits); cut = UNTOUCHED[0]
    te = t[t["sd"] >= cut]; early = t[t["sd"] < cut]; strict = early[early["aa"] <= cut]
    if len(strict) < MIN_TRIPS or len(te) < 20:
        return None
    a, b = _forecast(strict, te), _forecast(early, te)
    by_hour = [{"hour": int(h), "trips": int(len(d)), "timetable_mae_min": round(float((d["timetable"] - d["actual"]).abs().mean()), 4), "trees_mae_min": round(float((d["trees"] - d["actual"]).abs().mean()), 4)} for h, d in a.groupby("hour", sort=True)]
    f_err = (a["trees"] - a["actual"]).to_numpy(); t_err = (a["timetable"] - a["actual"]).to_numpy(); order = np.lexsort((f_err, t_err, a["sd"].to_numpy()))
    points = [{"hour": int(h), "forecast_error_min": round(float(f), 2), "timetable_error_min": round(float(x), 2)} for h, f, x in zip(a["hour"].to_numpy()[order], f_err[order], t_err[order])]
    return {"target": "trip_running_time_minutes", "unit": "minutes; an error is forecast less actual, so below zero the trip took longer than forecast",
            "features": ["route", "direction", "hour of scheduled departure", "minute of scheduled departure", "the timetable's running time", "planned break since the vehicle's previous trip", "bus type", "seats"],
            "methods": METHODS, "trips_in_the_day": int(seen), "trips_kept": int(len(t)), "kept_rule": "a trip is kept if the timetable gives it at least 5 minutes and its actual time is between 0.4 and 2.5 times that",
            "split": {"learned_from_strict": int(len(strict)), "learned_from_as_pitched": int(len(early)), "held_out": int(len(te)),
                      "strict": "learns from trips scheduled before 16:00 that had finished by 16:00; forecasts trips scheduled from 16:00",
                      "as_pitched": "learns from every trip scheduled before 16:00, finished by 16:00 or not; forecasts trips scheduled from 16:00"},
            "strict": _table(a), "as_pitched": _table(b), "by_hour_strict": by_hour,
            "share_forecast_closer": round(float((np.abs(f_err) < np.abs(t_err)).mean()), 4), "share_timetable_closer": round(float((np.abs(f_err) > np.abs(t_err)).mean()), 4),
            "n": int(len(a)), "points": points}
