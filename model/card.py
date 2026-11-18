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


def _gain(r, key="skill"):
    """A gain with its range, and the plain words when the range does not clear zero."""
    if r.get(key) is None:
        return ""
    lo, hi = r.get(key + "_lo"), r.get(key + "_hi")
    if lo is None:
        return f"{100 * r[key]:+.0f} in 100"
    return f"{100 * r[key]:+.0f} in 100 ({100 * lo:+.0f} to {100 * hi:+.0f})" + ("" if lo > 0 else (", loses" if hi < 0 else ", range includes zero"))


def _horizon_table(rows, models, unit):
    ahead = lambda h: f"{h if unit == 'stops' else h // 60} {unit}"
    return _table(["Ahead", "n", "Best naive forecast there", "Its MAE", "Model MAE", "Model RMSE", "Gain, with its range"],
                  [[ahead(r["horizon"]), _n(r["n"]), models[r["best_naive"]]["label"], _n(r["naive_mae"]), _n(r["model_mae"]), _n(r["model_rmse"]), _gain(r)] for r in rows])


STATUS = {"kept": "kept: the miss fell", "left_out": "left out: the miss did not fall", "one_value_all_day": "not tried: it has one value all day, so one day cannot teach it"}


def _effect(w, e, unit):
    w("**The new features, and what each did.** Each was added alone to the features the model had before and scored on the development part only (forecasts made before 16:00). One that did not lower the miss there is left out of the model, and stays in this table.\n")
    w(_table(["Feature", "Development MAE without it", "With it", "Outcome"], [[_cap(x["label"]), _n(x["dev_mae_without"], 4), _n(x["dev_mae_with"], 4) if x["dev_mae_with"] is not None else "", STATUS[x["status"]]] for x in e["table"]]) + "\n")
    u = e["untouched"]
    if not e["kept"]:
        w(f"No new feature is in the model: none lowered the miss on the development part. The model is the one it was (untouched MAE {_n(u['mae_after'], 4)} {unit}).\n")
    else:
        change = u["mae_after"] - u["mae_before"]; rel = -change / u["mae_before"] if u["mae_before"] else 0.0
        verdict = f"lower by {100 * rel:.1f} in 100" if change < 0 else (f"**higher by {-100 * rel:.1f} in 100: on the untouched part the features kept did not help**" if change > 0 else "the same")
        w(f"With the features kept, the boosted trees' MAE on the untouched part went from {_n(u['mae_before'], 4)} to {_n(u['mae_after'], 4)} {unit}: {verdict}. The choice was made before the untouched part was scored, so this number is reported as it fell.\n")
        w(_table(["Ahead", "n", "MAE before", "MAE after"], [[r["horizon"], _n(r["n"]), _n(r["mae_before"], 4), _n(r["mae_after"], 4)] for r in e["untouched_by_horizon"]]) + "\n")


def _why(targets, trip):
    """The paragraph that justifies the choice, written from the tables: who was compared, on which rows, and who won."""
    out = []
    stop = next((t for t in targets if t["target"] == "boardings" and t["level"] == "stop"), None)
    if stop:
        p = {r["model"]: r for r in stop["pooled"]}; nv = p[stop["best_naive"]]; g, l = p["gbt"], p["glm"]; label = {m["model"]: m["label"].lower() for m in stop["models"]}
        first = "the boosted trees have the lower error" if g["wape"] < l["wape"] else ("the penalised Poisson model has the lower error, and the card says so" if l["wape"] < g["wape"] else "the two are level")
        sure = "above zero" if (p[stop["chosen"]]["skill_lo"] or 0) > 0 else "not clear of zero, so neither is shown to beat the naive rule"
        out.append(f"**Boardings.** Three kinds of forecast were scored on the same {_n(g['n'])} untouched rows: naive rules, a penalised Poisson regression, and boosted trees with a loss made for counts. "
                   f"WAPE: best naive rule ({label[stop['best_naive']]}) {_n(nv['wape'])}; Poisson model {_n(l['wape'])} ({_gain(l)}); boosted trees {_n(g['wape'])} ({_gain(g)}). Of the two models {first}. "
                   f"The one shown ({label[stop['chosen']]}) was chosen on the development part, before these rows were scored; the range of its gain is {sure}. "
                   "Counts are whole, mostly zero and wider when larger, which is what a count loss is for; a squared-error loss would chase the few busy quarter-hours.")
    late = next((t for t in targets if t["target"] == "arrival_delay_seconds"), None)
    if late:
        p = {r["model"]: r for r in late["pooled"]}; nv = p[late["best_naive"]]; g = p["gbt"]; l = p.get("linear")
        lin = f"; a plain linear model on the same features {_n(l['mae'])} ({_gain(l)})" if l else ""
        win = "" if not l else (" The trees are kept because lateness does not grow in a straight line with the stops ahead and the bus in front; the linear model shows how much a straight line gets." if g["mae"] < l["mae"]
                                else " **On these rows the linear model's miss is no higher than the trees'.** The trees stay the declared model, and this line is what a planner should weigh.")
        out.append(f"**Lateness.** MAE in seconds on the same {_n(g['n'])} untouched rows: best naive rule ({late['models'] and next(m['label'].lower() for m in late['models'] if m['model'] == late['best_naive'])}) {_n(nv['mae'])}; boosted trees {_n(g['mae'])} ({_gain(g)}){lin}.{win}")
    if trip:
        t = {r["method"]: r for r in trip["strict"] if r["band"] == "Every held-out trip"}
        if t:
            out.append(f"**Trip time.** MAE in minutes on {_n(t['trees']['trips'])} held-out trips: the timetable {_n(t['timetable']['mae_min'])}; the route's usual stretch {_n(t['simple_rule']['mae_min'])}; a linear model {_n(t['linear']['mae_min'])}; boosted trees {_n(t['trees']['mae_min'])}. "
                       + ("The trees have the lowest miss of the four." if t["trees"]["mae_min"] <= min(t["simple_rule"]["mae_min"], t["linear"]["mae_min"]) else "**A simpler method has a lower miss than the trees here**, and the table below keeps it in."))
    return out


def card(bundle):
    load = lambda n: json.load(open(os.path.join(bundle, n), encoding="utf-8"))
    meta, metrics = load("meta.json"), load("metrics.json"); targets = metrics["targets"]; out = []; w = out.append
    has = lambda n: os.path.exists(os.path.join(bundle, n)); trip = load("forecast/scatter.json") if has("forecast/scatter.json") else None; pick = load("forecast/judge_pick.json") if has("forecast/judge_pick.json") else None
    w("# Model card\n")
    w("This file is written by the engine (`python3 -m model.card`) from `metrics.json` and `meta.json`. Nothing in it is typed by hand, and the gates fail if it does not equal a fresh one.\n")
    if meta["fixture"]:
        w("**STAND-IN DATA, NOT A RESULT.** Every number below comes from the real engine run on invented raw tables (`fixtures/raw/`). It shows that the method runs and how its results are reported. It says nothing about Dubai's buses.\n")
    w("## What is forecast\n")
    w(_table(["Target", "Unit", "Made", "For"], [
        ["Boardings at a stop on a route, and added up by route", "passengers in a quarter of an hour", f"every 30 minutes, {_clock(meta['origins'][0])} to {_clock(meta['origins'][-1])}", ", ".join(str(h // 60) for h in meta["horizons_seconds"]) + " minutes ahead"],
        ["How late a bus arrives at a stop ahead of it", "seconds (early is below zero)", "each time a bus leaves a stop", "1, 5, 10 and 20 stops ahead"],
        ["How long a trip takes, against the timetable", "minutes", "before the trip leaves, from what the timetable and the fleet list say", "trips scheduled from 16:00"]]) + "\n")
    w("## The data, and its one day\n")
    c = meta["counts"]
    w(f"One service day, {meta['service_date']}: {_n(c['routes'])} routes, {_n(c['stops'])} stops, {_n(c['trips'])} trips, {_n(c['stop_visits'])} stop visits and {_n(c['boardings'])} boardings. {targets[0].get('tested_on', '')} {targets[0].get('tested_on_more', '')}\n")
    w("How the tables were made ready, stage by stage, with the count each stage kept:\n")
    for s in meta.get("stages", []):
        counts = ", ".join(f"{k.replace('_', ' ')} {_n(v, 4)}" for k, v in s.items() if k not in ("stage", "text") and k != "service_date_as_number")
        w(f"- **{_cap(s['stage'])}.** {_cap(s['text'])}. Counted: {counts}.")
    w("")
    cx = meta.get("context")
    if cx:
        w("## What the day adds: public data and two signals from the buses\n")
        heat = (f"On this day the heat index ran from {_n(cx['heat_index_c_lowest'], 1)} to {_n(cx['heat_index_c_highest'], 1)} degrees: a mild day, so little gain from heat is expected here, and the tables below say what it was. " if cx.get("weather_found") else "The weather table has no reading for this day, so the heat index is absent. ")
        cal = (f"The calendar says: school holiday {'yes' if cx['school_holiday'] else 'no'}, public holiday {'yes' if cx['public_holiday'] else 'no'}. One day has one calendar, so the two flags have one value all day and no model can learn from them yet; they are built so that more days need no new code. " if cx.get("calendar_found") else "The calendar has no line for this day. ")
        w("- **Heat index**, from the hourly temperature and humidity of the last full hour before a forecast is made (Steadman's formula as the US weather service states it, with the Rothfusz regression from 80 F). " + heat)
        w("- **School-holiday and public-holiday flags**, from the calendar. " + cal)
        w("- **The same vehicle's lateness at the end of its previous trip**, in seconds: the 'bus still out' signal as a number. It is used only once that trip had ended.")
        w("- **Headway deviation**: at a stop, the gap to the bus in front less the gap the timetable gives. Only buses that had already left count.")
        w(f"\nSources: {'; '.join(cx['sources'])}; each has its source note beside it in `opendata/public/`. A test changes every record after noon and requires each of these features, for forecasts made before noon, to stay the same.\n")
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
        w("**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it. The range of each gain is where it fell 95 times in 100 when whole origins were drawn again, on that horizon's rows alone.\n")
        unit = "stops" if t.get("horizon_unit") == "stops" else "minutes"
        w(_horizon_table(t.get("by_horizon", []), models, unit) + "\n")
        if t.get("peak_by_horizon"):
            w("**At the evening peak, 16:00 to 20:00, by horizon.** The same table for forecasts made in the peak alone.\n")
            w(_horizon_table(t["peak_by_horizon"], models, unit) + "\n")
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
            if m.get("by_horizon"):
                w(f"{_cap(m['table'].replace('_', ' '))}, by horizon:\n"); w(_horizon_table(m["by_horizon"], models, unit) + "\n")
        if t.get("feature_effect"):
            _effect(w, t["feature_effect"], "seconds" if not counts else "passengers")
        if t.get("features"):
            w("**What the model leans on**, as each feature's share of the boosted trees' gain, learned from the hours before 16:00:\n")
            w(_table(["Feature", "Share"], [[_cap(f["label"]), _n(f["share"], pct=True)] for f in t["features"] if f["share"] >= 0.005]) + "\n")
    if trip:
        sp = trip["split"]
        w("## Trip time against the timetable\n")
        w(f"One row is one trip: {_n(trip['trips_kept'])} of the day's {_n(trip['trips_in_the_day'])} trips are kept ({trip['kept_rule']}). The model forecasts the stretch, actual time over the timetable's time, from: {', '.join(trip['features'])}. Unit: {trip['unit']}.\n")
        for key, title in (("strict", "Strict split"), ("as_pitched", "As first pitched")):
            w(f"**{title}.** {_cap(sp[key])}. Learned from {_n(sp['learned_from_' + key])} trips, forecast {_n(sp['held_out'])}. The range is from drawing whole routes again.\n")
            w(_table(["Trips scheduled", "Method", "Trips", "MAE", "RMSE", "MAPE", "Closer than the timetable, with its range", "Share of trips where it was closer"],
                     [[r["band"], trip["methods"][r["method"]], _n(r["trips"]), _n(r["mae_min"]), _n(r["rmse_min"]), _n(r["mape"], pct=True), _gain(r, "closer") if r["closer_than_timetable"] is not None else "", _n(r["share_of_trips_closer"], pct=True) if r["share_of_trips_closer"] is not None else ""]
                      for r in [dict(x, closer=x["closer_than_timetable"]) for x in trip[key]]]) + "\n")
        w(f"On the strict split the boosted trees were closer than the timetable on {_n(trip['share_forecast_closer'], pct=True)} of the {_n(trip['n'])} held-out trips, and the timetable was closer on {_n(trip['share_timetable_closer'], pct=True)}. Every trip's two errors are in `forecast/scatter.json`, with no trip, vehicle or route named.\n")
    if pick:
        w("## Pick any route and hour\n")
        w(f"`forecast/judge_pick.json` holds, for every route and every hour from 16:00 to 20:00 of the untouched part, the average lateness forecast, the naive forecast ({pick['naive_label'].lower()}) and what happened, with the count. Of {_n(pick['route_hours'])} route-hours the model's average miss was lower in {_n(pick['route_hours_where_the_forecast_was_closer'])} and not lower in {_n(pick['route_hours_where_the_naive_was_closer_or_equal'])}; {_n(pick['route_hours_left_out_as_too_few'])} with fewer than {pick['least_forecasts']} forecasts are left out. The misses stay in the file.\n")
    w("## Why these models\n")
    w("One day of data, a table of mixed features, and a planner who must be able to trust the answer. Boosted trees with a loss made for counts took the M5 forecasting competition and lead published work on bus boardings; a plain model is kept beside them for each target to show how much of the answer is simple; a deep network would have nothing to learn its extra freedom from. The comparison and its sources are in `docs/research/research-methods.md`. What the comparison came to on this day:\n")
    for line in _why(targets, trip):
        w("- " + line)
    w("")
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
