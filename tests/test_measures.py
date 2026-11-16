#!/usr/bin/env python3
"""The measures and the naive forecasts give the answers worked by hand on small cases, including a zero.
  python3 tests/test_measures.py      the last line is ALL PASS"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np
from model.measures import measures, skill
from model import naive

failed = 0
def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {detail}")); failed += 0 if ok else 1
def near(a, b): return a is not None and abs(a - b) < 1e-9

# actual 0, 10, 4, 6 against forecast 2, 7, 4, 9: misses 2, 3, 0, 3
m = measures([0, 10, 4, 6], [2, 7, 4, 9])
check("MAE is the average miss: (2+3+0+3)/4 = 2", near(m["mae"], 2.0), m)
check("RMSE is the root of the average squared miss: sqrt((4+9+0+9)/4)", near(m["rmse"], (22 / 4) ** 0.5), m)
check("WAPE is the total miss over total boardings: 8/20 = 0.4, and the zero does not break it", near(m["wape"], 0.4), m)
check("MAPE is taken only over bins with at least 5 boardings: (3/10 + 3/6)/2 = 0.4, over 2 bins", near(m["mape"], 0.4) and m["mape_n"] == 2, m)
check("RMSE is never below MAE", m["rmse"] >= m["mae"])
z = measures([0, 0, 1], [1, 0, 1])
check("where no bin reaches 5 boardings MAPE is absent, not zero and not infinite", z["mape"] is None and z["mape_n"] == 0 and near(z["wape"], 1.0), z)
check("where nobody boarded at all WAPE is absent", measures([0, 0], [1, 1])["wape"] is None)
check("an empty set gives n 0 and no numbers", measures([], [])["n"] == 0 and measures([], [])["mae"] is None)
try: measures([1, float("nan")], [1, 1]); check("a missing actual is refused, never scored as zero", False)
except ValueError: check("a missing actual is refused, never scored as zero", True)
check("gain is 1 less model MAE over naive MAE: 1 - 3/4 = 0.25", near(skill(3, 4), 0.25))
check("a model worse than the naive forecast has a gain below zero", skill(5, 4) < 0)
check("gain is absent where the naive forecast has no error", skill(1, 0) is None)

nan = float("nan")
#            bin 0  1    2    3   4
Y = np.array([[4.0, 6.0, nan, 8.0, 99.0],     # a stop seen in bins 0, 1, 3
              [nan, nan, nan, 2.0, 99.0],     # a stop first seen in bin 3
              [nan, nan, nan, nan, 99.0]])    # a stop not seen before the target
S = np.array([[1.0, 2.0, 0.0, 1.0, 3.0],
              [0.0, 0.0, 0.0, 1.0, 2.0],
              [0.0, 0.0, 0.0, 0.0, 1.0]])
check("last seen: 6 after two bins (the last bin seen), 0 where nothing was seen", list(naive.naive_last(Y, S, 2, 4)) == [6.0, 0.0, 0.0])
check("last seen skips a bin with no scheduled bus: after three bins it is still 6", naive.naive_last(Y, S, 3, 4)[0] == 6.0)
check("average so far: (4+6+8)/3 = 6 after four bins, 2 for the stop seen once, 0 for the unseen", list(naive.naive_mean(Y, S, 4, 4)) == [6.0, 2.0, 0.0])
t = naive.naive_timetable(Y, S, 4, 4)
check("timetable: 18 boardings over 4 departures, times 3 scheduled = 13.5", near(t[0], 13.5), t)
check("timetable: 2 boardings over 1 departure, times 2 scheduled = 4", near(t[1], 4.0), t)
check("timetable: an unseen stop borrows everyone's rate: 20 over 5, times 1 = 4", near(t[2], 4.0), t)
before = [f(Y, S, 4, 4).copy() for f in naive.FUNCTIONS.values()]
Y2 = Y.copy(); Y2[:, 4:] = -1000
check("the clock: changing every bin from the origin on changes no naive forecast", all((f(Y2, S, 4, 4) == b).all() for f, b in zip(naive.FUNCTIONS.values(), before)))

print("ALL PASS" if not failed else f"{failed} FAILED"); sys.exit(1 if failed else 0)
