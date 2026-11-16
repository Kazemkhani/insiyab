"""The naive forecasts for boardings: the simple things the model must beat (docs/MODEL-PLAN.md, section 4).
Each is built from exactly what the model may see, the bins that had ended by the origin, and is scored by the same code.

The day is held as two tables of the same shape, one row for each series (a stop on a route, or a route) and one
column for each quarter of an hour:
  Y[s, b]  boardings, or NaN where no bus was scheduled to call (absent, not zero)
  S[s, b]  scheduled departures from the timetable (known before the day, so any column may be read)
`seen` is the number of bins that had ended by the origin: only Y[:, :seen] may be read."""
import numpy as np

NAIVE = {
    "naive_last": "Same as the last quarter of an hour seen",
    "naive_mean": "The average so far today",
    "naive_timetable": "In proportion to the timetable",
}


def naive_last(Y, S, seen, target):
    """Boardings in the last bin seen for the series. 0 where the series has not been seen at all."""
    out = np.zeros(Y.shape[0])
    for s in range(Y.shape[0]):
        row = Y[s, :seen]; known = np.flatnonzero(~np.isnan(row))
        if known.size:
            out[s] = row[known[-1]]
    return out


def naive_mean(Y, S, seen, target):
    """The series' average boardings for each bin seen so far today. 0 where it has not been seen."""
    part = Y[:, :seen]; n = (~np.isnan(part)).sum(axis=1)
    return np.where(n > 0, np.nansum(part, axis=1) / np.maximum(n, 1), 0.0)


def naive_timetable(Y, S, seen, target):
    """Boardings for each scheduled departure so far, times the departures scheduled in the target bin.
    A series with no departure seen yet borrows the rate of every series together."""
    on = np.nansum(Y[:, :seen], axis=1); dep = np.where(np.isnan(Y[:, :seen]), 0, S[:, :seen]).sum(axis=1)
    everyone = on.sum() / dep.sum() if dep.sum() > 0 else 0.0
    rate = np.where(dep > 0, on / np.maximum(dep, 1), everyone)
    return rate * S[:, target]


FUNCTIONS = {"naive_last": naive_last, "naive_mean": naive_mean, "naive_timetable": naive_timetable}
