"""The measures of error. One place, so every model and every naive forecast is scored by the same code
(docs/MODEL-PLAN.md, section 6). numpy only.

MAPE breaks when what happened is zero or tiny, and most stop-quarter-hours are. So MAPE is taken only over
bins with at least MAPE_MIN boardings, and mape_n says how many bins that was. WAPE is the one to lead with."""
import numpy as np

MAPE_MIN = 5
MAPE_RULE = f"MAPE is taken only over quarters of an hour in which at least {MAPE_MIN} passengers boarded, and the table says how many those were. WAPE (the total miss over the total boardings) covers every quarter of an hour, the empty ones included."


def measures(actual, forecast, mape_min=MAPE_MIN):
    """Returns n, mae, rmse, wape, mape, mape_n. mape and wape are shares (0.18, not 18), or None where they cannot be taken."""
    a = np.asarray(actual, dtype=float); f = np.asarray(forecast, dtype=float)
    if a.shape != f.shape:
        raise ValueError(f"actual has shape {a.shape} and forecast {f.shape}")
    if a.size == 0:
        return {"n": 0, "mae": None, "rmse": None, "wape": None, "mape": None, "mape_n": 0}
    if np.isnan(a).any() or np.isnan(f).any():
        raise ValueError("a missing value reached the measures: a bin with no actual is left out before scoring, never scored as zero")
    miss = np.abs(a - f); big = a >= mape_min; total = a.sum()
    return {"n": int(a.size), "mae": float(miss.mean()), "rmse": float(np.sqrt(((a - f) ** 2).mean())),
            "wape": float(miss.sum() / total) if total > 0 else None,
            "mape": float((miss[big] / a[big]).mean()) if big.any() else None, "mape_n": int(big.sum())}


def skill(model_mae, naive_mae):
    """The share of the naive forecast's error that the model removes: 1 less (model MAE over naive MAE)."""
    if model_mae is None or naive_mae is None or naive_mae == 0:
        return None
    return float(1 - model_mae / naive_mae)
