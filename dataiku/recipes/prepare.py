# Recipe: prepare
# Reads five raw tables from the DATA project.  Cleans and aligns them, builds
# stop-level visit records with loads reconstructed, and bins boardings by route,
# direction, stop and quarter of an hour.  Writes three human-readable datasets
# and keeps the prepared day in the prepared_state folder for the forecast recipe.
import dataiku, io
from insiyab_flow import prepare, dump

GTFS = ["routes", "trips", "stop_times", "stops", "calendar", "shapes"]


def _df(name):
    return dataiku.Dataset(name).get_dataframe(infer_with_pandas=False)


tables = {
    "nol":          _df("DATA.nol_card_details_15-Dec-2025"),
    "avl":          _df("DATA.Running_time_15-Dec-2025"),
    "fleet":        _df("DATA.Fleet_List"),
    "communities":  _df("DATA.community_2026-10-20_09-28-00"),
}
for g in GTFS:
    tables[f"gtfs_{g}"] = _df(f"DATA.{g}")

result = prepare(tables)

dataiku.Dataset("stop_visits").write_with_schema(result["stop_visits"])
dataiku.Dataset("boardings_quarter").write_with_schema(result["boardings_quarter"])
dataiku.Dataset("prepare_log").write_with_schema(result["prepare_log"])
dataiku.Dataset("vehicle_attributes").write_with_schema(result["vehicle_attributes"])

state = dataiku.Folder("prepared_state")
state.upload_stream("day.pkl", io.BytesIO(dump(result["_day"])))
