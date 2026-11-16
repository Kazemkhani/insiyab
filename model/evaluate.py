"""The table the judges read (docs/MODEL-PLAN.md, section 6). Every model and every naive forecast is scored by the same
function on the same rows, at every horizon, on every subset. Gain is against the best naive forecast, never the worst.
Nothing here is typed by hand: metrics.json is whatever these functions return."""
import numpy as np
import pandas as pd
from . import naive
from .measures import measures, skill, MAPE_RULE
from .forecast import MODELS, SEED

NAIVE = list(naive.NAIVE)
BLOCKS = [("early", 0, 6.5), ("morning_peak", 6.5, 9.5), ("midday", 9.5, 16), ("evening_peak", 16, 20), ("late", 20, 99)]
BLOCK_LABEL = {"early": "Before 06:30", "morning_peak": "Morning peak, 06:30 to 09:30", "midday": "Midday, 09:30 to 16:00", "evening_peak": "Evening peak, 16:00 to 20:00", "late": "After 20:00"}


def time_block(seconds):
    h = np.asarray(seconds) / 3600
    return np.select([h < b for _, _, b in BLOCKS], [n for n, _, _ in BLOCKS], default="late")


def _r(x, places=4):
    return None if x is None else round(float(x), places)


def _score(frame, col):
    m = measures(frame["y"].to_numpy(), frame[col].to_numpy())
    return {"n": m["n"], "mae": _r(m["mae"]), "rmse": _r(m["rmse"]), "mape": _r(m["mape"]), "mape_n": m["mape_n"], "wape": _r(m["wape"])}


def subsets_of(frame, kinds):
    """The declared subsets and, for each, which rows are in it. kinds maps a kind to (column, label function)."""
    declared = [{"subset": "all", "kind": "all", "label": "Every held-out bin"}]; masks = {"all": np.ones(len(frame), bool)}
    for kind, (col, label) in kinds.items():
        for value in sorted(frame[col].dropna().unique(), key=str):
            name = f"{kind}_{value}"
            declared.append({"subset": name, "kind": kind, "label": label(value)}); masks[name] = (frame[col] == value).to_numpy()
    return declared, masks


def table(frame, models, masks):
    """One result for each model, horizon and subset that has rows."""
    results = []
    for h in sorted(frame["horizon"].unique()):
        at_h = (frame["horizon"] == h).to_numpy()
        for name, mask in masks.items():
            part = frame[at_h & mask]
            if not len(part):
                continue
            scores = {m: _score(part, m) for m in models}
            best = min(NAIVE, key=lambda m: (scores[m]["mae"], m))
            for m in models:
                is_naive = m in NAIVE
                results.append(dict(scores[m], model=m, horizon=int(h), subset=name, skill_vs=None if is_naive else best, skill=None if is_naive else _r(skill(scores[m]["mae"], scores[best]["mae"]))))
    return results


def pooled(frame, models, draws=400):
    """Every horizon together, with a range for the gain found by drawing whole origins again and again (a block bootstrap):
    neighbouring bins at one origin rise and fall together, so single rows must not be drawn as if they were separate."""
    scores = {m: _score(frame, m) for m in models}
    best = min(NAIVE, key=lambda m: (scores[m]["wape"] if scores[m]["wape"] is not None else 9e9, m))
    origins = np.sort(frame["origin"].unique()); code = np.searchsorted(origins, frame["origin"].to_numpy())
    total = np.bincount(code, frame["y"].to_numpy(), len(origins))
    miss = {m: np.bincount(code, np.abs(frame["y"].to_numpy() - frame[m].to_numpy()), len(origins)) for m in models}
    rng = np.random.default_rng(SEED); picks = rng.integers(0, len(origins), size=(draws, len(origins)))
    out = []
    for m in models:
        row = dict(scores[m], model=m, subset="all", skill_vs=None, skill=None, skill_measure="wape", skill_lo=None, skill_hi=None)
        if m not in NAIVE and scores[best]["wape"]:
            base = miss[best][picks].sum(axis=1); mine = miss[m][picks].sum(axis=1); ok = base > 0
            gains = 1 - mine[ok] / base[ok]
            row.update(skill_vs=best, skill=_r(1 - scores[m]["wape"] / scores[best]["wape"]), skill_lo=_r(np.quantile(gains, 0.025)), skill_hi=_r(np.quantile(gains, 0.975)))
        out.append(row)
    return out, best


def choose(development_pooled):
    """Which model is shown first. It is given the development table and nothing else: it cannot see the untouched part."""
    candidates = [r for r in development_pooled if r["model"] in MODELS and r["wape"] is not None]
    return min(candidates, key=lambda r: (r["wape"], r["model"]))["model"]


def models_declared(chosen):
    out = [{"model": m, "label": label, "is_baseline": True} for m, label in naive.NAIVE.items()]
    return out + [{"model": m, "label": label, "is_baseline": False, "chosen": m == chosen} for m, label in MODELS.items()]
