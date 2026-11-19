"""Persona 4: RTA planner.

Goal: find which routes and hours need more time.
Fails them: cannot find the planner view; heat or lanes shown as measured when they are scenarios.
"""
import re

from common import deck_slides, main

# docs/v2/STRATEGY.md section 4: the honest label of each watcher. A label from the right column is wrong.
WATCHERS = {
    "Heat": ("rule", r"measured"),
    "Lanes": (r"rule|roadmap|list|proposal", r"measured"),
    "Events": (r"rule|list|simulated|proposal", r"measured"),
    "Connections": (r"rule|proposal", r"measured"),
}
# The Overflow row was removed from the pitch page on 19 Nov (lane 1): its claim came from the stand-in card.
OPTIONAL = {"Overflow": (r"estimate|range", r"measured model")}


def walk(run):
    page = run.new(1920, 1080)

    # ---- can I find it? From the home page and the pitch page, in two clicks at most ---------------
    found_from = []
    for name in ("home", "pitch"):
        run.goto(name)
        links = page.evaluate("""() => [...document.querySelectorAll('a[href], button')].filter(a => a.getBoundingClientRect().width)
            .map(a => (a.innerText + ' ' + (a.getAttribute('href') || '')).trim())""")
        if any(re.search(r"planner|worklist|routes? (that )?need|which routes", l, re.I) for l in links):
            found_from.append(name)
    run.check(bool(found_from), "pitch", "a visible link or button leads to the planner view (worklist) from the home or pitch page", "fix", "B",
              "no link names the planner or the worklist; the pitch navigation lists Film, Bus journey, The problem, Our answer, How it's built, Executive deck, the console and Dataiku")

    run.goto("pitch")
    wl = page.locator("#worklist")
    run.check(wl.count() == 1, "pitch", "the planner worklist exists", "blocker", "B")
    if wl.count():
        wl.scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        t = wl.inner_text()
        rows = page.locator("#worklist tbody tr").count()
        run.check(rows >= 5, "pitch", "the worklist lists at least five route-hours", "fix", "B", f"{rows} rows")
        heads = " ".join(page.locator("#worklist th").all_inner_texts())
        run.check(re.search(r"route", heads, re.I) and re.search(r"hour|time", heads, re.I) and re.search(r"min", heads + t, re.I), "pitch",
                  "the worklist gives route, hour and minutes needed", "fix", "B", heads)
        run.check(re.search(r"Dataiku|records|running_time|ledger|measured", t, re.I), "pitch", "the worklist names its source table", "fix", "B", t[-300:])
        run.check(re.search(r"STAND-IN|stand-in|invented", t) is None or re.search(r"STAND-IN DATA", t), "pitch",
                  "if the worklist is stand-in, it says STAND-IN DATA", "blocker", "B", t[-200:])

    # ---- the six watchers carry honest labels -------------------------------------------------
    sw = page.locator("#six-watchers")
    if sw.count():
        blocks = page.evaluate("""() => [...document.querySelectorAll('#six-watchers > *')].map(e => e.innerText)""")
        wrong = []
        for key, (ok_rx, bad_rx) in WATCHERS.items():
            blk = next((b for b in blocks if b.strip().lower().startswith(key.lower())), None) or next((b for b in blocks if key.lower() in b.lower()[:40]), "")
            head = blk[:120]
            if not blk:
                wrong.append(f"{key}: block not found")
            elif re.search(bad_rx, head, re.I) or not re.search(ok_rx, head, re.I):
                wrong.append(f"{key}: '{head.strip()[:90]}'")
        for key, (ok_rx, bad_rx) in OPTIONAL.items():  # if it comes back, it must carry its estimate label
            blk = next((b for b in blocks if b.strip().lower().startswith(key.lower())), "")
            if blk and (re.search(bad_rx, blk[:120], re.I) or not re.search(ok_rx, blk[:120], re.I)):
                wrong.append(f"{key}: '{blk.strip()[:90]}'")
        sw.scroll_into_view_if_needed()
        run.check(not wrong, "pitch", "each watcher shows its honest status (heat is a rule, lanes a rule and roadmap, connections a proposal)", "blocker", "B", wrong)
    else:
        run.check(False, "pitch", "the six watchers block exists", "fix", "B")

    # ---- heat and lanes in the deck: scenario words beside them --------------------------------
    for i, t, n in deck_slides(run):
        sentences = re.split(r"(?<=[.!?])\s+|\n", t)
        heat = [x for x in sentences if re.search(r"\bheat\b|bare pole|July", x, re.I)]
        wrong = [x for x in heat if re.search(r"\bmeasured\b", x, re.I)]
        if heat:
            run.page.goto(run.page.url.split("?")[0] + f"?s={i}&all")
            run.check(not wrong, "deck", f"slide {i}: no sentence calls heat measured", "blocker", "B", wrong)
        lane_pct = [x for x in sentences if re.search(r"\blanes?\b", x, re.I) and re.search(r"\d+\s?%", x)]
        if lane_pct:
            run.page.goto(run.page.url.split("?")[0] + f"?s={i}&all")
            run.check(re.search(r"Khaleej|RTA expects|expected|reported|RTA,? ", t, re.I) is not None, "deck",
                      f"slide {i}: the bus-lane percentages say they are RTA's expectation, with the source", "blocker", "B", lane_pct)

    # ---- the console's heat layer --------------------------------------------------------------
    run.goto("ops", settle=300)
    page.wait_for_selector("#map[data-ready=true]", timeout=30000)
    page.locator("#heat").click()
    page.wait_for_timeout(800)
    info = page.locator("#heat-info").inner_text()
    btn = page.locator("#heat").inner_text()
    run.check("july" in (info + btn).lower() and re.search(r"scenario", info + btn, re.I), "ops", "the heat layer says July scenario", "blocker", "A", f"{btn} | {info}")
    run.check(re.search(r"stand-in|simulated|scenario", info, re.I) and not re.search(r"\bmeasured\b", info, re.I), "ops",
              "the heat layer is never called measured", "blocker", "A", info)
    run.check(re.search(r"rule|priority", info, re.I) is not None, "ops", "the heat layer says its ranking is a priority rule, not a model", "polish", "A", info)
    lanes = re.findall(r"[^.\n]*\blanes?\b[^.\n]*", run.text(), re.I)
    run.check(all(not re.search(r"\bmeasured\b", l, re.I) for l in lanes), "ops", "bus lanes are never shown as measured on the console", "blocker", "A", lanes)
    run.check(not run.errors, "all", "no JavaScript errors", "fix", "A and B", run.errors[:4], shot=False)


if __name__ == "__main__":
    main(walk, "planner")
