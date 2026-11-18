#!/usr/bin/env python3
"""Joins the engine into one file that can be pasted into a Dataiku Python notebook, where a package cannot be imported.

  python3 tools/make_notebook.py            writes dist/insiyab_dataiku.py (dist/ is not in git: it is built, never edited)

The file carries each module of model/ as text and loads them as a package in memory, so it is the same code, not a copy
rewritten by hand. tests/test_notebook.py runs it on the invented tables and requires the same bundle, byte for byte."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["measures", "naive", "prepare", "context", "forecast", "delay", "triptime", "evaluate", "bundle", "run", "card"]      # each after what it imports

HEAD = '''# Insiyab: the engine as one file, for a Dataiku Python notebook. Built by tools/make_notebook.py: do not edit, rebuild.
#
# What it prints: counts for each stage, the tables of error, and the model card. Totals only. It prints no row, and no card,
# device, driver or vehicle number. Keep what it prints inside Dataiku until a mentor has said totals may leave.
#
# How to use it: paste the whole file into one cell. Edit DATASETS near the end so each name is the dataset's name in your
# Flow. Run the cell. It needs pandas, numpy and scikit-learn; with lightgbm it is many times faster, so check first:
#     import lightgbm          (if this fails, ask for it, or expect a long run)
import sys, types

_SOURCES = {}
'''
TAIL = '''
_pkg = types.ModuleType("model"); _pkg.__path__ = []; sys.modules["model"] = _pkg
for _name in %(order)r:
    _m = types.ModuleType("model." + _name); _m.__package__ = "model"; sys.modules["model." + _name] = _m; setattr(_pkg, _name, _m)
    exec(compile(_SOURCES[_name], "model/" + _name + ".py", "exec"), _m.__dict__)

import os, tempfile
from model.prepare import load, prepare
from model import run as _run, card as _card

# ---- EDIT THIS: the name of each dataset in your Flow. The twelve feed files may be missing any that the feed does not have. ----
DATASETS = {
    "nol": "nol_transactions", "avl": "bus_runtime_avl", "fleet": "bus_fleet", "communities": "community_boundaries",
    "gtfs_agency": "agency", "gtfs_routes": "routes", "gtfs_trips": "trips", "gtfs_stop_times": "stop_times", "gtfs_stops": "stops",
    "gtfs_calendar": "calendar", "gtfs_calendar_dates": "calendar_dates", "gtfs_frequencies": "frequencies", "gtfs_shapes": "shapes",
    "gtfs_transfers": "transfers", "gtfs_translations": "translations", "gtfs_feed_info": "feed_info",
}


def _tables():
    local = os.environ.get("INSIYAB_LOCAL_DATA")          # set only by the test, to run this same file on the invented tables
    if local:
        return load(local), True
    import dataiku, pandas as pd
    out = {}
    for key, name in DATASETS.items():
        try:
            # every column as text: a reader that guesses types turns route 021 into 21 and a stop id into a number
            out[key] = dataiku.Dataset(name).get_dataframe(infer_with_pandas=False, columns=None).astype(str).replace({"nan": "", "None": ""})
        except Exception as e:
            if key.startswith("gtfs_") and key not in ("gtfs_routes", "gtfs_trips", "gtfs_stop_times", "gtfs_stops"):
                out[key] = pd.DataFrame(); print("NOTE no dataset for", key, "(" + name + "): carried on without it")
            else:
                raise RuntimeError("could not read the dataset for " + key + " (named " + name + " in DATASETS): " + str(e))
    return out, False


_tabs, _invented = _tables()
_day = prepare(_tabs)
for _line in _day["log"]:
    print("STAGE " + _line["stage"] + ": " + ", ".join(k + " " + str(v) for k, v in _line.items() if k not in ("stage", "text")))
BUNDLE = _run.build(_day, fixture=_invented)                # the files of the bundle, in memory: {name: content}
_out = os.environ.get("INSIYAB_OUT") or tempfile.mkdtemp(prefix="insiyab-")
_run.write(BUNDLE, _out)
print()
print(_card.card(_out))
print("The bundle is in", _out, "on this machine. It holds totals only. Do not move it out of Dataiku until a mentor has said totals may leave.")
'''


def build():
    parts = [HEAD]
    for name in ORDER:
        src = open(os.path.join(ROOT, "model", name + ".py"), encoding="utf-8").read()
        assert "'''" not in src.replace('"""', ""), f"model/{name}.py uses three single quotes: the notebook file wraps each module in them"
        parts.append(f"_SOURCES[{name!r}] = r'''\n{src}'''\n")
    parts.append(TAIL % {"order": ORDER})
    return "\n".join(parts)


if __name__ == "__main__":
    out = os.path.join(ROOT, "dist", "insiyab_dataiku.py"); os.makedirs(os.path.dirname(out), exist_ok=True)
    text = build(); open(out, "w", encoding="utf-8").write(text)
    print(f"WROTE {out} ({len(text.splitlines())} lines, {len(text) // 1024} KB)")
