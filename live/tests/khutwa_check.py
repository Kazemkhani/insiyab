#!/usr/bin/env python3
"""The Khutwa page in a real browser at phone size, built from the stand-in bundle and from a bundle with a walking offer planted.
No room is reachable here, so this also proves the page works when the relay is absent. The last line is ALL PASS.
  python3 live/tests/khutwa_check.py [--shots DIR]"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."); os.chdir(ROOT)
failed = 0
def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}")); failed += 0 if ok else 1

def build(bundle, out):
    for f in ("meta.json", "network.json", "decisions.json"):
        os.makedirs(os.path.join(out, "data"), exist_ok=True); shutil.copy(os.path.join(bundle, f), os.path.join(out, "data", f))
    r = subprocess.run(["node", "live/khutwa/build.mjs", "--bundle", bundle, "--out", os.path.join(out, "khutwa")], capture_output=True, text=True)
    return r.returncode == 0 and r.stdout.startswith("BUILT"), r.stdout + r.stderr

def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    dec = json.load(open("fixtures/decisions.json")); d = next(x for x in dec["decisions"] if x["lever"] == "rewarded_choice"); u = d["usual"]; net = json.load(open("fixtures/network.json"))
    # a second bundle: the same, with a walking offer added, so the "I cannot walk further" control has something to remove
    b2 = os.path.join(tmp, "bundle2"); os.makedirs(b2)
    for f in ("meta.json", "network.json"): shutil.copy(os.path.join("fixtures", f), b2)
    other = next(r["route_id"] for r in net["routes"] if r["route_id"] != u["route_id"]); far = next(s["stop_id"] for s in net["stops"] if s["stop_id"] != u["stop_id"])
    d["offers"].append({"kind": "other_route", "route_id": other, "stop_id": far, "depart": u["depart"] + 300, "walk_metres": 320, "walk_minutes": 5, "extra_minutes": 9, "points": 20, "load": 4, "seats": 32})
    json.dump(dec, open(os.path.join(b2, "decisions.json"), "w"))
    # a third: no rewarded choice at all
    b3 = os.path.join(tmp, "bundle3"); os.makedirs(b3)
    for f in ("meta.json", "network.json"): shutil.copy(os.path.join("fixtures", f), b3)
    json.dump({"fixture": True, "decisions": [x for x in dec["decisions"] if x["lever"] != "rewarded_choice"]}, open(os.path.join(b3, "decisions.json"), "w"))
    sites = {}
    for name, bundle in (("stand-in", "fixtures"), ("walking", b2), ("none", b3)):
        out = os.path.join(tmp, name); ok, said = build(bundle, out); check(f"the page builds from the {name} bundle", ok, said); sites[name] = serve(out)
    url = lambda n: f"http://127.0.0.1:{sites[n].server_address[1]}/khutwa/"
    browser = p.chromium.launch(); ctx = browser.new_context(viewport={"width": 390, "height": 844}); page = ctx.new_page(); thrown = []
    page.on("pageerror", lambda e: thrown.append(str(e)[:200]))

    page.goto(url("stand-in"), wait_until="load")
    check("the page says STAND-IN DATA, NOT A RESULT when the bundle is stand-in data", page.get_by_text("STAND-IN DATA, NOT A RESULT").is_visible())
    over = u["load"] - u["seats"]
    check("the first screen shows the usual bus's own numbers from the bundle", f"{over} without a seat" in page.inner_text("#usual-load") and f"{u['load']} passengers on board, {u['seats']} seats" in page.inner_text("#usual-words"), page.inner_text("#s-usual"))
    check("the bus is drawn from the count: one square a seat, one mark a passenger without one", page.locator("#usual-bus .seats i:not(.aisle)").count() == u["seats"] and page.locator("#usual-bus .seats i.taken").count() == min(u["load"], u["seats"]) and page.locator("#usual-bus .standing i").count() == max(0, over))
    page.wait_for_selector("#show", state="visible", timeout=4000)
    check("with no room to be reached, the page offers 'Show me the offer' within two seconds or so and does not claim to be in a room", page.inner_text("#show") == "Show me the offer" and not page.locator("#waiting").is_visible())
    page.click("#show")
    check("the offer lists every choice in the bundle, each with its points", page.locator("#choices li button").count() == len(d["offers"]) - 1 and all(f"+{o['points']} points" in page.inner_text("#choices") for o in d["offers"][:-1]), page.inner_text("#choices"))
    check("the passenger can always say no and keep the usual bus", page.locator("#decline").is_visible() and "usual bus still runs" in page.inner_text("#s-offer"))
    small = page.evaluate("[...document.querySelectorAll('button:not([hidden]), .walk, header a')].filter(e => e.offsetParent !== null && e.getBoundingClientRect().height < 44).map(e => e.textContent.trim().slice(0, 30))")
    check("every control is at least 44 pixels tall", small == [], small)
    check("the page does not scroll sideways at 390 wide", page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1)
    if shots: os.makedirs(shots, exist_ok=True); page.screenshot(path=os.path.join(shots, "khutwa-offer.png"), full_page=True)
    page.click("#choices li button"); first = d["offers"][0]
    check("taking a choice shows its points and marks the expected effect as simulated", f"{first['points']} Khutwa points" in page.inner_text("#done-headline") and page.inner_text("#simulated").startswith("Simulated:"), page.inner_text("#s-done"))
    check("taking a choice promises no seat: it says how much room that bus had on the day, and that a seat is not reserved", "not reserved" in page.inner_text("#done-room") and "seat" not in page.inner_text("#done-headline"), page.inner_text("#s-done"))
    page.click("#again"); page.click("#decline")
    check("declining says nothing is charged and shows no points", "No change" in page.inner_text("#done-headline") and not page.locator("#points").is_visible())

    page.goto(url("walking"), wait_until="load"); page.wait_for_selector("#show", state="visible", timeout=4000); page.click("#show")
    check("a walking offer is shown with its walk in metres and minutes", "320 metres" in page.inner_text("#choices") and "5-minute walk" in page.inner_text("#choices"), page.inner_text("#choices"))
    page.check("#no-walk")
    check("after 'I cannot walk further' no choice involves a walk", "metres" not in page.inner_text("#choices") and page.locator("#choices li button").count() == len(d["offers"]) - 1, page.inner_text("#choices"))

    page.goto(url("none"), wait_until="load")
    check("a day with no rewarded choice says so, and offers nothing", page.locator("#s-none").is_visible() and not page.locator("#show").is_visible())
    check("nothing on the page threw", thrown == [], thrown)
    html = open(os.path.join(tmp, "stand-in", "khutwa", "index.html"), encoding="utf-8").read()
    check("the page fetches nothing from another address", "http://" not in html and "https://" not in html)
    check("the page carries one decision and not the bundle: no replay, no forecast, no identifier", '"visits"' not in html and '"series"' not in html and "NOL_ID" not in html and len(html) < 60000, len(html))
    browser.close()
print("ALL PASS" if not failed else f"{failed} FAILED"); sys.exit(1 if failed else 0)
