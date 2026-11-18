"""The forecast of lateness (target B in docs/MODEL-PLAN.md): each time a bus leaves a stop, how late will it arrive
1, 5, 10 and 20 stops ahead? Late is actual arrival less scheduled arrival, in seconds; early is below zero.

The rule of the clock: the forecast is made at the moment the bus leaves (act_dep). It may use what that bus has done so
far, the timetable ahead, and what other buses had done by that moment, and nothing later.
The unit that is never split is the trip: at each origin the model learns only from trips that had finished, and a trip
being forecast is never among them."""
import numpy as np
import pandas as pd
from . import context as C
from .forecast import SEED, UNTOUCHED, DEVELOPMENT

AHEAD = [1, 5, 10, 20]
STEP = 1800
MIN_ROWS = 200
NAIVE = {"naive_timetable": "The timetable: the bus will be on time", "naive_stays": "The bus stays as late as it is now"}
MODELS = {"gbt": "Boosted trees on the bus's run so far, the timetable ahead and the bus in front", "linear": "A plain linear model (ridge regression) on the same features"}
BASE = ["late_now", "late_change_1", "late_change_3", "dwell_now", "stops_ahead", "sched_run_ahead", "position", "hour", "boarded_before", "seats", "bus_in_front_late", "bus_in_front_age"]
NEW = list(C.NEW)                                  # tried one at a time on the development part; only those that lower the miss there are kept
FEATURES = BASE + NEW
FEATURE_WORDS = dict({"late_now": "how late the bus is now", "late_change_1": "how its lateness changed over the last stop", "late_change_3": "how its lateness changed over the last three stops", "dwell_now": "how long it stood at this stop",
                      "stops_ahead": "how many stops ahead the forecast looks", "sched_run_ahead": "the running time the timetable gives to that stop", "position": "how far along its trip the bus is", "hour": "the time of day",
                      "boarded_before": "how many have boarded so far on the trip", "seats": "the seats on the bus", "bus_in_front_late": "how late the bus in front reached that stop", "bus_in_front_age": "how long ago the bus in front reached that stop"}, **C.NEW)


def build_rows(visits, ctx=None):
    """ctx is the day's public context (context.day_context). Without it the heat index and the two calendar flags are 0."""
    v = C.enrich(visits).sort_values(["trip_id", "seq"], kind="stable").reset_index(drop=True)
    g = v.groupby("trip_id", sort=False)
    v["late_arr"] = v["act_arr"] - v["sched_arr"]; v["late_now"] = v["act_dep"] - v["sched_dep"]
    v["late_change_1"] = (v["late_now"] - g["late_now"].shift(1)).fillna(0); v["late_change_3"] = (v["late_now"] - g["late_now"].shift(3)).fillna(0)
    v["boarded_before"] = g["on"].cumsum() - v["on"]                 # boardings up to the stop before: taps at this stop may come after the bus has left
    v["dwell_now"] = v["act_dep"] - v["act_arr"]; v["n"] = g["seq"].transform("size"); v["k"] = g.cumcount()
    v["position"] = v["k"] / np.maximum(v["n"] - 1, 1); v["trip_end"] = g["act_arr"].transform("max"); v["trip_start"] = g["act_dep"].transform("min")
    out = []
    for a in AHEAD:
        t = v.copy(); same = g["trip_id"].shift(-a).notna()
        t["target_stop"] = g["stop_id"].shift(-a); t["y"] = g["late_arr"].shift(-a); t["target_arr"] = g["act_arr"].shift(-a); t["sched_run_ahead"] = g["sched_arr"].shift(-a) - t["sched_dep"]
        t["stops_ahead"] = a
        out.append(t[same])
    rows = pd.concat(out, ignore_index=True)
    rows["made_at"] = rows["act_dep"]; rows["hour"] = rows["made_at"] / 3600
    # the bus in front: the last bus of the same route and direction to reach the target stop before this forecast was made
    arrivals = v[["route_id", "direction", "stop_id", "act_arr", "late_arr"]].rename(columns={"stop_id": "target_stop", "act_arr": "front_arr", "late_arr": "bus_in_front_late"}).sort_values("front_arr", kind="stable")
    rows = rows.sort_values("made_at", kind="stable")
    rows = pd.merge_asof(rows, arrivals, left_on="made_at", right_on="front_arr", by=["route_id", "direction", "target_stop"], direction="backward", allow_exact_matches=False)
    rows["bus_in_front_age"] = (rows["made_at"] - rows["front_arr"]).fillna(4 * 3600).clip(upper=4 * 3600); rows["bus_in_front_late"] = rows["bus_in_front_late"].fillna(0)
    ctx = ctx or {"heat": {}, "school_holiday": 0.0, "public_holiday": 0.0}
    rows["heat_index"] = C.heat_at(ctx, rows["made_at"].to_numpy()); rows["school_holiday"] = float(ctx["school_holiday"]); rows["public_holiday"] = float(ctx["public_holiday"])
    rows["naive_timetable"] = 0.0; rows["naive_stays"] = rows["late_now"].astype(float)
    rows["origin"] = (rows["made_at"] // STEP) * STEP                  # the half hour the forecast was made in: the model in use had learned by its start
    return rows.sort_values(["made_at", "trip_id", "seq", "stops_ahead"], kind="stable").reset_index(drop=True)


def _fit(X, y, kind="gbt"):
    if kind == "linear":
        from sklearn.linear_model import Ridge
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler
        return make_pipeline(StandardScaler(), Ridge(alpha=1.0)).fit(X, y)             # the scaler learns from the learning rows only
    try:
        import lightgbm as lgb
        return lgb.LGBMRegressor(objective="regression_l1", n_estimators=150, learning_rate=0.05, num_leaves=15, min_child_samples=20, random_state=SEED, deterministic=True, force_row_wise=True, n_jobs=1, verbose=-1).fit(X, y)
    except ImportError:
        from sklearn.ensemble import HistGradientBoostingRegressor
        return HistGradientBoostingRegressor(loss="absolute_error", max_iter=150, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=20, random_state=SEED).fit(X, y)


def rolling(rows, watch=None, features=None, kind="gbt", learn_mask=None, test_mask=None, origins=None):
    """At the start of each half hour the model learns from trips that had finished, and forecasts for buses leaving stops in that half hour.
    learn_mask and test_mask narrow who is learned from and who is forecast: that is how a group of routes or communities is held out."""
    X = rows[features or FEATURES].to_numpy(dtype=float); y = rows["y"].to_numpy(dtype=float); origin = rows["origin"].to_numpy(); ended = rows["trip_end"].to_numpy()
    learn_mask = np.ones(len(rows), bool) if learn_mask is None else learn_mask; test_mask = np.ones(len(rows), bool) if test_mask is None else test_mask
    pred = np.full(len(rows), np.nan); thin = 0
    for o in sorted(set(origin) if origins is None else origins):
        test = (origin == o) & test_mask; learn = (ended <= o) & learn_mask
        if not test.any():
            continue
        if watch:
            watch(o, learn, test)
        if learn.sum() < MIN_ROWS:
            pred[test] = rows["naive_stays"].to_numpy()[test]; thin += 1; continue
        pred[test] = _fit(X[learn], y[learn], kind).predict(X[test])
    return pred, thin


def select(rows):
    """Which of the new features are kept. Each is added alone to the features the model had before, and scored on the
    development part only (forecasts made before 16:00 for arrivals up to 16:00): it is kept if the miss there falls.
    A feature with one value all day cannot be learned from and is not tried. Returns (the table, the names kept)."""
    dev_origins = sorted(o for o in set(rows["origin"]) if o < UNTOUCHED[0]); dev = development(rows).index
    y = rows["y"].to_numpy(dtype=float)[dev]; mae = lambda p: float(np.mean(np.abs(y - p[dev])))
    before = mae(rolling(rows, features=BASE, origins=dev_origins)[0]); table = []; kept = []
    for f in NEW:
        if rows[f].nunique() <= 1:
            table.append({"feature": f, "label": FEATURE_WORDS[f], "status": "one_value_all_day", "dev_mae_without": round(before, 4), "dev_mae_with": None}); continue
        with_f = mae(rolling(rows, features=BASE + [f], origins=dev_origins)[0]); keep = with_f < before
        table.append({"feature": f, "label": FEATURE_WORDS[f], "status": "kept" if keep else "left_out", "dev_mae_without": round(before, 4), "dev_mae_with": round(with_f, 4)})
        if keep:
            kept.append(f)
    return table, kept


def held_out_groups(rows, group_of_row, features, origins):
    """Learn from four groups, forecast the fifth, at the same half hours. Never the same group on both sides."""
    pred = np.full(len(rows), np.nan)
    for g in sorted(set(group_of_row) - {-1}):
        p, _ = rolling(rows, features=features, learn_mask=(group_of_row != g) & (group_of_row != -1), test_mask=group_of_row == g, origins=origins)
        pred = np.where(group_of_row == g, p, pred)
    return pred


def importance(rows, features, up_to):
    """Each feature's share of the boosted trees' gain, for one model learned from the trips that had finished by up_to."""
    learn = (rows["trip_end"] <= up_to).to_numpy()
    if learn.sum() < MIN_ROWS:
        return []
    m = _fit(rows[features].to_numpy(dtype=float)[learn], rows["y"].to_numpy(dtype=float)[learn])
    gain = m.booster_.feature_importance(importance_type="gain") if hasattr(m, "booster_") else None
    if gain is None or gain.sum() == 0:
        return []
    return [{"feature": f, "label": FEATURE_WORDS[f], "share": round(float(g / gain.sum()), 4)} for g, f in sorted(zip(gain, features), key=lambda x: (-x[0], x[1]))]


def ranges(rows, forecast, keep=0.9, least=50):
    """A range from the misses on forecasts whose bus had arrived by the start of the half hour."""
    origin = rows["origin"].to_numpy(); arrived = rows["target_arr"].to_numpy(); miss = np.abs(rows["y"].to_numpy() - forecast); lo = np.zeros(len(rows)); hi = np.zeros(len(rows))
    for o in sorted(set(origin)):
        past = (arrived <= o) & ~np.isnan(forecast); q = float(np.quantile(miss[past], keep)) if past.sum() >= least else 300.0
        here = origin == o; lo[here] = forecast[here] - q; hi[here] = forecast[here] + q
    return lo, hi


def development(frame):
    return frame[(frame["origin"] >= DEVELOPMENT[0]) & (frame["target_arr"] <= UNTOUCHED[0])]


def untouched(frame):
    return frame[frame["origin"] >= UNTOUCHED[0]]
