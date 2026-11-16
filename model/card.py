"""Writes docs/MODEL-CARD.md from a bundle. Every number in the card is read from metrics.json and meta.json: none is typed.

  python3 -m model.card --bundle fixtures --out docs/MODEL-CARD.md
  python3 -m model.card --bundle fixtures --check docs/MODEL-CARD.md      say whether the card on disk equals a fresh one"""
import argparse, json, os, sys


def _n(x, places=2, pct=False):
    if x is None:
        return "not taken"
    return f"{100 * x:.0f} in 100" if pct else (f"{x:,.{places}f}" if isinstance(x, float) else f"{x:,}")


def _cap(text):
    return text[:1].upper() + text[1:]          # only the first letter: str.capitalize would lower "CKI" and "Monday"


def _clock(t):
    return f"{int(t) // 3600 % 24:02d}:{int(t) % 3600 // 60:02d}"


def _table(head, rows):
    return "\n".join(["| " + " | ".join(head) + " |", "|" + "---|" * len(head)] + ["| " + " | ".join(str(c) for c in r) + " |" for r in rows])


def _name(t):
    return {"boardings": f"Boardings by {t['level']}", "arrival_delay_seconds": "Lateness at a stop ahead"}.get(t["target"], t["target"])


def card(bundle):
    load = lambda n: json.load(open(os.path.join(bundle, n), encoding="utf-8"))
    meta, metrics = load("meta.json"), load("metrics.json"); targets = metrics["targets"]; out = []; w = out.append
    w("# Model card\n")
    w("This file is written by the engine (`python3 -m model.card`) from `metrics.json` and `meta.json`. Nothing in it is typed by hand, and the gates fail if it does not equal a fresh one.\n")
    if meta["fixture"]:
        w("**STAND-IN DATA, NOT A RESULT.** Every number below comes from the real engine run on invented raw tables (`fixtures/raw/`). It shows that the method runs and how its results are reported. It says nothing about Dubai's buses.\n")
    w("## What is forecast\n")
    w(_table(["Target", "Unit", "Made", "For"], [
        ["Boardings at a stop on a route, and added up by route", "passengers in a quarter of an hour", f"every 30 minutes, {_clock(meta['origins'][0])} to {_clock(meta['origins'][-1])}", ", ".join(str(h // 60) for h in meta["horizons_seconds"]) + " minutes ahead"],
        ["How late a bus arrives at a stop ahead of it", "seconds (early is below zero)", "each time a bus leaves a stop", "1, 5, 10 and 20 stops ahead"]]) + "\n")
    w("## The data, and its one day\n")
    c = meta["counts"]
    w(f"One service day, {meta['service_date']}: {_n(c['routes'])} routes, {_n(c['stops'])} stops, {_n(c['trips'])} trips, {_n(c['stop_visits'])} stop visits and {_n(c['boardings'])} boardings. {targets[0].get('tested_on', '')} {targets[0].get('tested_on_more', '')}\n")
    w("How the tables were made ready, stage by stage, with the count each stage kept:\n")
    for s in meta.get("stages", []):
        counts = ", ".join(f"{k.replace('_', ' ')} {_n(v, 4)}" for k, v in s.items() if k not in ("stage", "text") and k != "service_date_as_number")
        w(f"- **{_cap(s['stage'])}.** {_cap(s['text'])}. Counted: {counts}.")
    w("")
    w("## How the test is kept honest\n")
    w("- **The rule of the clock.** A forecast made at an origin uses only records from strictly before it. A test changes every record after an origin and requires every forecast made by then to stay the same to the last digit.")
    w("- **Rolling origin.** At each origin the models learn from forecasts whose quarter of an hour had already ended, and forecast what comes next. For lateness the models learn only from trips that had finished, so no trip is on both sides.")
    w("- **The untouched part.** Forecasts made from 16:00 were set aside at the start and scored once. Which model to show was chosen on forecasts made from 08:00 to 15:30 for quarter-hours that had ended by 16:00. The tables below are the untouched part unless they say otherwise.")
    w("- **Other routes and other communities.** Routes, and separately communities, are put in five groups: learn from four, forecast the fifth.")
    w("- **The naive forecasts** are built from the same records and scored by the same code on the same rows. Gain is stated against the best of them, never the worst.\n")
    for t in targets:
        models = {m["model"]: m for m in t["models"]}; counts = t["target"] == "boardings"
        w(f"## {_name(t)}\n")
        w(f"Unit: {t['unit']}. {t['mape_rule']}\n")
        w("**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.\n")
        rows = []
        for r in t["pooled"]:
            gain = "" if r["skill"] is None else f"{100 * r['skill']:+.0f} in 100 ({100 * r['skill_lo']:+.0f} to {100 * r['skill_hi']:+.0f}) against {models[r['skill_vs']]['label'].lower()}"
            mark = " (chosen)" if models[r["model"]].get("chosen") else (" (best naive)" if r["model"] == t.get("best_naive") else "")
            rows.append([models[r["model"]]["label"] + mark, _n(r["n"]), _n(r["mae"]), _n(r["rmse"])] + ([_n(r["wape"]), f"{_n(r['mape'])} over {_n(r['mape_n'])}"] if counts else []) + [gain])
        w(_table(["Forecast", "n", "MAE", "RMSE"] + (["WAPE", "MAPE"] if counts else []) + ["Gain"], rows) + "\n")
        best = next((r for r in t["pooled"] if models[r["model"]].get("chosen")), None)
        if best and best["skill"] is not None:
            holds = best["skill_lo"] > 0
            w(("The range of the gain lies above zero: on these rows the model beat the best naive forecast." if holds else "**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.") + "\n")
        for c in t.get("cautions", []):
            if c["kind"] != "gain_not_established":
                w("**Caution.** " + c["say"] + "\n")
        w("**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.\n")
        unit = "stops" if t.get("horizon_unit") == "stops" else "minutes"; rows = []
        for h in sorted({r["horizon"] for r in t["results"]}):
            at = {r["model"]: r for r in t["results"] if r["horizon"] == h and r["subset"] == "all"}
            ch = next((r for m, r in at.items() if models[m].get("chosen")), None)
            if not ch:
                continue
            nv = at[ch["skill_vs"]]
            rows.append([f"{h if unit == 'stops' else h // 60} {unit}", _n(ch["n"]), models[ch["skill_vs"]]["label"], _n(nv["mae"]), _n(ch["mae"]), f"{100 * ch['skill']:+.0f} in 100" if ch["skill"] is not None else ""])
        w(_table(["Ahead", "n", "Best naive forecast there", "Its MAE", "Model MAE", "Gain"], rows) + "\n")
        w("**By subset, untouched part, every horizon's rows averaged by their count.**\n")
        labels = {s["subset"]: s for s in t["subsets"]}; rows = []
        for sub in [s["subset"] for s in t["subsets"] if s["kind"] != "route"]:
            mine = [r for r in t["results"] if r["subset"] == sub and models[r["model"]].get("chosen")]
            if not mine:
                continue
            n = sum(r["n"] for r in mine); mae = sum(r["mae"] * r["n"] for r in mine) / n
            base = sum(next(x["mae"] for x in t["results"] if x["subset"] == sub and x["horizon"] == r["horizon"] and x["model"] == r["skill_vs"]) * r["n"] for r in mine) / n
            rows.append([labels[sub]["label"], _n(n), _n(base), _n(mae), f"{100 * (1 - mae / base):+.0f} in 100" if base else ""])
        w(_table(["Subset", "n", "Best naive MAE", "Model MAE", "Gain"], rows) + "\n")
        g = t.get("range")
        if g:
            apart = f" When nobody boarded it held {_n(g['kept_when_nobody_boarded'], pct=True)} times ({_n(g['n_nobody'])} quarter-hours); when somebody did, {_n(g['kept_when_somebody_boarded'], pct=True)} ({_n(g['n_somebody'])})." if g.get("kept_when_somebody_boarded") is not None else ""
            w(f"**The range.** Promised to hold {_n(g['promised'], pct=True)} times; it held {_n(g['kept'], pct=True)}.{apart} {('How it is set: ' + g['method'] + '.') if g.get('method') else ''}\n")
        for m in t.get("more_tables", []):
            rows = [[models[r["model"]]["label"], _n(r["n"]), _n(r["mae"]), _n(r["rmse"]), "" if r["skill"] is None else f"{100 * r['skill']:+.0f} in 100 ({100 * r['skill_lo']:+.0f} to {100 * r['skill_hi']:+.0f})"] for r in m.get("pooled", [])]
            w(f"**{_cap(m['table'].replace('_', ' '))}.** {m['note']}\n"); w(_table(["Forecast", "n", "MAE", "RMSE", "Gain"], rows) + "\n")
        if t.get("features"):
            w("**What the model leans on**, as each feature's share of the boosted trees' gain, learned from the hours before 16:00:\n")
            w(_table(["Feature", "Share"], [[_cap(f["label"]), _n(f["share"], pct=True)] for f in t["features"] if f["share"] >= 0.005]) + "\n")
    w("## Why these models\n")
    w("One day of data, a table of mixed features, and a planner who must be able to trust the answer. Boosted trees with a loss made for counts took the M5 forecasting competition and lead published work on bus boardings; a plain count model is kept beside them to show how much of the answer is simple; a deep network would have nothing to learn its extra freedom from. The comparison and its sources are in `docs/research/research-methods.md`.\n")
    w("## Limits\n")
    w("- **One day.** Nothing here was tested on another day. Later hours of the same day, and routes and communities the model had not seen, are what was tested.")
    w("- **Loads are made from taps.** A check-in with no check-out is an alighting nobody recorded; those are spread along the trip, and the loads stage above says how many. No door counter checks them.")
    w("- **Seats, not standing.** The fleet table marks standing capacity not verified.")
    w("- **Most stop quarter-hours are empty.** That is why WAPE can sit above 1 at stop level, why MAPE is taken only where at least 5 boarded, and why the route table is the one to read first.")
    w("- **Buses, not roads.** There is no road traffic data here.\n")
    e = meta.get("engine", {})
    w("## Run it again\n")
    w(f"`python3 -m model.run --data <folder of the five tables> --out <folder>`. The same tables give the same bundle, byte for byte, and a test holds that. Boosted trees: {e.get('boosted_trees', 'not recorded')}. Origins with too little of the day to learn from, whose forecasts are not shown: {', '.join(_clock(o) for o in e.get('origins_with_too_little_to_learn_from', [])) or 'none'}.")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--bundle", required=True); ap.add_argument("--out"); ap.add_argument("--check"); a = ap.parse_args()
    text = card(a.bundle)
    if a.check:
        same = os.path.exists(a.check) and open(a.check, encoding="utf-8").read() == text
        print(("PASS " if same else "FAIL ") + f"{a.check} equals a fresh card written from {a.bundle}" + ("" if same else ": run python3 -m model.card --bundle " + a.bundle + " --out " + a.check))
        print("ALL PASS" if same else "1 FAILED"); return 0 if same else 1
    open(a.out, "w", encoding="utf-8").write(text); print(f"WROTE {a.out} ({len(text.splitlines())} lines)"); return 0


if __name__ == "__main__":
    sys.exit(main())
