#!/usr/bin/env python3
"""The Khutwa page in a real browser at phone size (390 by 844), with and without a room.

    python3 rider/tests/page_check.py [--shots DIR]

The room here is a small stand-in for lane 1's relay, speaking the calls of docs/CONTRACT.md ("The live room").
The last line is ALL PASS. bash rider/tests/run.sh runs this where Playwright and its browser are installed.
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
os.chdir(ROOT)
failed = 0
passed = 0


def check(name, ok, detail=""):
    global failed, passed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}"))
    if ok:
        passed += 1
    else:
        failed += 1


def build(bundle, out):
    r = subprocess.run(["node", "rider/build.mjs", "--bundle", bundle, "--out", os.path.join(out, "khutwa")], capture_output=True, text=True)
    return r.returncode == 0 and r.stdout.startswith("BUILT"), r.stdout + r.stderr


class Room:
    """One room's state, as the relay keeps it: a phase and counts, and nothing about a visitor."""

    def __init__(self):
        self.on = False            # False: this address has no room at all (404), as on a built folder
        self.slow = False          # True: the room exists but does not answer in time
        self.phase = "waiting"
        self.decision_id = None
        self.seats = 0
        self.answers = {}
        self.posted = []

    def state(self):
        return {"phase": self.phase, "decision_id": self.decision_id, "joined": self.seats,
                "accepted": sum(1 for a in self.answers.values() if a), "declined": sum(1 for a in self.answers.values() if not a),
                "depot": "none", "at": int(time.time())}


def serve(root, room):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def answer(self, body, status=200):
            data = json.dumps(body).encode()
            try:
                self.send_response(status); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(data))); self.end_headers(); self.wfile.write(data)
            except OSError:
                pass                   # the phone gave up waiting, as it should after two seconds

        def room_call(self, method):
            if not room.on:
                return self.answer({"error": "no room"}, 404)
            if room.slow:
                time.sleep(4)
                return self.answer({"error": "late"}, 503)
            name = self.path.split("/api/room/")[1].split("?")[0]
            body = {}
            if method == "POST":
                raw = self.rfile.read(int(self.headers.get("content-length") or 0))
                body = json.loads(raw) if raw else {}
                room.posted.append((name, body))
            if name == "join" and method == "POST":
                room.seats += 1
                return self.answer({"seat": room.seats})
            if name == "state" and method == "GET":
                return self.answer(room.state())
            if name == "answer" and method == "POST":
                room.answers[body.get("seat")] = bool(body.get("accept"))
                return self.answer({"ok": True})
            return self.answer({"error": "not a call a phone makes"}, 401)

        def do_GET(self):
            if "/api/room/" in self.path:
                return self.room_call("GET")
            return super().do_GET()

        def do_POST(self):
            if "/api/room/" in self.path:
                return self.room_call("POST")
            return self.answer({"error": "nothing here"}, 404)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
if shots:
    os.makedirs(shots, exist_ok=True)

with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    dec = json.load(open("fixtures/decisions.json")); d = next(x for x in dec["decisions"] if x["lever"] == "rewarded_choice"); u = d["usual"]
    net = json.load(open("fixtures/network.json")); stop_name = {s["stop_id"]: s["name"] for s in net["stops"]}

    def bundle(name, change):
        b = os.path.join(tmp, name + "-bundle")
        shutil.copytree("fixtures", b, ignore=shutil.ignore_patterns("raw"))
        change(b)
        return b

    def with_walks(b):
        j = json.load(open(os.path.join(b, "decisions.json"))); x = next(x for x in j["decisions"] if x["lever"] == "rewarded_choice")
        other = next(r["route_id"] for r in net["routes"] if r["route_id"] != u["route_id"]); far = next(s["stop_id"] for s in net["stops"] if s["stop_id"] != u["stop_id"])
        x["offers"].append({"kind": "other_route", "route_id": other, "stop_id": far, "depart": u["depart"] + 300, "walk_metres": 320, "walk_minutes": 5, "extra_minutes": 9, "points": 20, "load": 4, "seats": 32})
        x["offers"].append({"kind": "other_route", "route_id": other, "stop_id": far, "depart": u["depart"] + 600, "walk_metres": 900, "walk_minutes": 12, "extra_minutes": 15, "points": 77, "load": 2, "seats": 32})
        json.dump(j, open(os.path.join(b, "decisions.json"), "w"))

    def without_choice(b):
        j = json.load(open(os.path.join(b, "decisions.json"))); j["decisions"] = [x for x in j["decisions"] if x["lever"] != "rewarded_choice"]
        json.dump(j, open(os.path.join(b, "decisions.json"), "w"))

    def not_standin(b):
        j = json.load(open(os.path.join(b, "meta.json"))); j["fixture"] = False; json.dump(j, open(os.path.join(b, "meta.json"), "w"))

    sites, rooms = {}, {}
    for name, b in (("stand-in", "fixtures"), ("walking", bundle("walking", with_walks)), ("none", bundle("none", without_choice)), ("real", bundle("real", not_standin))):
        out = os.path.join(tmp, name); ok, said = build(b, out); check(f"the page builds from the {name} bundle", ok, said)
        rooms[name] = Room(); sites[name] = serve(out, rooms[name])
    url = lambda n, q="": f"http://127.0.0.1:{sites[n].server_address[1]}/khutwa/{q}"

    browser = p.chromium.launch()
    thrown = []

    def phone():
        ctx = browser.new_context(viewport={"width": 390, "height": 844}); page = ctx.new_page()
        page.on("pageerror", lambda e: thrown.append(str(e)[:200]))
        page.on("console", lambda m: thrown.append(m.text[:200]) if m.type == "error" and not m.text.startswith("Failed to load resource") else None)
        return ctx, page

    sideways = lambda page: page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    shot = lambda page, name: page.screenshot(path=os.path.join(shots, name + ".png"), full_page=True) if shots else None

    # ---- no room: the page works by itself
    ctx, page = phone()
    page.goto(url("stand-in"), wait_until="load")
    check("it says STAND-IN DATA, NOT A RESULT when the bundle is stand-in data", page.get_by_text("STAND-IN DATA, NOT A RESULT").is_visible())
    over = u["load"] - u["seats"]
    check("the first screen shows the usual bus at her stop, with the bundle's own count", stop_name[u["stop_id"]].lower() in page.inner_text("#where").lower() and page.inner_text("#usual-load") == str(abs(over)) and f"{u['load']} passengers on board and {u['seats']} seats" in page.inner_text("#usual-facts"), page.inner_text("#s-usual"))
    check("the bus is drawn from the count: a square for each seat, a mark for each passenger without one", page.locator("#usual-bus .seats i").count() == u["seats"] and page.locator("#usual-bus .seats i.taken").count() == min(u["load"], u["seats"]) and page.locator("#usual-bus .standing i").count() == max(0, over))
    check("it says how late the usual bus left", "late" in page.inner_text("#usual-facts") or "on time" in page.inner_text("#usual-facts") or "early" in page.inner_text("#usual-facts"), page.inner_text("#usual-facts"))
    check("it says the passenger is fictional", "fictional" in page.inner_text("#s-usual").lower())
    page.locator("#show").wait_for(state="visible", timeout=4000)
    check("with no room, \"Show me the offer\" appears within two seconds and nothing is asked of the visitor", page.inner_text("#show") == "Show me the offer" and page.locator("input:not([type=checkbox]), select, textarea").count() == 0)
    shot(page, "1-usual-bus")
    page.click("#show")
    check("the offer shows every choice of the bundle's rewarded choice", page.locator("#choices .choice").count() == len(d["offers"]))
    first = page.inner_text("#choices .choice >> nth=0")
    check("a choice states what it costs her and what she earns", f"{d['offers'][0]['points']} Khutwa points" in first and "The fare is the same" in first and "walk" in first, first)
    check("a choice is never the only way: the usual bus and a way to say no are on the same screen", page.locator("#decline").is_visible() and "usual bus still runs" in page.inner_text("#s-offer") and "Nobody is ever charged more" in page.inner_text("#s-offer"))
    check("every button is at least 44 pixels tall", page.evaluate("[...document.querySelectorAll('button')].filter(b=>b.offsetParent).every(b=>b.getBoundingClientRect().height>=44)"))
    check("the offer does not scroll sideways at 390 wide", sideways(page) <= 1, sideways(page))
    shot(page, "2-offer")
    page.locator("#choices button").first.click()
    check("taking a choice shows the points earned", f"{d['offers'][0]['points']} Khutwa points" in page.inner_text("#done-headline"))
    buys = page.inner_text("#buys-list").lower()
    check("it shows what the points buy: a fare, bread, rice, a phone top-up", all(w in buys for w in ("fare", "bread", "rice", "top-up")), buys)
    check("the expected effect is marked simulated", page.locator("#simulated").is_visible() and page.inner_text("#simulated").startswith("Simulated") and page.locator("#buys .simulated").is_visible())
    check("with no room, no room count is shown", page.locator("#room-count").is_hidden())
    shot(page, "3-taken")
    page.click("#again"); page.click("#decline")
    check("saying no keeps the usual bus and costs nothing", "as always" in page.inner_text("#done-headline") and page.locator("#buys").is_hidden())
    ctx.close()

    # ---- "I cannot walk further"
    ctx, page = phone()
    page.goto(url("walking"), wait_until="load"); page.locator("#show").wait_for(state="visible", timeout=4000); page.click("#show")
    texts = page.inner_text("#choices")
    check("a short walk is offered, with its metres and minutes", page.locator("#choices .choice").count() == len(d["offers"]) + 1 and "320 metres" in texts and "5 minutes" in texts, texts)
    check("a long walk is never offered (900 metres is not on the page)", "900 metres" not in page.inner_text("body") and '"walk_metres":900' not in page.content())
    page.locator("#no-walk").check()
    check("after \"I cannot walk further\" no choice involves a walk", page.locator("#choices .choice").count() == len(d["offers"]) and "320 metres" not in page.inner_text("#choices") and page.locator("#walk-note").is_visible())
    page.reload(wait_until="load"); page.locator("#show").wait_for(state="visible", timeout=4000); page.click("#show")
    check("and it stays so when the page is opened again", page.locator("#no-walk").is_checked() and "320 metres" not in page.inner_text("#choices"))
    ctx.close()

    # ---- no rewarded choice, and a bundle that is not stand-in
    ctx, page = phone()
    page.goto(url("none"), wait_until="load")
    check("with no rewarded choice in the bundle the page says so and offers nothing", page.locator("#s-none").is_visible() and page.locator("#show").is_hidden())
    page.goto(url("real"), wait_until="load")
    check("a bundle that is not stand-in data is not labelled stand-in", page.locator("#band").is_hidden() and "stand-in" not in page.inner_text("body").lower())
    ctx.close()

    # ---- one stop: ?stop=<stop_id>
    ctx, page = phone()
    page.goto(url("stand-in", "?stop=" + u["stop_id"]), wait_until="load")
    rows = page.locator("#board li")
    check("opened with ?stop= it shows that stop's name and its next buses", page.inner_text("#stop-name") == stop_name[u["stop_id"]] and rows.count() >= 1, page.inner_text("#s-stop"))
    check("each bus shows its time, its route and how full it was", all(("on board" in rows.nth(i).inner_text() and "seats" in rows.nth(i).inner_text() and "Route" in rows.nth(i).inner_text()) for i in range(rows.count())))
    check("the usual bus is on the board as a full bus", page.locator("#board .bar.over").count() >= 1 and "without a seat" in page.inner_text("#board"))
    check("the stop page says STAND-IN DATA, NOT A RESULT too, and does not join a room", page.get_by_text("STAND-IN DATA, NOT A RESULT").is_visible() and rooms["stand-in"].posted == [])
    check("the stop page does not scroll sideways at 390 wide", sideways(page) <= 1, sideways(page))
    shot(page, "4-stop")
    page.goto(url("stand-in", "?stop=no-such-stop"), wait_until="load")
    check("a stop the bundle does not have is said plainly", "not in the day" in page.inner_text("#stop-name") and page.locator("#morning-link").is_visible())
    page.click("#morning-link"); page.locator("#s-usual").wait_for(state="visible", timeout=4000)
    check("and the way back to the passenger's morning works", "stop=" not in page.url)
    ctx.close()

    # ---- the room
    room = rooms["stand-in"]; room.on = True
    ctx, page = phone()
    page.goto(url("stand-in"), wait_until="load")
    page.locator("#waiting").wait_for(state="visible", timeout=4000)
    check("with a room, the phone joins as a seat number and waits", "seat 1" in page.inner_text("#waiting") and page.locator("#show").is_hidden() and room.posted == [("join", {})], room.posted)
    page.wait_for_timeout(1500)
    check("while the room is waiting, no offer is shown", page.locator("#s-offer").is_hidden())
    room.phase = "offer"; room.decision_id = d["id"]; t0 = time.time()
    page.locator("#choices button").first.wait_for(state="visible", timeout=4000)
    check("when the room's phase becomes offer, the offer is on the phone within two seconds", time.time() - t0 <= 2.0, time.time() - t0)
    page.locator("#choices button").first.click(); page.wait_for_timeout(600)
    check("\"I'll take it\" is sent to the room with the seat and nothing else", ("answer", {"seat": 1, "accept": True}) in room.posted and all(set(b) <= {"seat", "accept"} for n, b in room.posted), room.posted)
    page.locator("#room-count").wait_for(state="visible", timeout=4000)
    check("the phone shows the room's count, and says it is not a result", "1 of 1 took the offer" in page.inner_text("#room-count") and "not a result" in page.inner_text("#room-count"), page.inner_text("#room-count"))
    shot(page, "5-room-taken")
    page.click("#again"); page.click("#decline"); page.wait_for_timeout(600)
    check("\"No thanks\" is sent to the room, and replaces the seat's earlier answer", room.posted[-1] == ("answer", {"seat": 1, "accept": False}) and room.state()["accepted"] == 0 and room.state()["declined"] == 1, room.posted[-3:])
    room.phase = "waiting"; room.answers = {}
    page.locator("#waiting").wait_for(state="visible", timeout=4000)
    check("when the presenter starts again, the phone goes back to waiting", page.locator("#s-usual").is_visible() and page.locator("#show").is_hidden())
    room.slow = True
    page.locator("#show").wait_for(state="visible", timeout=9000)
    check("if the room stops answering, \"Show me the offer\" appears and the page works by itself", page.locator("#waiting").is_hidden())
    page.click("#show"); page.locator("#choices button").first.click()
    check("and the offer can still be taken with no room", "Khutwa points" in page.inner_text("#done-headline") and page.locator("#room-count").is_hidden())
    ctx.close()

    # ---- a room that is slow from the start
    room2 = rooms["walking"]; room2.on = True; room2.slow = True
    ctx, page = phone(); t0 = time.time()
    page.goto(url("walking"), wait_until="load"); page.locator("#show").wait_for(state="visible", timeout=5000)
    check("a room that does not answer within two seconds is treated as absent", time.time() - t0 <= 3.5, time.time() - t0)
    ctx.close()

    check("no page threw an error or logged one", not thrown, thrown[:3])
    browser.close()
    for s in sites.values():
        s.shutdown()

print(f"{failed} FAILED" if failed else f"ALL PASS ({passed} checks)")
sys.exit(1 if failed else 0)
