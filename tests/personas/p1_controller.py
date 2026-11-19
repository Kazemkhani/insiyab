"""Persona 1: RTA bus controller, night shift, ten years in the job.

Goal: use /ops/ to handle the route 310 alert in under a minute.
Fails them: cannot tell what to do first; text too small at 3 m; a state that lies (Received without a reply);
anything that implies the AI decided. Covers docs/v2/CONSOLE-SPEC.md "Must never happen" 1, 2, 3, 5 and part of 4.
"""
import time

from common import (BASE, CONTRAST_JS, SMALL_TEXT_JS, banned_hits, main, numbers_without_label)

P = "ops"
TEAL = "rgb(46, 125, 107)"  # Deep Teal #2E7D6B (brand/assets/tokens.css), reserved for a verified acknowledgement


def status_rows(page):
    return page.evaluate("""() => [...document.querySelectorAll('[data-role]')].map(e => ({role: e.dataset.role,
        status: e.dataset.status, text: e.innerText, color: getComputedStyle(e).color}))""")


def snapshot(page):
    return page.evaluate("""() => ({phase: document.querySelector('#calls').dataset.phase,
        band: !document.querySelector('#escalation').hidden && document.querySelector('#escalation').getBoundingClientRect().height > 0,
        bandText: document.querySelector('#escalation').innerText,
        stamp: [...document.querySelectorAll('.decision-stamp')].map(e => e.innerText).join(' '),
        roles: [...document.querySelectorAll('[data-role]')].map(e => e.dataset.status)})""")


def ready(run, query=""):
    run.goto(P, query, settle=300)
    run.page.wait_for_selector("#map[data-ready=true]", timeout=30000)


def walk(run):
    page = run.new(1920, 1080)
    ready(run)

    # ---- first glance: what do I do first? -------------------------------------------------
    run.check(page.locator("#fixture-banner").is_visible(), P, "stand-in alerts are labelled on the console", "blocker", "A")
    now = page.locator("#now")
    box = now.bounding_box() or {"y": 9999, "height": 0}
    run.check(box["y"] + box["height"] <= 1080, P, "the open alert is fully on screen at 1920x1080 without scrolling", "fix", "A", box)
    nt = now.inner_text()
    run.check("310" in nt and "late" in nt.lower(), P, "the NOW panel names the route and the risk", "blocker", "A", nt[:200])
    headline = page.evaluate("""() => { const els = [...document.querySelectorAll('#now *')].filter(e => /likely .* late/i.test(e.innerText) && e.children.length === 0);
        return els.length ? parseFloat(getComputedStyle(els[0]).fontSize) : 0; }""")
    run.check(headline >= 28, P, "the risk line is at least 28 px (readable from 3 m on a wall screen)", "fix", "A", f"{headline}px")
    small = page.evaluate(SMALL_TEXT_JS, 14)
    run.check(not small, P, "no visible text under 14 px at 1920x1080 (control-room distance)", "fix", "A", "; ".join(small))
    side = page.evaluate("""() => { const sizes = []; for (const s of ['#now', '#suggested', '#calls']) { const w = document.createTreeWalker(document.querySelector(s), NodeFilter.SHOW_TEXT);
        while (w.nextNode()) { if (w.currentNode.textContent.trim().length > 1) { const e = w.currentNode.parentElement; if (e.getBoundingClientRect().width) sizes.push(parseFloat(getComputedStyle(e).fontSize)); } } }
        sizes.sort((a, b) => a - b); return sizes[Math.floor(sizes.length / 2)] || 0; }""")
    run.check(side >= 18, P, "median text size in the decision column is at least 18 px", "polish", "A", f"median {side}px")
    contrast = page.evaluate(CONTRAST_JS)
    run.check(not contrast, P, "every text on the console meets WCAG AA contrast", "fix", "A", "; ".join(contrast[:6]))

    # Before Demo mode, the panel already invites a choice but the options are disabled.
    prompt = page.locator("#confirmation").inner_text()
    enabled = page.locator("[data-option]").first.is_enabled()
    run.check(enabled or "choose an option" not in prompt.lower(), P,
              "before the demo starts, the console does not ask for a choice it will not accept", "fix", "A",
              f"prompt '{prompt}' while every option button is disabled until Demo mode is pressed")

    # ---- Must never happen 5: no option labelled as recommended by the AI ----------------
    ops_text = page.locator("body").inner_text()
    hits = [h for h in banned_hits(ops_text) if h.split(":")[0] in ("AI decides", "recommended by the AI")]
    run.check(not hits and "recommend" not in ops_text.lower(), P, "no option is labelled as recommended or decided by the AI", "blocker", "A", hits)
    run.check("simulated pick" in page.locator("#options").inner_text().lower(), P, "the RTA system pick is labelled simulated", "blocker", "A")

    # ---- Must never happen 4 (console half): simulated numbers are labelled ----------------
    run.check(any(w in nt.lower() for w in ("stand-in", "simulated")), P, "the alert's numbers carry stand-in or simulated beside them", "blocker", "A", nt[-160:])
    effects = page.locator(".option-effect").all_inner_texts()
    run.check(effects and all("estimate" in e.lower() for e in effects), P, "every likely effect says estimate", "blocker", "A", effects)
    run.check("°" not in ops_text or "july" in ops_text.lower(), P, "no temperature appears without the July scenario label (December is not a heat emergency)", "blocker", "A")
    unlabelled = []
    for sel in ("#now", "#suggested", "#calls", "#judge-pick", "#next"):
        unlabelled += numbers_without_label(page, sel)
    run.check(not unlabelled, P, "every number on the console has a word beside it", "fix", "A", unlabelled)

    # ---- Run A: decide early. Under a minute, two clicks, receipts only after the decision ----
    timeline = []
    page.locator("#demo").click()
    t0 = time.monotonic()
    page.wait_for_function("!document.querySelector('[data-option=send_spare]').disabled", timeout=15000)
    t_enabled = time.monotonic() - t0
    page.locator("[data-option=send_spare]").click()
    page.wait_for_timeout(600)
    s = snapshot(page)
    run.check(not s["stamp"] and s["phase"] not in ("decided", "relaying", "sent", "received"), P,
              "one click on an option does not decide (Must never happen 1)", "blocker", "A", s)
    run.check(page.locator("#confirm").is_visible(), P, "a separate confirm control appears after choosing", "blocker", "A")
    page.locator("#confirm").click()
    t_decided = time.monotonic() - t0
    deadline = t0 + 60
    while time.monotonic() < deadline:
        s = snapshot(page)
        s["t"] = round(time.monotonic() - t0, 1)
        if not timeline or {k: v for k, v in s.items() if k != "t"} != {k: v for k, v in timeline[-1].items() if k != "t"}:
            timeline.append(s)
        if all(r == "received" for r in s["roles"]):
            break
        page.wait_for_timeout(200)
    t_done = time.monotonic() - t0
    run.check(t_decided < 60 and all(r == "received" for r in s["roles"]), P,
              "a controller can decide and see all four receipts within one minute of pressing Demo mode", "fix", "A",
              f"options enabled at {t_enabled:.1f}s, decided at {t_decided:.1f}s, four receipts at {t_done:.1f}s")
    stamp = page.locator(".decision-stamp").all_inner_texts()
    run.check(any("controller" in x.lower() for x in stamp), P, "the decision is stamped as the controller's, with a time", "blocker", "A", stamp)
    early = [x for x in timeline if "received" in x["roles"] and not x["stamp"]]
    run.check(not early, P, "no role shows Received before the controller's decision (Must never happen 2)", "blocker", "A", early[:2])
    lies = [x for x in timeline if x["stamp"] and x["band"]]
    run.check(not lies, P, "the 'Not acknowledged' band disappears once the controller has decided", "blocker", "A",
              f"band visible after decision at t={lies[0]['t']}s: '{lies[0]['bandText']}'" if lies else "")
    rows = status_rows(page)
    teal_wrong = [r for r in rows if r["color"] == TEAL and r["status"] != "received"]
    received_ok = [r for r in rows if r["status"] == "received"]
    run.check(not teal_wrong, P, "teal is used only on rows that received", "blocker", "A", teal_wrong)
    run.check(all(r["color"] == TEAL for r in received_ok), P, "Received is shown in teal", "polish", "A", [(r["role"], r["color"]) for r in received_ok])
    run.check(all(any(c.isdigit() for c in r["text"]) for r in received_ok), P, "each Received carries the time it was received", "fix", "A", [r["text"] for r in received_ok])
    run.check(all("received" in r["text"].lower() for r in received_ok), P, "a received row says Received in words, not colour alone", "blocker", "A", [r["text"] for r in received_ok])

    # ---- Run B: nobody touches it. It must never decide by itself ------------------------
    page = run.new(1920, 1080)
    ready(run)
    page.locator("#demo").click()
    t0 = time.monotonic()
    page.wait_for_function("document.querySelector('#escalation') && !document.querySelector('#escalation').hidden", timeout=15000)
    band = page.locator("#escalation")
    run.check("not acknowledged" in band.inner_text().lower(), P, "an unacknowledged critical alert shows the countdown band", "fix", "A", band.inner_text())
    phases = set()
    selfdecided = None
    called_early = None
    while time.monotonic() - t0 < 80:
        s = snapshot(page)
        phases.add(s["phase"])
        if s["stamp"] or "received" in s["roles"]:
            selfdecided = s
            break
        if called_early is None and any(r != "waiting" for r in s["roles"]):
            called_early = s
        if s["phase"] == "calling_supervisor":
            break
        page.wait_for_timeout(500)
    run.check(selfdecided is None, P, "with no click, the console never decides or relays by itself", "blocker", "A", selfdecided)
    run.check("calling_duty" in phases, P, "with no acknowledgement, it escalates to the duty controller (simulated)", "fix", "A", sorted(phases))
    duty_text = page.locator("body").inner_text().lower()
    run.check(not called_early, P,
              "no role (driver, depot, station, planning) is called before a person decides; only decision-makers are phoned", "fix", "A",
              called_early)
    if "calling_supervisor" in phases or page.locator("#calls").get_attribute("data-phase") == "calling_supervisor":
        page.locator("[data-option=hold]").click()
        page.wait_for_timeout(800)
        run.check(not page.locator(".decision-stamp").count(), P, "during escalation one click alone still does not decide", "blocker", "A")
    run.check("simulated" in duty_text, P, "the escalation call is labelled simulated in demo mode", "blocker", "A")

    # ---- Must never happen 3: no call from demo mode or from a visitor without the key --------
    for q in ("?stage=1", "?live=1", "#live", "?mode=live", "#key=wrong"):
        page = run.new(1920, 1080)
        ready(run, q)
        for b in ("#demo", "#replay"):
            if page.locator(b).is_visible():
                page.locator(b).click()
        page.wait_for_timeout(15000)
    voice = [b for b in run.blocked if "/voice/" in b]
    writes = [b for b in run.blocked if not b.startswith("GET") and "/voice/" not in b]
    run.check(not voice, P, "no request to /voice/ from demo mode or from a visitor without the presenter key (Must never happen 3)", "blocker", "A", voice)
    run.check(not writes, P, "the console makes no write request of any kind for a visitor", "blocker", "A", writes)
    run.check(not run.errors, P, "no JavaScript errors on the console", "fix", "A", run.errors[:4])


if __name__ == "__main__":
    main(walk, "controller")
