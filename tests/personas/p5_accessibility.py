"""Persona 5: accessibility and phone visitor (scans the QR on a phone, uses a screen reader, asks for reduced motion).

Goal: read the site on a phone.
Fails them: overflow at 390 px; contrast under 4.5:1; motion that ignores reduced motion; images without alt text.
Also checks overflow at 1920x1080, 44 px touch targets (docs/RULES.md 5.5) and the page language.
"""
from common import ALT_JS, CONTRAST_JS, MOTION_JS, OVERFLOW_JS, OWNER, TARGETS_JS, main, redirected_pages

ORDER = ("pitch", "home", "deck", "ops")  # the QR on the closing slide opens /pitch/


def walk(run):
    global ORDER
    gone = redirected_pages(run)
    for name, loc in gone.items():
        print(f"NOTE {name} redirects to {loc}: not walked separately", flush=True)
    ORDER = tuple(n for n in ORDER if n not in gone)
    # ---- overflow at the two sizes the brief names -----------------------------------------
    for w, h, mobile in ((390, 844, True), (1920, 1080, False)):
        run.new(w, h, reduced=True, mobile=mobile)
        for name in ORDER:
            resp = run.goto(name)
            if name == "ops":
                try:
                    run.page.wait_for_selector("#map[data-ready=true]", timeout=20000)
                except Exception:
                    pass
            run.check(resp is not None and resp.status == 200, name, f"loads at {w}x{h}", "blocker", OWNER[name], resp.status if resp else "no response")
            o = run.page.evaluate(OVERFLOW_JS)
            sev = "blocker" if (w == 390 and name == "pitch") else "fix"
            run.check(o["scroll"] <= o["width"] + 1, name, f"no sideways scroll at {w}x{h}", sev, OWNER[name],
                      f"scrollWidth {o['scroll']} > {o['width']}; {o['offenders']}", full=True)

    # ---- the phone visitor, reduced motion on ---------------------------------------------------
    run.new(390, 844, reduced=True, mobile=True)
    for name in ORDER:
        run.goto(name, settle=2500)
        lang = run.page.evaluate("document.documentElement.lang")
        run.check(bool(lang), name, "the page declares its language for screen readers", "fix", OWNER[name], f"lang='{lang}'", shot=False)
        run.check(bool(run.page.title().strip()), name, "the page has a title", "polish", OWNER[name], shot=False)
        bad = run.page.evaluate(CONTRAST_JS)
        run.check(not bad, name, "text contrast at least 4.5:1 (3:1 for large text) at 390 px", "fix", OWNER[name], "; ".join(bad[:6]))
        alt = run.page.evaluate(ALT_JS)
        run.check(not alt, name, "every image and control has a text alternative", "fix", OWNER[name], alt[:8], shot=False)
        tgt = run.page.evaluate(TARGETS_JS)
        run.check(not tgt, name, "every control is at least 44x44 px on a phone (docs/RULES.md 5.5)", "fix", OWNER[name], tgt[:10])
        m = run.page.evaluate(MOTION_JS)
        loops = [a for a in m["running"] if a.get("iter") in (None, float("inf")) or str(a.get("iter")) in ("Infinity", "inf")]
        run.check(not m["videos"], name, "with reduced motion asked for, no video plays by itself", "fix", OWNER[name], m["videos"])
        run.check(not loops, name, "with reduced motion asked for, nothing animates in a loop", "fix", OWNER[name], loops[:6])
        run.check(len(m["running"]) == 0, name, "with reduced motion asked for, no animation is running a second after load", "polish", OWNER[name], m["running"][:6], shot=False)
        if name == "pitch":
            static = run.page.evaluate("() => { const d = document.querySelector('#descent'); return d ? d.classList.contains('static-story') : null }")
            run.check(static is not False, "pitch", "reduced motion switches the scroll story to static chapters", "fix", "B", f"static-story={static}")
        if name == "deck":
            st = run.page.evaluate("() => { const r = document.querySelector('#stage').getBoundingClientRect(); return {left: r.left, right: r.right, vw: document.documentElement.clientWidth}; }")
            run.check(st["left"] >= -1 and st["right"] <= st["vw"] + 1, "deck", "the slide fits the phone screen (nothing cut off at the sides)", "fix", "B",
                      f"stage spans {st['left']:.0f} to {st['right']:.0f} px on a {st['vw']} px screen")
            size = run.page.evaluate("""() => { const e = document.querySelector('.slide.on h1, .slide.on h2, .slide.on p'); const st = document.querySelector('#stage');
                if (!e || !st) return 0; return parseFloat(getComputedStyle(e).fontSize) * st.getBoundingClientRect().width / 1920; }""")
            run.check(size >= 16, "deck", "the deck's first slide text is at least 16 effective px on a phone", "polish", "B", f"{size:.1f}px")

    # ---- reduced motion actually changes something --------------------------------------------
    run.new(390, 844, reduced=False, mobile=True)
    run.goto("pitch", settle=2500)
    moving = run.page.evaluate(MOTION_JS)
    run.new(390, 844, reduced=True, mobile=True)
    run.goto("pitch", settle=2500)
    still = run.page.evaluate(MOTION_JS)
    run.check(len(still["running"]) + len(still["videos"]) <= len(moving["running"]) + len(moving["videos"]), "pitch",
              "reduced motion never adds motion", "polish", "B", f"normal {moving}, reduced {still}", shot=False)
    run.check(not run.errors, "all", "no JavaScript errors on a phone", "fix", "A and B", run.errors[:4], shot=False)


if __name__ == "__main__":
    main(walk, "accessibility")
