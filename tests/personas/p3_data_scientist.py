"""Persona 3: Dataiku data scientist judge.

Goal: trust the model.
Fails them: no baseline; no ranges; train/test leakage; losses hidden; "15%" and "+46" mixed up.
Also stream G's extra task: every number on the console and the deck traces to a named table, docs/v2/FACTS.md,
docs/v2/STRATEGY.md or the model card. Numbers that do not are listed for the report.
"""
import re

from common import HERE, deck_slides, main

REPO = HERE.parents[1]
REAL = {"8.25", "7.42", "7.31", "6.97"}
RMSE = {"12.57", "11.62", "11.47", "10.76"}
MAPE = {"10.5", "9.3", "9.0"}
NUM = re.compile(r"(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.:])\d+(?:\.\d+)?(?![\d:])")


def known_numbers():
    src = ""
    for p in ("docs/v2/FACTS.md", "docs/v2/STRATEGY.md", "docs/MODEL-CARD.md", "docs/v2/PITCH.md", "docs/v2/CONTRACT-V2.md"):
        f = REPO / p
        if f.exists():
            src += f.read_text()
    return {n.replace(",", "") for n in NUM.findall(src)}


def untraced(text, known):
    text = re.sub(r"CC BY(-SA|-ND|-NC)*\s?\d\.\d", "", text)  # licence versions are not figures
    out = []
    for n in NUM.findall(text):
        k = n.replace(",", "")
        if k in known or len(k) <= 1 or re.fullmatch(r"(19|20)\d\d", k):
            continue
        out.append(n)
    return sorted(set(out), key=lambda x: float(x.replace(",", "")))


def walk(run):
    page = run.new(1920, 1080)
    run.goto("pitch")
    pitch = run.text()
    acc = page.locator("#tb-acc")
    acc_text = acc.inner_text() if acc.count() else ""
    if acc.count():
        acc.scroll_into_view_if_needed()
        page.mouse.wheel(0, 200)  # a real scroll lets the section reveal itself before any screenshot
        page.wait_for_timeout(1800)

    # ---- baseline and the real result ---------------------------------------------------
    run.check(REAL <= set(re.findall(r"\d+\.\d+", acc_text)), "pitch", "the accuracy table shows all four methods (timetable 8.25, simple rule 7.42, linear 7.31, trees 6.97)",
              "blocker", "B", acc_text[:400])
    run.check(re.search(r"timetable", acc_text, re.I) and re.search(r"simple rule|naive", acc_text, re.I), "pitch",
              "the naive forecast and the timetable sit beside the model", "blocker", "B", acc_text[:300])
    run.check(RMSE <= set(re.findall(r"\d+\.\d+", pitch)) and MAPE <= set(re.findall(r"\d+\.\d+", pitch)), "pitch",
              "RMSE and MAPE are shown, not only MAE", "fix", "B", sorted(RMSE | MAPE - set(re.findall(r"\d+\.\d+", pitch))))
    run.check("2,043" in pitch and re.search(r"held-out|never seen|did not see", pitch, re.I), "pitch",
              "the test set is named: 2,043 held-out evening trips the model never saw", "blocker", "B")

    # ---- losses visible ------------------------------------------------------------------
    run.check(re.search(r"(from|after) 19:00[^.]{0,40}timetable|after seven", pitch, re.I) and re.search(r"simple rule[^.]{0,60}(wins|closer)|past the simple rule", pitch, re.I), "pitch",
              "the losses are shown: little gain over the simple rule; from 19:00 the timetable is as close", "fix", "B and C")
    pcts = sorted(set(re.findall(r"\b(1[56])% closer", pitch + "\n" + acc_text)))
    run.check(len(pcts) <= 1, "pitch", "the headline gain is one number on one screen (15% or 16%, not both)", "fix", "B",
              f"pitch shows {', '.join(p + '% closer' for p in pcts)}: 1 - 6.97/8.25 = 15.5%; the deck and the stage say 15%")
    cites = re.findall(r"Source: MODEL-CARD\.md[^\n]*", pitch)
    card = (REPO / "docs/MODEL-CARD.md").read_text()
    bad = cites and not ("6.97" in card and "8.25" in card and "STAND-IN DATA, NOT A RESULT" not in card[:600])
    run.check(not bad, "pitch", "the headline trip-time result cites a source that contains it and is not stand-in", "blocker", "B and C",
              f"pitch says '{cites[0] if cites else ''}'; docs/MODEL-CARD.md has no 6.97 or 8.25 and opens with 'STAND-IN DATA, NOT A RESULT'. "
              "Cite the Dataiku table running_time_metrics (already named under the table) or opendata/onday/HOW-IT-CONNECTS.md")

    # ---- 15% and the stand-in +46 never mixed ----------------------------------------------
    run.goto("deck", "?s=7&all")
    slides = deck_slides(run)
    deck = "\n".join(t for _, t, _ in slides)
    notes = "\n".join(n for _, _, n in slides)
    run.goto("ops")
    ops = run.text()
    run.goto("home")
    home = run.text()
    mixed = re.compile(r"15 in 100|\b4[236]\s?%|\+\s?1[05]\b|1[05] in 100 closer|15% (fewer|less) (late|delay)|delays? (fell|down|cut)[^.]{0,20}15")
    for name, t in (("pitch", pitch), ("deck", deck), ("deck notes", notes), ("ops", ops), ("home", home)):
        hits = [m.group(0) for m in mixed.finditer(t)
                if not re.search(r"(never|do not|don't|not) say[^.]{0,20}$", t[max(0, m.start() - 40):m.start()], re.I)]
        run.check(not hits, name.split()[0], f"'15% closer' is never turned into an 'in 100' figure or a delay cut ({name})", "blocker",
                  {"ops": "A", "home": "lane 1 (web/)"}.get(name, "B"), hits, shot=False)
    # The home page shows the engine's stand-in lateness and boarding output: it must say so on the same screen.
    stand = re.findall(r"[^.\n]*(in 100 closer|closer than the best simple rule)[^.\n]*", home, re.I)
    run.check(not stand or "STAND-IN DATA" in home, "home", "any forecast claim on the home page is labelled stand-in", "blocker", "lane 1 (web/)", stand, shot=False)

    # ---- two statistics of the same signal, side by side ------------------------------------
    both = ("589 of 945" in pitch) and re.search(r"85 in 100|85 times in 100", pitch)
    run.check(not both, "pitch", "the bus-still-out signal is given one way, or both ways are explained",
              "fix", "B", "pitch shows '589 of 945 late starts with the bus still out' (62%, late given still out) and "
                          "'late 85 in 100 when still out (696)' (late given still out). 589/945 reads as a second, lower rate for the same signal.", shot=False)

    # ---- ranges -----------------------------------------------------------------------------
    rng = re.search(r"range[^.]{0,80}(in 100|%)|\b\d+ to \d+ min", pitch + deck, re.I)
    run.check(rng is not None, "pitch", "the trip-time forecast shows a range or interval, not only a point", "fix", "C and B",
              "no range for the real trip-time forecast on the pitch page or deck; the console's range (8 to 17 min) is stand-in", shot=False)

    # ---- leakage, as far as the screen can show it --------------------------------------------
    run.check(re.search(r"by route|routes? (it|the model) (never|did not)|held-out routes|split by (route|time)|untouched", pitch + deck + notes, re.I),
              "pitch", "how the held-out trips were kept apart is stated (time split, route split)", "fix", "C and B",
              "the screen says 'never seen' but not how: by time, by route, or random. A data scientist will ask about leakage.", shot=False)

    # ---- the boarding forecast is not oversold ----------------------------------------------------
    b = re.findall(r"[^.\n]*boarding forecast[^.\n]*", pitch + deck + notes, re.I)
    run.check(all(not re.search(r"beat|better than|outperform", s, re.I) for s in b), "pitch", "the boarding forecast is never claimed to beat the simple rule", "blocker", "B", b, shot=False)

    # ---- the judge picker -------------------------------------------------------------------------
    run.goto("ops", settle=300)
    page.wait_for_selector("#map[data-ready=true]", timeout=30000)
    jp = page.locator("#judge-pick")
    routes = page.locator("#judge-route option").all_inner_texts()
    hours = page.locator("#judge-hour option").all_inner_texts()
    seen_loss = False
    for r in routes:
        for h in hours:
            page.locator("#judge-route").select_option(label=r)
            page.locator("#judge-hour").select_option(label=h)
            page.wait_for_timeout(80)
            t = jp.inner_text()
            if re.search(r"simple rule was closer|rule was closer", t, re.I):
                seen_loss = True
    run.check(seen_loss, "ops", "the judge picker shows a route-hour where the simple rule wins (losses not hidden)", "fix", "A", shot=False)
    jtxt = jp.inner_text()
    run.check("STAND-IN" not in jtxt.upper(), "ops", "the judge picker shows real held-out forecasts, not stand-in rows", "fix", "C and A", jtxt[-260:])

    # ---- traceability: every number on the console and the deck --------------------------------------
    known = known_numbers()
    run.goto("ops", settle=300)
    ops_un = untraced(run.text(), known)
    run.check(not ops_un, "ops", "every number on the console traces to FACTS, STRATEGY, the model card or the contract", "fix", "A", ops_un, shot=False)
    deck_un = {}
    for i, t, _ in slides[:15]:
        u = untraced(t, known)
        if u:
            deck_un[i] = u
    run.check(not deck_un, "deck", "every number on the main slides traces to FACTS, STRATEGY, the model card or the contract", "fix", "B",
              "; ".join(f"slide {k}: {', '.join(v)}" for k, v in deck_un.items()), shot=False)


if __name__ == "__main__":
    main(walk, "data_scientist")
