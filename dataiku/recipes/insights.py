# Recipe: insights
# Reads the prepared stop-visit records and vehicle attributes, then computes
# headline facts: lateness by vehicle age, type and manufacturer; trips over
# and under capacity; share of empty stop visits; busiest stop-quarters.
# Results are one row per fact with its value, n and plain-English sentence.
import dataiku
from insiyab_flow import insights

stop_visits = dataiku.Dataset("stop_visits").get_dataframe(infer_with_pandas=False)
vehicle_attributes = dataiku.Dataset("vehicle_attributes").get_dataframe(
    infer_with_pandas=False)

result = insights(stop_visits, vehicle_attributes)

dataiku.Dataset("insights").write_with_schema(result["insights"])
dataiku.Dataset("trip_running_time").write_with_schema(result["trip_running_time"])
