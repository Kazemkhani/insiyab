# Insiyab (lane 3, John project). Step 4 of 4: the on-the-day flag for the control room (OCC).
# Rule: a bus is flagged when, N minutes before its next departure, its current trip is past its planned arrival and it is not back.
# This is a measured late return. It is not a forecast and it says nothing about the cause.
import dataiku, pandas as pd, numpy as np
t = dataiku.Dataset("insiyab_trips").get_dataframe()
t["route"] = t["route"].astype(str); t["direction"] = t["direction"].astype(str)
d = t[t["layover"].notna() & t["prev_aa"].notna()].copy()
hm = lambda s: "%02d:%02d" % (int(s // 3600), int(s % 3600 // 60))
d["due"] = d["sd"].map(hm); d["bus_back"] = d["prev_aa"].map(hm); d["left"] = d["ad"].map(hm)
d["still_out_when_due"] = d["prev_aa"] > d["sd"]; d["left_over_5_late"] = d["start_late"] > 5
for lead in [5, 10, 15]:
    d["flag_%d_min_before" % lead] = (d["prev_aa"] > d["sd"] - lead * 60) & (d["prev_sa"] <= d["sd"] - lead * 60)
d["behind_plan_min_at_flag"] = ((d["sd"] - 300 - d["prev_sa"]) / 60).round(1)
d["back_after_due_min"] = ((d["prev_aa"] - d["sd"]) / 60).round(1); d["start_late"] = d["start_late"].round(1); d["planned_break_min"] = d["layover"].round(1)
d["message"] = np.where(d["flag_5_min_before"], "Route " + d["route"] + ", departure due " + d["due"] + ": the bus is " + d["behind_plan_min_at_flag"].astype(str) +
                        " min past its planned arrival and not back. Options: hold the departure, send a spare, or let it run late.", "")
cols = ["Trip_ID", "route", "direction", "body", "hour", "due", "bus_back", "left", "planned_break_min", "flag_5_min_before", "flag_10_min_before", "flag_15_min_before",
        "behind_plan_min_at_flag", "still_out_when_due", "back_after_due_min", "start_late", "left_over_5_late", "message"]
dataiku.Dataset("insiyab_occ_flags").write_with_schema(d[cols].sort_values(["hour", "due", "route"]).reset_index(drop=True))
rows = [("departures with a linked previous trip", len(d), None, None)]
late = int(d["left_over_5_late"].sum())
a = d[d["still_out_when_due"]]
rows.append(("bus still out when the departure was due", len(a), round(float(a["left_over_5_late"].mean()), 3), round(float((a["left_over_5_late"]).sum() / late), 3)))
for lead in [5, 10, 15]:
    fl = d[d["flag_%d_min_before" % lead]]
    rows.append(("flag raised %d min before departure" % lead, len(fl), round(float(fl["left_over_5_late"].mean()), 3), round(float(fl["left_over_5_late"].sum() / late), 3)))
rows.append(("departures that left over 5 min late", late, None, None))
L = d[d["left_over_5_late"]]
rows.append(("of those, bus still out when due", int(L["still_out_when_due"].sum()), None, round(float(L["still_out_when_due"].mean()), 3)))
rows.append(("median minutes late leaving, when the bus was still out", round(float(a["start_late"].median()), 1), None, None))
rows.append(("routes with at least one such departure", int(a["route"].nunique()), None, None)); rows.append(("buses with at least one such departure", int(a["body"].nunique()), None, None))
dataiku.Dataset("insiyab_occ_rule_scores").write_with_schema(pd.DataFrame(rows, columns=["measure", "count", "share_that_left_over_5_late", "share_of_all_late_departures_caught"]))
h = d.groupby("hour").agg(departures=("Trip_ID", "size"), still_out_when_due=("still_out_when_due", "sum"), flags_5_min_before=("flag_5_min_before", "sum"), left_over_5_late=("left_over_5_late", "sum")).reset_index()
h["share_still_out"] = (h["still_out_when_due"] / h["departures"]).round(3)
dataiku.Dataset("insiyab_occ_by_hour").write_with_schema(h)
