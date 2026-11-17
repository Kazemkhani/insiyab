# Recipe: gap
# Reads the bundle from the model_state folder (written by the forecast recipe).
# Extracts the gap table: for each route, direction and hour it records how
# many seats were on offer, the forecast peak load, passengers above the seats
# (over) and seats above the peak load (spare), and the Insiyab index.
import dataiku
from insiyab_flow import gap, load_bytes

state = dataiku.Folder("model_state")
bundle = load_bytes(state.get_download_stream("bundle.pkl").read())

result = gap(bundle)

dataiku.Dataset("seat_gap").write_with_schema(result["seat_gap"])
