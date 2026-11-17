# Recipe: publish
# Reads the bundle from the model_state folder and writes every contract file (see
# docs/CONTRACT.md) as JSON into the managed folder called ``bundle``.  The
# contract checker (tools/contract_check.py) must pass on these files before
# the public site switches from stand-in data to real results.
import dataiku, io
from insiyab_flow import publish, load_bytes

state = dataiku.Folder("model_state")
bundle = load_bytes(state.get_download_stream("bundle.pkl").read())

out_folder = dataiku.Folder("bundle")


def _write(name, text):
    out_folder.upload_stream(name, io.BytesIO(text.encode("utf-8")))


publish(bundle, _write)

print("Published", sum(1 for _ in bundle), "files to the bundle folder.")
