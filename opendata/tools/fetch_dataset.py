"""Fetch the newest file of one small data.dubai dataset, with no account and no key.

    python3 opendata/tools/fetch_dataset.py <datasetId> <folder outside git>

Writes <folder>/<dataset name>.csv.gz and <folder>/<dataset name>.source.json (the portal's own
record of the dataset: title, publisher, licence field, dates) and prints both. The download
addresses are signed and last ten minutes, so they are asked for and used at once.
Not for the bus tap dataset (459803), which is 2,093 large pieces: see opendata/ACCESS.md.
"""
import json, os, sys, datetime, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}


def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180)


def main(ds, out):
    os.makedirs(out, exist_ok=True)
    rec = json.load(get(f"https://data.dubai/o/c/datasets/{ds}"))
    name = rec.get("datasetName") or str(ds)
    lst = json.load(get(f"https://data.dubai/o/dda/data-services/dataset-download?datasetId={ds}&page=1&pageSize=100&sortDir=desc"))
    meta = (lst.get("data") or {}).get("metadata") or []
    if not meta:
        sys.exit(f"no files listed for {ds} ({name})")
    newest = sorted(meta, key=lambda m: m["file_folder"])[-1]
    f = [x for x in newest["files"] if x["file_extension"] == "csv"][0]
    path = os.path.join(out, name + ".csv.gz")
    with get(f["file_url"]) as r, open(path, "wb") as w:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            w.write(b)
    keep = ["id", "datasetName", "title", "dateCreated", "dateModified", "ingestionDate", "license", "rights",
            "classification", "frequencyOfUpdateOnSource", "frequencyOfDissemination", "referencePeriod",
            "aboutThisDataSet", "additionalInformationDataProvenance", "datasetURL"]
    src = {k: rec.get(k) for k in keep if k in rec}
    src.update({"page": f"https://data.dubai/en/l/{ds}", "file": f["file_name"], "file_bytes": f["file_size"],
                "folders_listed": len(meta), "fetched_utc": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")})
    json.dump(src, open(os.path.join(out, name + ".source.json"), "w"), indent=1, ensure_ascii=False)
    print(path, os.path.getsize(path), "bytes;", len(meta), "folder(s) listed")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
