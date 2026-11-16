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
            "hour_of_target", "horizon_minutes", "position", "routes_at_stop"]
MODELS = {"glm": "A plain count model (Poisson regression with a penalty)", "gbt": "Boosted trees with a loss made for counts, one model for every stop and every horizon"}


def _mean_last(part, n):
    with np.errstate(invalid="ignore"):
        tail = part[:, -n:] if part.shape[1] else part
        cnt = (~np.isnan(tail)).sum(axis=1)
        return np.where(cnt > 0, np.nansum(tail, axis=1) / np.maximum(cnt, 1), 0.0)


def build_rows(Y, S, series, first_bin, origins=ORIGINS, horizons=HORIZONS):
    """Every forecast that can be asked for: series x origin x horizon, with its features, the naive forecasts and what happened."""
    group = pd.factorize(series["route_id"])[0]; n_groups = group.max() + 1
    out = []
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
            row["hour_of_target"] = (b + first_bin) * BIN / 3600; row["horizon_minutes"] = h / 60
            out.append(pd.DataFrame(row))
    rows = pd.concat(out, ignore_index=True)
    for k in ("sched_day", "position", "routes_at_stop"):
        rows[k] = series[k].to_numpy()[rows["series"].to_numpy()]
    return rows


def _fit(kind, X, y):
    if kind == "glm":
        from sklearn.linear_model import PoissonRegressor
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler
        return make_pipeline(StandardScaler(), PoissonRegressor(alpha=1.0, max_iter=300)).fit(np.log1p(X), y)       # the scaler learns from the learning rows only
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
    return np.clip(model.predict(np.log1p(X) if kind == "glm" else X), 0, None)


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
    pred = {k: np.full(len(rows), np.nan) for k in MODELS}; thin = 0
    for o in sorted(set(o_all) if origins is None else origins):
        test = (o_all == o) & test_mask; learn = (ended <= o) & learn_mask
        if not test.any():
            continue
        if watch:
            watch(o, learn, test)                                     # a test looks over the shoulder: who is learned from, who is forecast
        for kind in MODELS:
            if learn.sum() < MIN_ROWS or y[learn].sum() == 0:
                pred[kind][test] = rows["naive_timetable"].to_numpy()[test]; thin += 1; continue
            pred[kind][test] = _predict(kind, _fit(kind, X[learn], y[learn]), X[test])
    return pred, thin // len(MODELS)


def ranges(rows, forecast, keep=0.9, least=50):
    """A range for every forecast, set from the misses of forecasts whose target had ended by the origin (split conformal).
    The miss is scaled by the square root of the forecast plus one, because a count's spread grows with its size."""
    o = rows["origin"].to_numpy(); ended = o + rows["horizon"].to_numpy(); y = rows["y"].to_numpy()
    score = np.abs(y - forecast) / np.sqrt(forecast + 1); lo = np.zeros(len(rows)); hi = np.zeros(len(rows)); width = {}
    for origin in sorted(set(o)):
        past = (ended <= origin) & ~np.isnan(forecast)
        q = float(np.quantile(score[past], keep)) if past.sum() >= least else 2.0     # before enough misses are known, a wide stated default
        width[int(origin)] = q; here = o == origin
        lo[here] = np.clip(forecast[here] - q * np.sqrt(forecast[here] + 1), 0, None); hi[here] = forecast[here] + q * np.sqrt(forecast[here] + 1)
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
