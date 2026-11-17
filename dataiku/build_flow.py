"""build_flow.py — run once inside a Dataiku notebook to create the full Flow.

Paste this entire file into a notebook cell (or run it after uploading via the
bootstrap cell printed by pack.py).  It is idempotent: re-running it replaces
existing recipes and datasets rather than failing.

Requirements: the managed folder ``state`` and the DATA.* input datasets must
already exist (they are shared from the DATA project and are read-only here).

Unverified dataikuapi calls (confirmed correct from the developer docs but not
tested against this Dataiku instance):
  - CodeRecipeCreator.with_new_output_dataset(name, connection, overwrite=True)
  - DSSLibraryFolder.get_file(name) — may not exist in older Dataiku versions;
    the code falls back to add_file() with a try/except.
  - project.create_managed_folder(name, connection_name='filesystem_folders') —
    confirmed as of Dataiku 12; the connection_name parameter may differ.
  - CodeRecipeCreator.with_input(id, project_key, role) — inherited from
    DSSRecipeCreator; documented but inheritance not explicitly confirmed.
"""
import os, io, zipfile
import dataiku

client = dataiku.api_client()
project = client.get_default_project()
PROJECT_KEY = project.project_key
CONN = "filesystem_managed"
DATA_PROJECT = "DATA"

# ---------------------------------------------------------------------------
# 1. Unzip the uploaded library into the project library's python/ folder
# ---------------------------------------------------------------------------

def _get_or_create_folder(lib, name):
    try:
        return lib.get_folder(name)
    except Exception:
        return lib.add_folder(name)


def _write_lib_file(folder, name, content):
    try:
        f = folder.get_file(name)
    except Exception:
        f = folder.add_file(name)
    f.write(content)


lib = project.get_library()
python_folder = _get_or_create_folder(lib, "python")

# Find the zip in the managed folder called 'uploads' (the bootstrap puts it there)
uploads = dataiku.Folder("uploads")
zip_path = None
for item in uploads.list_paths_in_partition():
    if item.endswith("insiyab_dataiku.zip"):
        zip_path = item
        break

if zip_path:
    zip_bytes = uploads.get_download_stream(zip_path).read()
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for member in zf.namelist():
            if member.startswith("lib/") and member.endswith(".py"):
                rel = member[len("lib/"):]           # e.g. insiyab_flow.py
                if "/" in rel:                        # sub-folder inside lib
                    parts = rel.rsplit("/", 1)
                    sub = _get_or_create_folder(python_folder, parts[0])
                    _write_lib_file(sub, parts[1], zf.read(member).decode("utf-8"))
                else:
                    _write_lib_file(python_folder, rel, zf.read(member).decode("utf-8"))
    print("Library updated from zip.")
else:
    print("WARNING: insiyab_dataiku.zip not found in the uploads folder. "
          "Upload it and re-run this cell.")

# ---------------------------------------------------------------------------
# 2. Create managed folders: state (internal), bundle (output)
# ---------------------------------------------------------------------------

existing_folders = {f["name"] for f in project.list_managed_folders()}
for fname in ("state", "bundle", "uploads"):
    if fname not in existing_folders:
        project.create_managed_folder(fname, connection_name="filesystem_folders")
        print(f"Created managed folder: {fname}")

# ---------------------------------------------------------------------------
# 3. Helper to read recipe scripts from the zip
# ---------------------------------------------------------------------------

recipe_scripts = {}
if zip_path:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for member in zf.namelist():
            if member.startswith("recipes/") and member.endswith(".py"):
                name = os.path.basename(member)
                recipe_scripts[name] = zf.read(member).decode("utf-8")


def _script(name):
    return recipe_scripts.get(name, f"# {name} script not found in zip")


# ---------------------------------------------------------------------------
# 4. Helper to create or replace a recipe
# ---------------------------------------------------------------------------

existing_recipes = {r["name"] for r in project.list_recipes()}


def _make_recipe(recipe_name, script, inputs, outputs_ds=None, outputs_folder=None,
                 inputs_folder=None):
    """Create (or replace) a Python recipe wired to the given inputs and outputs."""
    if recipe_name in existing_recipes:
        # Update the existing recipe's script and IO
        rec = project.get_recipe(recipe_name)
        s = rec.get_settings()
        s.set_code(script)
        s.save()
        print(f"Updated recipe: {recipe_name}")
        return

    creator = project.new_recipe("python", recipe_name)
    for ds_name, proj in (inputs or []):
        creator.with_input(ds_name, project_key=proj or PROJECT_KEY)
    for folder_name in (inputs_folder or []):
        creator.with_input(folder_name, project_key=PROJECT_KEY)
    for ds_name in (outputs_ds or []):
        creator.with_new_output_dataset(ds_name, CONN, overwrite=True)
    for folder_name in (outputs_folder or []):
        # Managed folders must already exist; we wire them as outputs via their id
        creator.with_output(folder_name)
    creator.with_script(script)
    creator.create()
    print(f"Created recipe: {recipe_name}")


# ---------------------------------------------------------------------------
# 5. Create managed output datasets (they are needed before recipes reference them)
# ---------------------------------------------------------------------------

MANAGED_DS = [
    "stop_visits", "boardings_quarter", "prepare_log", "vehicle_attributes",
    "insights",
    "forecast_boardings", "forecast_lateness", "model_metrics", "feature_importance",
    "seat_gap",
    "decisions_table", "vehicle_swaps", "passenger_offers",
]
existing_ds = {d["name"] for d in project.list_datasets()}
for ds_name in MANAGED_DS:
    if ds_name not in existing_ds:
        project.new_managed_dataset(ds_name).with_store_into(CONN).create()
        print(f"Created dataset: {ds_name}")

# ---------------------------------------------------------------------------
# 6. Create recipes
# ---------------------------------------------------------------------------

DATA_INPUTS = [
    ("nol_card_details_15-Dec-2025", DATA_PROJECT),
    ("Running_time_15-Dec-2025", DATA_PROJECT),
    ("Fleet_List", DATA_PROJECT),
    ("community_2026-10-20_09-28-00", DATA_PROJECT),
    ("stops", DATA_PROJECT), ("trips", DATA_PROJECT), ("routes", DATA_PROJECT),
    ("stop_times", DATA_PROJECT), ("shapes", DATA_PROJECT), ("calendar", DATA_PROJECT),
]

_make_recipe(
    "prepare",
    _script("prepare.py"),
    inputs=DATA_INPUTS,
    outputs_ds=["stop_visits", "boardings_quarter", "prepare_log", "vehicle_attributes"],
    outputs_folder=["state"],
)

_make_recipe(
    "insights",
    _script("insights.py"),
    inputs=[("stop_visits", None), ("vehicle_attributes", None)],
    outputs_ds=["insights"],
)

_make_recipe(
    "forecast",
    _script("forecast.py"),
    inputs=None,
    inputs_folder=["state"],
    outputs_ds=["forecast_boardings", "forecast_lateness", "model_metrics", "feature_importance"],
    outputs_folder=["state"],
)

_make_recipe(
    "gap",
    _script("gap.py"),
    inputs=None,
    inputs_folder=["state"],
    outputs_ds=["seat_gap"],
)

_make_recipe(
    "decisions",
    _script("decisions.py"),
    inputs=None,
    inputs_folder=["state"],
    outputs_ds=["decisions_table", "vehicle_swaps", "passenger_offers"],
)

_make_recipe(
    "publish",
    _script("publish.py"),
    inputs=None,
    inputs_folder=["state"],
    outputs_folder=["bundle"],
)

# ---------------------------------------------------------------------------
# 7. Optionally create Flow zones
# ---------------------------------------------------------------------------

try:
    zones = project.get_flow().list_zones()
    zone_names = {z["name"] for z in zones}
    for zone_label, items in [
        ("Raw data",  [d[0] for d in DATA_INPUTS]),
        ("Prepared",  ["stop_visits", "boardings_quarter", "prepare_log", "vehicle_attributes"]),
        ("Insights",  ["insights"]),
        ("Forecast",  ["forecast_boardings", "forecast_lateness", "model_metrics", "feature_importance"]),
        ("Decisions", ["seat_gap", "decisions_table", "vehicle_swaps", "passenger_offers"]),
        ("Published", ["bundle"]),
    ]:
        if zone_label not in zone_names:
            project.get_flow().create_zone(zone_label)
    print("Flow zones created or already exist.")
except Exception as e:
    print(f"Flow zones not created (not critical): {e}")

print("\nFlow build complete.  Trigger a build of 'publish' to run the full pipeline.")
