# Insiyab (lane 3, John project). Step 3 of 4: the planner's list. Measured from the day, not produced by the forecast.
# For each route, direction and hour: the time the timetable gives, the time that covers 85 trips in 100, and what closing the gap costs.
import dataiku, pandas as pd, numpy as np
t = dataiku.Dataset("insiyab_trips").get_dataframe()
t["route"] = t["route"].astype(str); t["direction"] = t["direction"].astype(str)
g = t.groupby(["route", "direction", "hour"])
b = g.agg(trips=("ratio", "size"), timetable_min=("sched", "median"), usual_min=("actual", "median"),
          covers_85_min=("actual", lambda x: float(np.percentile(x, 85))), planned_break_min=("layover", "median"),
          left_over_5_late=("start_late", lambda x: float((x > 5).mean()))).reset_index()
b["covered_now"] = g.apply(lambda d: float((d["actual"] <= d["sched"]).mean())).to_numpy()
b = b[b["trips"] >= 3].copy()
b["add_min"] = (b["covers_85_min"] - b["timetable_min"]).clip(lower=0)
b["bus_hours"] = b["add_min"] * b["trips"] / 60
# Two ways to pay for the added time. Both are arithmetic on the day, not RTA procedure.
# Keep the frequency: the hour needs this many more bus hours (about that many more buses in that hour).
b["keep_frequency_extra_buses"] = b["bus_hours"]
# Keep the buses: each round takes longer, so the same buses make fewer departures in the hour.
cycle = b["timetable_min"] + b["planned_break_min"].fillna(0)
b["keep_buses_departures_lost"] = b["trips"] * b["add_min"] / (cycle + b["add_min"])
b["break_left_if_not_fixed_min"] = b["planned_break_min"] - b["add_min"]
for c in ["timetable_min", "usual_min", "covers_85_min", "planned_break_min", "add_min", "bus_hours", "keep_frequency_extra_buses", "keep_buses_departures_lost", "break_left_if_not_fixed_min"]: b[c] = b[c].round(1)
for c in ["covered_now", "left_over_5_late"]: b[c] = b[c].round(3)
b = b.sort_values("bus_hours", ascending=False).reset_index(drop=True); b.insert(0, "rank", b.index + 1)
dataiku.Dataset("insiyab_planner_list").write_with_schema(b)
h = b.groupby("hour").agg(route_directions=("route", "size"), needing_time=("add_min", lambda x: int((x > 0).sum())), trips=("trips", "sum"), bus_hours=("bus_hours", "sum")).reset_index()
cov = t.groupby("hour").apply(lambda d: float((d["actual"] <= d["sched"]).mean())).rename("covered_now").reset_index()
h = h.merge(cov, on="hour"); h["bus_hours"] = h["bus_hours"].round(1); h["covered_now"] = h["covered_now"].round(3)
dataiku.Dataset("insiyab_planner_by_hour").write_with_schema(h)
