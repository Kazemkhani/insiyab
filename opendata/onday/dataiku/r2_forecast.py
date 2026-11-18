# Insiyab (lane 3, John project). Step 2 of 4: the running-time forecast, scored four ways against the timetable, two simple rules and a linear model.
# The forecast is of a trip's running time in minutes. The model predicts the stretch (actual / planned) and multiplies by the planned time.
# No test here uses anything that happens after the forecast is made, except where the test's name says so (C fills in a missing hour).
import dataiku, pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
from sklearn.model_selection import GroupKFold
from sklearn.linear_model import Ridge
try:
    import lightgbm as lgb; HAVE_LGB = True
except Exception:
    from sklearn.ensemble import HistGradientBoostingRegressor; HAVE_LGB = False
t = dataiku.Dataset("insiyab_trips").get_dataframe()
t["route"] = t["route"].astype(str); t["direction"] = t["direction"].astype(str); t["bus_type"] = t["bus_type"].astype(str)
t = t.sort_values(["body", "sd"]).reset_index(drop=True); t["timetable"] = t["sched"]
for c in ["route", "direction", "bus_type"]: t[c + "_c"] = t[c].astype("category")
NUM = ["sched", "hour", "dep_min", "seats", "layover"]
def gbm(obj="l1", alpha=None):
    if HAVE_LGB:
        kw = dict(objective=obj, n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=20, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, random_state=7, verbose=-1)
        if alpha: kw["alpha"] = alpha
        return lgb.LGBMRegressor(**kw)
    return HistGradientBoostingRegressor(loss="quantile" if alpha else "absolute_error", quantile=alpha, max_iter=400, learning_rate=0.05, random_state=7)
def X(d, cols):
    if HAVE_LGB: return d[cols]
    o = d[cols].copy()
    for c in cols:
        if c.endswith("_c"): o[c] = o[c].cat.codes
    return o
def lin(tr, te, with_route):
    cats = ["hour", "direction", "bus_type"] + (["route"] if with_route else []); both = pd.concat([tr, te])
    A = pd.get_dummies(both[cats].astype(str)); A["sched"] = both["sched"].to_numpy() / 60.0; A["layover"] = both["layover"].fillna(16).to_numpy() / 60.0; A = A.to_numpy(dtype=float)
    return te["sched"].to_numpy() * Ridge(alpha=1.0).fit(A[:len(tr)], tr["ratio"]).predict(A[len(tr):])
rows = []; rng = np.random.default_rng(7)
BANDS = [("16:00-18:59", 16, 18), ("06:00-09:59", 6, 9), ("19:00 on", 19, 99), ("whole day", 0, 99)]
def table(d, cols, test, train_note, overlap):
    for band, lo_h, hi_h in BANDS:
        dd = d[d["hour"].between(lo_h, hi_h)]
        if not len(dd): continue
        base = float((dd["timetable"] - dd["actual"]).abs().mean()); by = {k: v for k, v in dd.groupby("route")}; rs = list(by)
        for c in cols:
            e = dd[c] - dd["actual"]; lo = hi = None
            if c != "timetable":
                gs = []
                for _ in range(200):
                    bb = pd.concat([by[k] for k in rng.choice(rs, len(rs))]); gs.append(1 - (bb[c] - bb["actual"]).abs().mean() / (bb["timetable"] - bb["actual"]).abs().mean())
                lo, hi = round(float(np.percentile(gs, 2.5)), 3), round(float(np.percentile(gs, 97.5)), 3)
            rows.append(dict(test=test, learns_from=train_note, routes_also_in_training=overlap, hours=band, method=c, trips=len(dd), routes=dd["route"].nunique(),
                             avg_miss_min=round(float(e.abs().mean()), 2), rmse_min=round(float(np.sqrt((e ** 2).mean())), 2), avg_miss_share=round(float((e.abs() / dd["actual"]).mean()), 4),
                             closer_than_timetable=round(1 - float(e.abs().mean()) / base, 3), range_low=lo, range_high=hi))
cols = NUM + ["route_c", "direction_c", "bus_type_c"]
# A. Learn before 16:00, forecast from 16:00.
tr, te = t[t["hour"] < 16], t[t["hour"] >= 16].copy()
te["trees"] = te["sched"] * gbm().fit(X(tr, cols), tr["ratio"]).predict(X(te, cols)); te["linear"] = lin(tr, te, True)
h = tr.groupby(["route", "direction"])["ratio"].median()
te["simple_rule"] = te["sched"] * pd.Series([h.get(k, np.nan) for k in zip(te["route"], te["direction"])], index=te.index).fillna(tr["ratio"].median())
ov = "%d of %d" % (te["route"].isin(tr["route"]).groupby(te["route"]).first().sum(), te["route"].nunique())
table(te, ["timetable", "simple_rule", "linear", "trees"], "A. learn before 16:00, forecast the evening", "trips due before 16:00; simple rule = this route's usual stretch before 16:00", ov); dA = te
# E. Next hour: for each hour, learn only from trips that had finished 30 minutes before the hour starts.
parts = []
for H in range(8, 24):
    tr = t[t["aa"] <= H * 3600 - 1800]; te = t[t["hour"] == H].copy()
    if len(tr) < 500 or not len(te): continue
    te["trees"] = te["sched"] * gbm().fit(X(tr, cols), tr["ratio"]).predict(X(te, cols)); te["linear"] = lin(tr, te, True)
    h = tr.groupby(["route", "direction"])["ratio"].median()
    te["simple_rule"] = te["sched"] * pd.Series([h.get(k, np.nan) for k in zip(te["route"], te["direction"])], index=te.index).fillna(tr["ratio"].median())
    parts.append(te)
dE = pd.concat(parts)
table(dE, ["timetable", "simple_rule", "linear", "trees"], "E. next hour, strict", "only trips already finished 30 min before the hour; simple rule = this route so far today", "most")
# B and C. Held-out groups, five folds.
def cv(groups, cols, with_route, test, note, overlap):
    d = t.copy()
    for c in ["trees", "linear", "simple_rule", "trees_85", "simple_85"]: d[c] = np.nan
    for a, b in GroupKFold(5).split(d, groups=groups):
        tr, te = d.iloc[a], d.iloc[b]
        d.iloc[b, d.columns.get_loc("trees")] = te["sched"].to_numpy() * gbm().fit(X(tr, cols), tr["ratio"]).predict(X(te, cols))
        d.iloc[b, d.columns.get_loc("trees_85")] = te["sched"].to_numpy() * gbm("quantile", 0.85).fit(X(tr, cols), tr["ratio"]).predict(X(te, cols))
        d.iloc[b, d.columns.get_loc("linear")] = lin(tr, te, with_route)
        hh = tr.groupby("hour")["ratio"].median(); h85 = tr.groupby("hour")["ratio"].quantile(0.85)
        fac = te["hour"].map(hh).fillna(tr["ratio"].median()).to_numpy(); fac85 = te["hour"].map(h85).fillna(tr["ratio"].quantile(0.85)).to_numpy()
        if with_route:
            rr = (tr["ratio"] / tr["hour"].map(hh)).groupby([tr["route"], tr["direction"]]).median()
            adj = pd.Series([rr.get(k, 1.0) for k in zip(te["route"], te["direction"])]).fillna(1.0).to_numpy(); fac = fac * adj; fac85 = fac85 * adj
        d.iloc[b, d.columns.get_loc("simple_rule")] = te["sched"].to_numpy() * fac; d.iloc[b, d.columns.get_loc("simple_85")] = te["sched"].to_numpy() * fac85
    table(d, ["timetable", "simple_rule", "linear", "trees"], test, note, overlap); return d
dB = cv(t["route"], NUM + ["direction_c", "bus_type_c"], False, "B. whole routes held out", "other routes, all hours; simple rule = the hour's usual stretch on other routes", "0 (none)")
dC = cv(t["route"] + "_" + t["hour"].astype(str), cols, True, "C. route-hours held out (fills in a missing hour, not a look ahead)", "the same route at other hours and other routes at this hour; simple rule = hour's stretch x route's stretch", "all")
dataiku.Dataset("insiyab_forecast_scores").write_with_schema(pd.DataFrame(rows))
# Does the time given cover 85 trips in 100?
cov = []
for test, d in [("B. whole routes held out", dB), ("C. route-hours held out", dC)]:
    for band, lo_h, hi_h in BANDS:
        dd = d[d["hour"].between(lo_h, hi_h)]
        if not len(dd): continue
        for m, c in [("timetable", "sched"), ("simple rule at 85", "simple_85"), ("trees at 85", "trees_85")]:
            cov.append(dict(test=test, hours=band, method=m, trips=len(dd), share_of_trips_covered=round(float((dd["actual"] <= dd[c]).mean()), 3), target=0.85,
                            extra_bus_hours_asked=round(float((dd[c] - dd["sched"]).clip(lower=0).sum() / 60), 0)))
dataiku.Dataset("insiyab_forecast_coverage").write_with_schema(pd.DataFrame(cov))
# Hour by hour, tests A and E.
bh = []
for test, d in [("A", dA), ("E", dE)]:
    for H, dd in d.groupby("hour"):
        r_ = dict(test=test, hour=int(H), trips=len(dd))
        for c in ["timetable", "simple_rule", "linear", "trees"]: r_[c + "_avg_miss_min"] = round(float((dd[c] - dd["actual"]).abs().mean()), 2)
        bh.append(r_)
dataiku.Dataset("insiyab_forecast_by_hour").write_with_schema(pd.DataFrame(bh))
