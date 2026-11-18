# Insiyab (lane 3, John project). Step 1 of 4: one row per trip, built from the running-time file and the fleet list.
# Nothing here uses passenger cards. Output stays in Dataiku.
import dataiku, pandas as pd, numpy as np
r = dataiku.Dataset("DATA.Running_time_15-Dec-2025").get_dataframe(infer_with_pandas=False)
f = dataiku.Dataset("DATA.Fleet_List").get_dataframe(infer_with_pandas=False).drop_duplicates("Body_number")
def sec(s):
    p = s.str.split(":", expand=True)
    return pd.to_numeric(p[0], errors="coerce") * 3600 + pd.to_numeric(p[1], errors="coerce") * 60 + pd.to_numeric(p[2], errors="coerce")
for c in ["Sched_Arr", "Act_Arr", "Sched_Dep", "Act_Dep"]: r[c + "_s"] = sec(r[c])
r["seq"] = pd.to_numeric(r["Stop_Seq"], errors="coerce"); r = r.sort_values(["Trip_ID", "seq"])
g = r.groupby("Trip_ID", sort=False)
t = pd.DataFrame({"route": g["Route"].first().str.strip(), "direction": g["Direction"].first().astype(str), "body": g["Body"].first(),
                  "stops_planned": g["seq"].max(),
                  "sd": g["Sched_Dep_s"].first(), "ad": g["Act_Dep_s"].first(), "sa": g["Sched_Arr_s"].last(), "aa": g["Act_Arr_s"].last()}).reset_index()
checks = [("trips in the file", len(t))]
t = t.dropna(subset=["sd", "ad", "sa", "aa"]); checks.append(("trips with all four times", len(t)))
t["sched"] = (t["sa"] - t["sd"]) / 60; t["actual"] = (t["aa"] - t["ad"]) / 60
t = t[(t["sched"] >= 5) & (t["actual"] > 0)]; checks.append(("trips planned 5+ minutes with a positive measured time", len(t)))
t["ratio"] = t["actual"] / t["sched"]; ext = ~t["ratio"].between(0.4, 2.5)
checks.append(("dropped as extreme (under 0.4x or over 2.5x the plan)", int(ext.sum())))
checks.append(("of those, due 16:00 to 18:59", int((ext & t["sd"].between(57600, 68399)).sum())))
t = t[~ext].copy(); checks.append(("trips kept", len(t)))
t["hour"] = (t["sd"] // 3600).astype(int); t["dep_min"] = t["sd"] / 60
t = t.sort_values(["body", "sd"]); pv = t.groupby("body")
t["prev_aa"] = pv["aa"].shift(1); t["prev_sa"] = pv["sa"].shift(1)
t["layover"] = (t["sd"] - t["prev_sa"]) / 60; bad = ~t["layover"].between(0, 120)
t.loc[bad, ["layover", "prev_aa", "prev_sa"]] = np.nan
t["start_late"] = (t["ad"] - t["sd"]) / 60
t = t.merge(f[["Body_number", "Bus_Type", "No_of_Seats"]], left_on="body", right_on="Body_number", how="left")
t["seats"] = pd.to_numeric(t["No_of_Seats"], errors="coerce"); t["bus_type"] = t["Bus_Type"].astype(str)
checks += [("routes", t["route"].nunique()), ("buses", t["body"].nunique()), ("trips with a linked previous trip on the same bus (break 0 to 120 min)", int(t["layover"].notna().sum()))]
cols = ["Trip_ID", "route", "direction", "body", "bus_type", "seats", "stops_planned", "hour", "dep_min", "sd", "ad", "sa", "aa", "sched", "actual", "ratio", "prev_sa", "prev_aa", "layover", "start_late"]
dataiku.Dataset("insiyab_trips").write_with_schema(t[cols].reset_index(drop=True))
dataiku.Dataset("insiyab_data_checks").write_with_schema(pd.DataFrame(checks, columns=["check", "value"]))
