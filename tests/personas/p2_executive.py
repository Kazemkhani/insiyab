"""Persona 2: RTA executive judge.

Goal: understand in eight minutes what changes for RTA and why to fund a pilot.
Fails them: jargon; numbers without sources; a claim from the banned list (docs/v2/STRATEGY.md section 7); no clear ask.
"""
import re

from common import BASE, EM_DASH, OWNER, banned_hits, deck_slides, main

JARGON = r"\b(MAE|RMSE|MAPE|conformal|Poisson|LightGBM|XGBoost|quantile|regressor|hyperparameter|cross-validation|feature importance|SHAP|R²|R2)\b"
SOURCE = (r"RTA|records|Dataiku|source|Khaleej|WAM|Media Office|press release|reports?\b|drill|published|told us|staff|"
          r"Bloomberg|National|LTA|UCLA|Springer|Niantic|meta\.json|measured|\b(19|20)\d\d\b|Photo")
# a number worth a source: not a year, not a clock time, not a slide counter
NUMBER = r"(?<![\d:])(?!(19|20)\d\d\b)\d[\d,.]*\s?(%|per cent|in 100|min|minutes|km|buses|routes|stops|trips|riders|passengers|boardings|bus hours|scenarios|shelters|poles)"
MAIN_SLIDES = 15  # 16 to 18 are backups for questions


def walk(run):
    run.new(1920, 1080)
    texts = {}
    for name in ("home", "pitch", "ops"):
        run.goto(name)
        texts[name] = run.text()
    slides = deck_slides(run)
    texts["deck"] = "\n".join(t for _, t, _ in slides)
    notes = "\n".join(f"[slide {i}] {n}" for i, _, n in slides)

    # ---- banned claims: on screen, then in what is said on stage --------------------------
    for name, txt in texts.items():
        if name == "deck":
            hits = [f"slide {i}: {h}" for i, t, _ in slides for h in banned_hits(t)]
            first = next((i for i, t, _ in slides if banned_hits(t)), 1)
            run.page.goto(f"{BASE}/pitch/deck/?s={first}&all")
            run.page.wait_for_timeout(400)
        else:
            hits = banned_hits(txt)
            run.goto(name)
        run.check(not hits, name, "no banned claim in the rendered text", "blocker", OWNER[name], hits, full=False)
    note_hits = []
    for i, _, n in slides:
        note_hits += [f"slide {i}: {h}" for h in banned_hits(n)]
    run.page.goto(run.page.url.split("?")[0] + "?s=10&all")
    run.check(not note_hits, "deck", "no banned claim in the speaker notes (what is said on stage)", "blocker", "B and E", note_hits, shot=False)

    for name, txt in texts.items():
        n = txt.count(EM_DASH)
        run.check(n == 0, name, "no em-dashes in prose (docs/RULES.md 1.1)", "polish", OWNER[name], f"{n} em-dashes", shot=False)

    # ---- the stage words match what the console really does -----------------------------
    before = re.compile(r"(not acknowledged[^.]{0,80}calls? (the )?driver|asks the driver, depot, station and planning at once, then phones)", re.I)
    mism = [f"{k}: '{m.group(0)}'" for k, t in list(texts.items()) + [("deck notes", notes)] for m in before.finditer(t)]
    run.check(not mism, "pitch", "the pitch says driver, depot, station and planning are contacted only after a person decides, as the console shows",
              "fix", "B and E", mism + ["CONSOLE-SPEC: 'The driver, the depot, the station and planning are called only after a person has decided'; "
                                        "the console demo keeps all four rows Waiting until the controller confirms"], shot=False)

    # ---- every number on a slide has a source on that slide ------------------------------
    unsourced = []
    for i, t, n in slides[:MAIN_SLIDES]:
        if re.search(NUMBER, t, re.I) and not re.search(SOURCE, t, re.I):
            unsourced.append(f"slide {i}: {re.search(NUMBER, t, re.I).group(0)!r} in '{t[:70]}'".replace("\n", " "))
    run.page.goto(run.page.url.split("?")[0] + (f"?s={unsourced[0].split()[1].rstrip(':')}&all" if unsourced else "?s=1"))
    run.page.wait_for_timeout(300)
    run.check(not unsourced, "deck", "every slide that shows a number names its source on the slide", "fix", "B", unsourced)

    # ---- jargon on the slides a judge sees first ------------------------------------------
    jar = []
    for i, t, _ in slides[:MAIN_SLIDES]:
        found = sorted(set(m.group(0) for m in re.finditer(JARGON, t)))
        if found:
            jar.append(f"slide {i}: {', '.join(found)}")
    run.check(len(jar) <= 1, "deck", "technical terms stay on at most one main slide (the model slide)", "polish", "B", jar, shot=False)
    run.goto("pitch")
    hero = run.page.locator("header, #film, section").first.inner_text()
    found = sorted(set(m.group(0) for m in re.finditer(JARGON, hero)))
    run.check(not found, "pitch", "no technical terms in the first screen of the pitch page", "polish", "B", found)

    # ---- a clear, bounded ask --------------------------------------------------------------
    close = next((t for i, t, _ in slides if re.search(r"eight weeks", t, re.I)), "")
    run.check(all(re.search(w, close, re.I) for w in (r"one (control-centre )?shift", "selected", "eight weeks")), "deck",
              "the deck carries the pilot ask: one shift, selected evening routes, eight weeks", "blocker", "B", close[:300], shot=False)
    run.check(re.search(r"eight weeks|8 weeks", texts["pitch"], re.I) is not None, "pitch", "the pitch page states the pilot ask", "fix", "B", shot=False)
    measures = re.search(r"controller minutes|departures leaving late|caught before", close, re.I)
    run.check(measures is not None, "deck", "the ask says what the pilot will measure", "fix", "B", close[:300], shot=False)
    dss = next((t for i, t, _ in slides if "Decision Support" in t), "")
    run.check(re.search(r"proposal|not connected|not tested", dss, re.I) is not None, "deck",
              "the DSS slide says it is a proposal, not connected", "blocker", "B", dss[:300], shot=False)

    # ---- eight minutes ---------------------------------------------------------------------
    secs = sum(int(m.group(1)) for _, _, n in slides[:MAIN_SLIDES] if (m := re.search(r"(\d+) s\b", n)))
    run.check(secs + 40 <= 480, "deck", "planned timing (speaker notes + 40 s film) fits eight minutes", "blocker", "B and E",
              f"{secs} s of slides + 40 s film = {secs + 40} s", shot=False)

    # ---- the prototype says what it is, on every page -------------------------------------
    for name, txt in texts.items():
        ok = re.search(r"student prototype|RTA Future Move Hackathon", txt, re.I) is not None
        run.check(ok, name, "the page says it is a student prototype for the RTA Future Move Hackathon (docs/RULES.md 4.2)", "fix", OWNER[name], shot=False)
    for name in ("home", "ops"):  # the two pages that load the engine bundle deploy.json describes
        run.goto(name)
        if run.deploy.get("fixture"):
            run.check("STAND-IN DATA" in run.text(), name, "the deploy runs on stand-in data and the page says STAND-IN DATA",
                      "blocker", OWNER[name], f"deploy.json fixture={run.deploy.get('fixture')}")
    run.check(not run.errors, "all", "no JavaScript errors", "fix", "A and B", run.errors[:4], shot=False)


if __name__ == "__main__":
    main(walk, "executive")
