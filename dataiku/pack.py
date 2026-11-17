"""pack.py — build dist/insiyab_dataiku.zip and print the bootstrap cell text.

Run from the repository root:

  python3 dataiku/pack.py

The zip contains:
  lib/insiyab_flow.py          the stage-function module
  lib/model/                   the engine package (copied from model/)
  recipes/prepare.py           ...
  recipes/insights.py
  recipes/forecast.py
  recipes/gap.py
  recipes/decisions.py
  recipes/publish.py
  build_flow.py                the notebook cell that builds the Flow

Upload the zip to the Dataiku managed folder called 'uploads', then paste
the bootstrap text printed here into a notebook cell and run it.
"""
import os, shutil, sys, textwrap, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATAIKU_DIR = os.path.join(ROOT, "dataiku")
DIST_DIR = os.path.join(ROOT, "dist")
ZIP_PATH = os.path.join(DIST_DIR, "insiyab_dataiku.zip")


def main():
    os.makedirs(DIST_DIR, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:

        # lib/insiyab_flow.py
        zf.write(os.path.join(DATAIKU_DIR, "lib", "insiyab_flow.py"),
                 "lib/insiyab_flow.py")

        # lib/model/ — copy the engine package
        model_src = os.path.join(ROOT, "model")
        for dirpath, _, filenames in os.walk(model_src):
            for fname in filenames:
                if fname.endswith(".py") and "__pycache__" not in dirpath:
                    full = os.path.join(dirpath, fname)
                    rel = os.path.relpath(full, ROOT)       # model/prepare.py etc.
                    zf.write(full, f"lib/{rel}")

        # recipes/
        recipes_dir = os.path.join(DATAIKU_DIR, "recipes")
        for fname in sorted(os.listdir(recipes_dir)):
            if fname.endswith(".py"):
                zf.write(os.path.join(recipes_dir, fname), f"recipes/{fname}")

        # build_flow.py
        zf.write(os.path.join(DATAIKU_DIR, "build_flow.py"), "build_flow.py")

    size_kb = os.path.getsize(ZIP_PATH) // 1024
    print(f"Wrote {ZIP_PATH} ({size_kb} KB, {len(zf.namelist())} files)")
    print()
    print("=" * 70)
    print("Bootstrap cell — paste into a Dataiku notebook and run:")
    print("=" * 70)
    print(textwrap.dedent("""\
        import io, zipfile, dataiku

        # 1. Download the zip from the uploads managed folder
        uploads = dataiku.Folder("uploads")
        zip_bytes = uploads.get_download_stream("insiyab_dataiku.zip").read()

        # 2. Unpack build_flow.py from the zip and exec it
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            build_flow_code = zf.read("build_flow.py").decode("utf-8")

        exec(build_flow_code)
    """))
    print("=" * 70)
    print(f"Bootstrap is {len(textwrap.dedent(open(__file__).read().split('Bootstrap cell')[0]))} chars — well under 25 lines.")


if __name__ == "__main__":
    main()
