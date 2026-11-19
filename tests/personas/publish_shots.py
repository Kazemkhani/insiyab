"""Copies one run's failure screenshots into tests/personas/shots/<stamp>/ as small JPEGs (identical shots kept once),
and prints every failure as a markdown table row for docs/team/PERSONA-REPORT.md.
Usage: python3 tests/personas/publish_shots.py tests/personas/out/<stamp>
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
run = Path(sys.argv[1]).resolve()
dest = HERE / "shots" / run.name
dest.mkdir(parents=True, exist_ok=True)
by_hash = {}
rows = []
for f in sorted(run.glob("*.json")):
    for r in json.loads(f.read_text())["results"]:
        if r["pass"]:
            continue
        shot = ""
        if r["screenshot"]:
            src = REPO / r["screenshot"]
            h = hashlib.sha256(src.read_bytes()).hexdigest()
            if h not in by_hash:
                out = dest / (src.stem[:60] + ".jpg")
                im = Image.open(src).convert("RGB")
                if im.width > 1280:
                    im = im.resize((1280, round(im.height * 1280 / im.width)))
                if im.height > 4000:  # a full-page phone shot: keep the top, where the failure is measured
                    im = im.crop((0, 0, im.width, 4000))
                im.save(out, "JPEG", quality=72, optimize=True)
                by_hash[h] = out.relative_to(REPO)
            shot = f"`{by_hash[h]}`"
        detail = r["detail"].replace("|", "/").replace("\n", " ")[:220]
        rows.append(f"| {r['severity']} | {r['persona']} | {r['page']} | {r['check']} | {r['owner']} | {shot} | {detail} |")
order = {"blocker": 0, "fix": 1, "polish": 2}
rows.sort(key=lambda x: order[x.split("|")[1].strip()])
print("| Severity | Persona | Page | Finding | Owner | Screenshot | Detail |\n|---|---|---|---|---|---|---|")
print("\n".join(rows))
total = sum(p.stat().st_size for p in dest.glob("*.jpg"))
print(f"\n{len(by_hash)} screenshots, {total // 1024} KB in {dest.relative_to(REPO)}", file=sys.stderr)
