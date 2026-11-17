# Recipe: decisions
# Reads the bundle from the model_state folder (written by the forecast recipe).
# Extracts decisions (right bus, right time, right stop, rewarded choice,
# on demand), vehicle swap pairs, and passenger offers.  No card, device or
# driver identifier appears in any output: vehicles are stand-ins (v1, v2...).
import dataiku
from insiyab_flow import decisions, load_bytes

state = dataiku.Folder("model_state")
bundle = load_bytes(state.get_download_stream("bundle.pkl").read())

result = decisions(bundle)

dataiku.Dataset("decisions_table").write_with_schema(result["decisions_table"])
dataiku.Dataset("vehicle_swaps").write_with_schema(result["vehicle_swaps"])
dataiku.Dataset("passenger_offers").write_with_schema(result["passenger_offers"])
