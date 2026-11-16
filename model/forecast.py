"""The forecast of boardings, made as the day unfolds (docs/MODEL-PLAN.md, sections 3 to 5).

The rule of the clock: a forecast made at an origin may use only bins that had ended by that origin. Every feature
below reads Y[:, :seen] and nothing later, and tests/test_engine.py proves it by changing every later record.
The timetable (S) is known before the day, so any of its columns may be read.

One table of rows is built: a row is one series (a stop on a route) at one origin for one horizon. A model that
forecasts at origin o learns only from rows whose target bin had ended by o."""
import numpy as np
import pandas as pd
from . import naive
from .prepare import BIN

HORIZONS = [900, 1800, 3600, 7200]
ORIGINS = list(range(6 * 3600, 22 * 3600 + 1, 1800))
DEVELOPMENT = (8 * 3600, 15 * 3600 + 1800)        # every choice is made on forecasts made from 08:00 to 15:30
UNTOUCHED = (16 * 3600, 21 * 3600 + 1800)         # looked at once, at the end
SEED = 20251215
MIN_ROWS = 200                                    # with fewer rows to learn from, a model says what the timetable forecast says
FEATURES = ["last1", "last2", "last4", "sum_so_far", "mean_so_far", "bins_seen", "per_departure_so_far", "sched_target", "sched_before", "sched_after", "sched_so_far",
            "sched_day", "route_last4", "route_per_departure", "network_last4", "network_per_departure", "naive_last", "naive_timetable",
            "hour_of_target", "horizon_minutes", "position", "routes_at_stop",
            "buses_on_the_way", "their_lateness", "their_boardings", "waiting_to_return", "alighted_nearby_so_far"]
FEATURE_WORDS = {"last1": "boardings here in the last quarter of an hour", "last2": "boardings here in the last half hour", "last4": "boardings here in the last hour", "sum_so_far": "boardings here so far today",
                 "mean_so_far": "this stop's average so far today", "bins_seen": "how long the stop has been in service today", "per_departure_so_far": "boardings for each bus here so far", "sched_target": "buses scheduled in that quarter of an hour",
                 "sched_before": "buses scheduled just before", "sched_after": "buses scheduled just after", "sched_so_far": "buses scheduled here so far", "sched_day": "buses scheduled here over the day",
                 "route_last4": "boardings on the whole route in the last hour", "route_per_departure": "the route's boardings for each bus so far", "network_last4": "boardings on every route in the last hour",
                 "network_per_departure": "the network's boardings for each bus so far", "naive_last": "the last quarter of an hour seen", "naive_timetable": "the timetable's share", "hour_of_target": "the time of day",
                 "horizon_minutes": "how far ahead the forecast looks", "position": "where the stop is along the route", "routes_at_stop": "how many routes call here",
                 "buses_on_the_way": "buses already on the road that should reach the stop then", "their_lateness": "how late those buses are running", "their_boardings": "how many have boarded those buses so far",
                 "waiting_to_return": "passengers who got off near here today and have not travelled since", "alighted_nearby_so_far": "passengers who have got off near here today"}
NEAR = 300                                        # metres: a passenger who got off within this distance may board here on the way back
MODELS = {"glm": "A plain count model (Poisson regression with a penalty)", "gbt": "Boosted trees with a loss made for counts, one model for every stop and every horizon"}


def _mean_last(part, n):
    with np.errstate(invalid="ignore"):
        tail = part[:, -n:] if part.shape[1] else part
        cnt = (~np.isnan(tail)).sum(axis=1)
        return np.where(cnt > 0, np.nansum(tail, axis=1) / np.maximum(cnt, 1), 0.0)


def _on_the_way(visits, index, o, first_bin, shape):
    """The bus as a sensor. For buses that had left a stop by the origin: where the timetable, moved by each bus's lateness now,
    puts them in each later quarter of an hour. Returns, by series and bin: buses, their summed lateness, and boardings on them so far."""
    buses = np.zeros(shape); late = np.zeros(shape); boarded = np.zeros(shape)
    if visits is None:
        return buses, late, boarded
    seen = visits[visits["act_dep"] < o]                                # strictly before the origin: a record stamped at the origin itself has not been seen
    if not len(seen):
        return buses, late, boarded
    last = seen.groupby("trip_id", sort=False).agg(at=("seq", "max"), act=("act_dep", "max"), sched=("sched_dep", "max"), on_so_far=("on_before", "max")).reset_index()
    last["late"] = last["act"] - last["sched"]
    ahead = visits[["trip_id", "seq", "key", "sched_arr"]].merge(last[["trip_id", "at", "late", "on_so_far"]], on="trip_id")
    ahead = ahead[(ahead["seq"] > ahead["at"]) & (ahead["key"] >= 0)]
    b = ((ahead["sched_arr"] + ahead["late"]) // BIN).to_numpy().astype(int) - first_bin; ok = (b >= 0) & (b < shape[1]); k = ahead["key"].to_numpy()[ok]; b = b[ok]
    np.add.at(buses, (k, b), 1); np.add.at(late, (k, b), ahead["late"].to_numpy()[ok]); np.add.at(boarded, (k, b), ahead["on_so_far"].to_numpy()[ok])
    return buses, late, boarded


def _nearby(series, stops):
    """For each series, which stops lie within NEAR metres of its stop (itself among them). A table of True and False, series by stop."""
    pos = stops.set_index("stop_id")[["lon", "lat"]]; names = list(pos.index); here = pos.reindex(series["stop_id"]).to_numpy(); there = pos.to_numpy()
    out = np.zeros((len(series), len(names)), dtype=bool); k = np.pi / 180
    for a in range(0, len(series), 500):                              # in blocks, so a city of stops does not need a table of every pair at once
        lon1, lat1 = here[a:a + 500, :1], here[a:a + 500, 1:]; x = (there[:, 0] - lon1) * k * np.cos(lat1 * k); y = (there[:, 1] - lat1) * k
        out[a:a + 500] = 6371000 * np.sqrt(x * x + y * y) <= NEAR
    return out, {n: i for i, n in enumerate(names)}


def build_rows(Y, S, series, first_bin, origins=ORIGINS, horizons=HORIZONS, day=None):
    """Every forecast that can be asked for: series x origin x horizon, with its features, the naive forecasts and what happened.
    With the day's records (day), the features from buses on the road and from passengers yet to return are filled; without, they are zero."""
    group = pd.factorize(series["route_id"])[0]; n_groups = group.max() + 1
    out = []; visits = None; near = None
    if day is not None:
        index = {k: i for i, k in enumerate(zip(series["route_id"], series["direction"], series["stop_id"]))}
        visits = day["visits"][["trip_id", "seq", "route_id", "direction", "stop_id", "sched_arr", "sched_dep", "act_dep", "on"]].copy()
        visits["key"] = [index.get(k, -1) for k in zip(visits["route_id"], visits["direction"], visits["stop_id"])]
        visits["on_before"] = visits.groupby("trip_id", sort=False)["on"].cumsum() - visits["on"]      # boardings up to the stop before: taps at the stop a bus has just left may still be coming in
        near, stop_at = _nearby(series, day["stops"]); al = day["alightings"]
        al_stop = np.array([stop_at.get(x, -1) for x in al["stop_id"]], dtype=int); al_t = al["alighted"].to_numpy(dtype=float); al_next = al["next_tap"].to_numpy(dtype=float)
    for o in origins:
        seen = o // BIN - first_bin
        if seen <= 0 or seen >= Y.shape[1]:
            continue
        past = Y[:, :seen]; known = ~np.isnan(past); sched_past = np.where(known, S[:, :seen], 0)
        total = np.nansum(past, axis=1); deps = sched_past.sum(axis=1); bins_seen = known.sum(axis=1)
        last4 = _mean_last(past, 4)
        r_tot = np.bincount(group, total, n_groups); r_dep = np.bincount(group, deps, n_groups); r_l4 = np.bincount(group, last4, n_groups)
        feats = {"last1": _mean_last(past, 1), "last2": _mean_last(past, 2), "last4": last4, "sum_so_far": total, "mean_so_far": total / np.maximum(bins_seen, 1),
                 "bins_seen": bins_seen, "per_departure_so_far": total / np.maximum(deps, 1), "sched_so_far": deps,
                 "route_last4": r_l4[group], "route_per_departure": (r_tot / np.maximum(r_dep, 1))[group],
                 "network_last4": np.full(len(group), last4.sum()), "network_per_departure": np.full(len(group), total.sum() / max(deps.sum(), 1))}
        buses, late, boarded = _on_the_way(visits, None, o, first_bin, Y.shape)
        if near is not None:
            came = (al_t < o) & (al_stop >= 0); waiting = came & (al_next >= o)
            feats["waiting_to_return"] = near @ np.bincount(al_stop[waiting], minlength=near.shape[1]); feats["alighted_nearby_so_far"] = near @ np.bincount(al_stop[came], minlength=near.shape[1])
        else:
            feats["waiting_to_return"] = np.zeros(len(group)); feats["alighted_nearby_so_far"] = np.zeros(len(group))
        for h in horizons:
            b = (o + h) // BIN - 1 - first_bin
            if b < seen or b >= Y.shape[1]:
                continue
            here = np.flatnonzero(~np.isnan(Y[:, b]))                 # the series the timetable says are running in the target bin
            if not len(here):
                continue
            row = {"series": here, "origin": o, "horizon": h, "bin": b, "y": Y[here, b]}
            row.update({k: v[here] for k, v in feats.items()})
            row["sched_target"] = S[here, b]; row["sched_before"] = S[here, b - 1] if b > 0 else 0; row["sched_after"] = S[here, b + 1] if b + 1 < S.shape[1] else 0
            for name, fn in naive.FUNCTIONS.items():
                row[name] = fn(Y, S, seen, b)[here]
            row["buses_on_the_way"] = buses[here, b]; row["their_lateness"] = late[here, b] / np.maximum(buses[here, b], 1); row["their_boardings"] = boarded[here, b]
            row["hour_of_target"] = (b + first_bin) * BIN / 3600; row["horizon_minutes"] = h / 60
            out.append(pd.DataFrame(row))
    rows = pd.concat(out, ignore_index=True)
    for k in ("sched_day", "position", "routes_at_stop"):
        rows[k] = series[k].to_numpy()[rows["series"].to_numpy()]
    return rows


def _squash(X):
    """The logarithm of one plus the size, keeping the sign: lateness can be below zero, and a plain logarithm cannot take that."""
    return np.sign(X) * np.log1p(np.abs(X))


def _fit(kind, X, y):
    if kind == "glm":
        from sklearn.linear_model import PoissonRegressor
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler
        return make_pipeline(StandardScaler(), PoissonRegressor(alpha=1.0, max_iter=300)).fit(_squash(X), y)       # the scaler learns from the learning rows only
    try:
        import lightgbm as lgb
        return lgb.LGBMRegressor(objective="tweedie", tweedie_variance_power=1.2, n_estimators=150, learning_rate=0.05, num_leaves=15, min_child_samples=20,
                                 subsample=1.0, colsample_bytree=1.0, random_state=SEED, deterministic=True, force_row_wise=True, n_jobs=1, verbose=-1).fit(X, y)
    except ImportError:
        from sklearn.ensemble import HistGradientBoostingRegressor
        return HistGradientBoostingRegressor(loss="poisson", max_iter=150, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=20, random_state=SEED).fit(X, y)


def boosted_trees_library():
    try:
        import lightgbm; return "lightgbm " + lightgbm.__version__
    except ImportError:
        import sklearn; return "scikit-learn " + sklearn.__version__ + " (HistGradientBoostingRegressor, Poisson loss): lightgbm is not installed here"


def _predict(kind, model, X):
    return np.clip(model.predict(_squash(X) if kind == "glm" else X), 0, None)


def development(frame):
    """The part every choice is made on: forecasts made from 08:00 to 15:30 whose quarter of an hour had ended by 16:00,
    so nothing that happened in the untouched hours can sway a choice."""
    return frame[frame["origin"].between(*DEVELOPMENT) & (frame["origin"] + frame["horizon"] <= UNTOUCHED[0])]


def untouched(frame):
    return frame[frame["origin"].between(*UNTOUCHED)]


def rolling(rows, learn_mask=None, test_mask=None, origins=None, watch=None):
    """Rolling origin. At each origin, each model learns from rows whose target bin had ended by then, and forecasts that origin's rows.
    learn_mask and test_mask narrow who is learned from and who is forecast: that is how a route or a community is held out."""
    X = rows[FEATURES].to_numpy(dtype=float); y = rows["y"].to_numpy(); o_all = rows["origin"].to_numpy(); ended = o_all + rows["horizon"].to_numpy()
    learn_mask = np.ones(len(rows), bool) if learn_mask is None else learn_mask; test_mask = np.ones(len(rows), bool) if test_mask is None else test_mask
    pred = {k: np.full(len(rows), np.nan) for k in MODELS}; thin = []
    for o in sorted(set(o_all) if origins is None else origins):
        test = (o_all == o) & test_mask; learn = (ended <= o) & learn_mask
        if not test.any():
            continue
        if watch:
            watch(o, learn, test)                                     # a test looks over the shoulder: who is learned from, who is forecast
        for kind in MODELS:
            if learn.sum() < MIN_ROWS or y[learn].sum() == 0:
                pred[kind][test] = rows["naive_timetable"].to_numpy()[test]; thin.append(int(o)); continue
            pred[kind][test] = _predict(kind, _fit(kind, X[learn], y[learn]), X[test])
    return pred, sorted(set(thin))                                    # the origins at which there was too little to learn from: no model's forecast is shown for them


def importance(rows, up_to):
    """Which features the boosted trees lean on: one model learned from everything that had ended by up_to, and each feature's share of its gain."""
    learn = ((rows["origin"] + rows["horizon"]) <= up_to).to_numpy()
    if learn.sum() < MIN_ROWS:
        return []
    m = _fit("gbt", rows[FEATURES].to_numpy(dtype=float)[learn], rows["y"].to_numpy()[learn])
    gain = m.booster_.feature_importance(importance_type="gain") if hasattr(m, "booster_") else None
    if gain is None or gain.sum() == 0:
        return []
    return [{"feature": f, "label": FEATURE_WORDS[f], "share": round(float(g / gain.sum()), 4)} for g, f in sorted(zip(gain, FEATURES), key=lambda x: (-x[0], x[1]))]


def ranges(rows, forecast, keep=0.9, least=50):
    """A range for every forecast, set from the misses of forecasts whose target had ended by the origin. This is conformal
    prediction done as the day rolls on: the misses come from earlier hours and earlier models, so the nine in ten is a promise
    to be checked, not a guarantee, and the table says how often it held, for empty bins and busy ones apart.
    The miss is scaled by the square root of the forecast plus one, because a count's spread grows with its size.
    A count is a whole number, so the range is widened to whole numbers: 0 to 0.86 cannot hold a single passenger, 0 to 1 can."""
    o = rows["origin"].to_numpy(); ended = o + rows["horizon"].to_numpy(); y = rows["y"].to_numpy()
    score = np.abs(y - forecast) / np.sqrt(forecast + 1); lo = np.zeros(len(rows)); hi = np.zeros(len(rows)); width = {}
    for origin in sorted(set(o)):
        past = (ended <= origin) & ~np.isnan(forecast)
        q = float(np.quantile(score[past], keep)) if past.sum() >= least else 2.0     # before enough misses are known, a wide stated default
        width[int(origin)] = q; here = o == origin
        lo[here] = np.floor(np.clip(forecast[here] - q * np.sqrt(forecast[here] + 1), 0, None)); hi[here] = np.ceil(forecast[here] + q * np.sqrt(forecast[here] + 1))
    return lo, hi, width


def groups_of(labels, n=5):
    """Puts the distinct labels in n groups, by their sorted order, so the same label is always in the same group. A label that is None is in no group (-1)."""
    names = sorted({x for x in labels if x is not None and x == x})
    place = {x: i % n for i, x in enumerate(names)}
    return np.array([place.get(x, -1) for x in labels])


def held_out_groups(rows, group_of_row, origins, watch=None):
    """Learn from four groups, forecast the fifth, at the same origins. Never the same group on both sides."""
    pred = {k: np.full(len(rows), np.nan) for k in MODELS}
    for g in sorted(set(group_of_row) - {-1}):
        p, _ = rolling(rows, learn_mask=(group_of_row != g) & (group_of_row != -1), test_mask=group_of_row == g, origins=origins, watch=watch)
        for k in MODELS:
            pred[k] = np.where(group_of_row == g, p[k], pred[k])
    return pred


def to_routes(rows, series, columns):
    """Stops add up to routes: the route's forecast is the sum of its stops' forecasts, and so is what happened."""
    route = series["route_id"].to_numpy()[rows["series"].to_numpy()]
    return rows.assign(route_id=route).groupby(["route_id", "origin", "horizon", "bin"], sort=True)[["y"] + columns].sum(min_count=1).reset_index()
