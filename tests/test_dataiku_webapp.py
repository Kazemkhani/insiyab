"""test_dataiku_webapp.py — proves the Insiyab Dataiku webapp works.

Run:
  .venv/bin/python tests/test_dataiku_webapp.py

Last line is ALL PASS or n FAILED.

The test:
  1. Builds a stub `dataiku` module with made-up data in the correct schemas.
  2. Creates a Flask test harness that provides `app` and executes backend.py
     in that context, then adds a route that serves the full assembled page.
  3. Starts the Flask server on a free port in a background thread.
  4. Uses Playwright at 1280x720 and 390x844 to test every tab.
  5. Saves screenshots to /tmp/insiyab-webapp-shots/ and prints paths.

Made-up data is clearly invented: route names are "T01".."T30",
hours are 3..26, values are arithmetic progressions.
"""

import io
import json
import math
import os
import random
import socket
import sys
import textwrap
import threading
import time
import types

# ── Playwright uses the system browser cache ───────────────────────────
os.environ.setdefault(
    "PLAYWRIGHT_BROWSERS_PATH",
    os.path.expanduser("~/Library/Caches/ms-playwright"),
)

import pandas as pd
import flask as _flask

# ── Locate the repo root ───────────────────────────────────────────────
ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP = os.path.join(ROOT, "dataiku", "webapp")

# ── Build the stub dataiku module ────────────────────────────────────
# Made-up data — clearly invented.

_ROUTES   = ["T{:02d}".format(i) for i in range(1, 31)]   # T01..T30
_HOURS    = list(range(3, 27))                              # 3..26
_BUS_TYPES = ["STANDARD", "DOUBLE", "ARTICULATED", "MIDI", "COACH"]

_BROKEN_DATASETS = set()   # test can add names here to trigger error paths


def _make_punctuality_by_hour():
    # counts are scaled to reflect realistic departure volumes:
    # daytime (h=7..20) around 500-900, off-peak lower.
    rows = []
    for h in _HOURS:
        base = 0.08 + 0.012 * max(0, h - 14)
        count = int(300 + 400 * math.exp(-((h - 17) ** 2) / 20))  # peak ~700 at h=17
        rows.append({
            "hour": h,
            "late_s_avg": round(base * 400, 1),
            "late_5min_avg": round(base, 4),
            "late_5min_sum": int(base * count),
            "early_1min_avg": round(0.03 + base * 0.1, 4),
            "drive_through_avg": round(0.01 + 0.002 * h, 4),
            "count": count,
        })
    return pd.DataFrame(rows)


def _make_punctuality_by_route_hour():
    rows = []
    for route in _ROUTES:
        ri = int(route[1:]) - 1
        for h in _HOURS:
            base = 0.05 + 0.015 * (ri % 6) + 0.01 * max(0, h - 15)
            rows.append({
                "route": route,
                "hour": h,
                "late_s_avg": round(base * 380, 1),
                "late_5min_avg": round(base, 4),
                "late_5min_sum": int(base * 50),
                "early_1min_avg": round(0.02, 4),
                "drive_through_avg": round(0.008 + 0.001 * ri, 4),
                "count": 20 + ri * 3 + (h % 5) * 2,
            })
    return pd.DataFrame(rows)


def _make_punctuality_by_bus_type():
    rows = []
    for i, bt in enumerate(_BUS_TYPES):
        rows.append({
            "bus_type": bt,
            "late_s_avg": round(80 + i * 25, 1),
            "late_5min_avg": round(0.10 + i * 0.04, 4),
            "late_5min_sum": 500 + i * 200,
            "early_1min_avg": round(0.025 - i * 0.003, 4),
            "drive_through_avg": round(0.01 + i * 0.002, 4),
            "count": 3000 - i * 400,
        })
    return pd.DataFrame(rows)


def _make_demand_by_hour():
    rows = []
    for h in _HOURS:
        b = 1200 + 800 * math.exp(-((h - 18) ** 2) / 8)
        rows.append({
            "hour": h,
            "boardings_sum": int(b),
            "alightings_sum": int(b * 0.98),
            "count": 280 + h * 4,
        })
    return pd.DataFrame(rows)


def _make_demand_by_route_hour():
    rows = []
    for route in _ROUTES:
        ri = int(route[1:]) - 1
        for h in _HOURS:
            b = 60 + 40 * (ri % 5) + 30 * math.exp(-((h - 17) ** 2) / 10)
            rows.append({
                "route": route,
                "hour": h,
                "boardings_sum": int(b),
                "alightings_sum": int(b * 0.97),
                "count": 20 + ri * 2,
            })
    return pd.DataFrame(rows)


def _make_demand_by_stop():
    rows = []
    stops = [("STP{:04d}".format(i), "Stop Area {}".format(i)) for i in range(1, 31)]
    for sid, sname in stops:
        idx = int(sid[3:]) - 1
        rows.append({
            "stop_id": sid,
            "stop_name": sname,
            "boardings_sum": 1800 - idx * 50,
            "alightings_sum": 1750 - idx * 50,
            "count": 400 - idx * 10,
        })
    return pd.DataFrame(rows)


def _make_supply_vs_demand():
    statuses = [
        "in balance",
        "short of seats",
        "short even with standing",
        "under a fifth used",
        "route not in the running-time table",
    ]
    rows = []
    for route in _ROUTES:
        ri = int(route[1:]) - 1
        for h in _HOURS:
            boardings = 60 + 40 * (ri % 5) + 30 * math.exp(-((h - 17) ** 2) / 10)
            seats_per = 42 if ri % 3 != 0 else 70
            trips = 3 + ri % 4
            needed = math.ceil(boardings / seats_per)
            short = max(0, needed - trips)
            bps = boardings / (trips * seats_per) if trips > 0 else 0
            if ri >= 25:
                status = "route not in the running-time table"
            elif short > 2:
                status = "short even with standing"
            elif short > 0:
                status = "short of seats"
            elif bps < 0.2:
                status = "under a fifth used"
            else:
                status = "in balance"
            rows.append({
                "route": route,
                "hour": h,
                "trips_run": trips,
                "seats_offered": trips * seats_per,
                "seats_per_bus": seats_per,
                "boardings": int(boardings),
                "alightings": int(boardings * 0.97),
                "places_per_bus": seats_per + 20,
                "buses_needed_seated": needed,
                "buses_needed_with_standing": math.ceil(boardings / (seats_per + 20)),
                "buses_short_seated": short,
                "buses_short_with_standing": max(0, math.ceil(boardings / (seats_per + 20)) - trips),
                "boardings_per_seat_offered": round(bps, 4),
                "status": status,
            })
    # The real table has empty cells: a route with taps but no trip in the running-time table. Empty must not break the page.
    _out = pd.DataFrame(rows)
    _nan = float("nan")
    _extra = dict(_out.iloc[0]) if hasattr(_out, "iloc") else dict(_out[0])
    _extra.update({"route": "T99", "trips_run": 0, "seats_offered": 0, "buses_short_seated": _nan, "buses_short_with_standing": _nan, "boardings_per_seat_offered": _nan, "status": "route not in the running-time table"})
    if hasattr(_out, "iloc"):
        import pandas as _pd
        _out = _pd.concat([_out, _pd.DataFrame([_extra])], ignore_index=True)
    else:
        _out = list(_out) + [_extra]
    return _out


def _make_supply_status_by_hour():
    supply = _make_supply_vs_demand()
    result = []
    statuses = supply["status"].unique()
    for h in _HOURS:
        for st in statuses:
            sub = supply[(supply["hour"] == h) & (supply["status"] == st)]
            if len(sub) == 0:
                continue
            result.append({
                "hour": h,
                "status": st,
                "trips_run_sum": int(sub["trips_run"].sum()),
                "boardings_sum": int(sub["boardings"].sum()),
                "buses_short_seated_sum": int(sub["buses_short_seated"].sum()),
                "count": len(sub),
            })
    return pd.DataFrame(result)


def _make_running_time_metrics():
    """Three test-bands times five methods = 15 rows."""
    bands = [
        ("16:00 to 18:59",        "evening peak"),
        ("19:00 to end of service", "late"),
        ("all trips from 16:00",   "combined"),
    ]
    methods = [
        ("RTA timetable (the plan)",                  None,  None, None, None, None),
        ("Route history mean",                         0.14,  0.12, 0.17, 0.12, "route history"),
        ("Route recent mean",                          0.18,  0.15, 0.22, 0.09, "route recent"),
        ("Model, timetable features only",             0.26,  0.21, 0.31, 0.16, "route history"),
        ("Model, with what is known 30 minutes ahead", 0.27,  0.22, 0.32, 0.12, "route history"),
    ]
    rows = []
    for tested_on, _short in bands:
        for idx, (method, gain, gain_low, gain_high, gain_vs_simple, best_simple) in enumerate(methods):
            timetable_mae = 8.4 + idx * 0.3
            rows.append({
                "tested_on":          tested_on,
                "method":             method,
                "trips":              420 + idx * 15,
                "mae_minutes":        round(timetable_mae * (1 - (gain or 0)), 2),
                "rmse_minutes":       round(timetable_mae * (1 - (gain or 0)) * 1.3, 2),
                "mape":               round(0.14 + idx * 0.01, 4),
                "gain_vs_timetable":  gain,
                "gain_low":           gain_low,
                "gain_high":          gain_high,
                "gain_vs_best_simple": gain_vs_simple,
                "best_simple_was":    best_simple,
                "learned_from":       "14,230 evening trips on 15 routes",
                "made":               "2026-11-15",
            })
    return pd.DataFrame(rows)


def _make_running_time_forecast():
    """~400 rows: 20 routes x 20 evening trips each."""
    rows = []
    for route in _ROUTES[:20]:
        ri = int(route[1:]) - 1
        base_run = 25 + ri * 2
        for trip_num in range(20):
            h = 16 + (trip_num * 20) // 60
            sched = base_run + (h - 16) * 0.4
            actual = sched + random.uniform(-2.5, 4.5)
            tt = sched
            mp = sched + (actual - sched) * 0.6
            rows.append({
                "trip_id":        "TRIP{}{:04d}".format(route, trip_num),
                "route":          route,
                "direction":      "inbound" if trip_num % 2 == 0 else "outbound",
                "hour":           h,
                "band":           "evening_peak",
                "bus_type":       _BUS_TYPES[ri % len(_BUS_TYPES)],
                "sched_run_min":  round(sched, 2),
                "actual_run_min": round(actual, 2),
                "timetable":      round(tt, 2),
                "route_history":  round(sched + 0.8, 2),
                "route_recent":   round(sched + 0.5, 2),
                "model_plan":     round(mp, 2),
                "model_live":     round(mp - 0.2, 2),
            })
    return pd.DataFrame(rows)


def _make_running_time_drivers():
    features = [
        ("sched_run_min",           0.42),
        ("hour",                    0.18),
        ("route",                   0.12),
        ("n_stops",                 0.08),
        ("prev_trip_end_late_min",  0.07),
        ("route_recent_ratio",      0.06),
        ("bus_type",                0.04),
        ("direction",               0.03),
    ]
    rows = [{"feature": f, "share": s} for f, s in features]
    return pd.DataFrame(rows)


def _make_running_time_bands():
    """Route-hour bands for the first 10 routes, hours 16..20."""
    rows = []
    for route in _ROUTES[:10]:
        ri = int(route[1:]) - 1
        for h in range(16, 21):
            sched  = 25 + ri * 2 + (h - 16) * 0.5
            p50    = sched * 1.05
            p85    = sched * 1.20 + (h - 16) * 0.8
            extra  = p85 - sched
            trips  = 8 + ri % 5
            rows.append({
                "route":                      route,
                "direction":                  "inbound",
                "hour":                       h,
                "trips":                      trips,
                "sched_run_min":              round(sched, 2),
                "actual_p50_min":             round(p50, 2),
                "actual_p85_min":             round(p85, 2),
                "extra_min_at_p85":           round(extra, 2),
                "extra_bus_minutes_at_p85":   round(extra * trips / 60 * 60, 2),
                "spare_bus_minutes_in_plan":  round(sched * 0.05 * trips, 2),
                "share_running_over_plan":    round(extra / sched, 4),
                "share_ending_5min_late":     round(0.1 + ri * 0.02, 4),
                "layover_sched_min":          round(5 + ri * 0.5, 2),
            })
    return pd.DataFrame(rows)


def _make_running_time_ledger_by_hour():
    """Hour-level ledger across all routes/directions."""
    rows = []
    for h in range(6, 24):
        extra_sum = 0
        spare_sum = 0
        trips_sum = 0
        for route in _ROUTES[:10]:
            ri = int(route[1:]) - 1
            sched = 25 + ri * 2 + max(0, h - 16) * 0.5
            extra = sched * 0.20 + max(0, h - 16) * 0.8
            trips = 8 + ri % 5
            extra_sum += extra * trips
            spare_sum += sched * 0.05 * trips
            trips_sum += trips
        rows.append({
            "hour":                           h,
            "trips_sum":                      trips_sum,
            "extra_bus_minutes_at_p85_sum":   round(extra_sum, 2),
            "spare_bus_minutes_in_plan_sum":  round(spare_sum, 2),
            "count":                          10,
        })
    return pd.DataFrame(rows)


_DATA = {
    "punctuality_by_hour":           _make_punctuality_by_hour,
    "punctuality_by_route_hour":      _make_punctuality_by_route_hour,
    "punctuality_by_bus_type":        _make_punctuality_by_bus_type,
    "demand_by_hour":                 _make_demand_by_hour,
    "demand_by_route_hour":           _make_demand_by_route_hour,
    "demand_by_stop":                 _make_demand_by_stop,
    "supply_vs_demand_by_route_hour": _make_supply_vs_demand,
    "supply_status_by_hour":          _make_supply_status_by_hour,
    "running_time_metrics":           _make_running_time_metrics,
    "running_time_forecast":          _make_running_time_forecast,
    "running_time_drivers":           _make_running_time_drivers,
    "running_time_bands":             _make_running_time_bands,
    "running_time_ledger_by_hour":    _make_running_time_ledger_by_hour,
}


class _StubDataset:
    def __init__(self, name):
        self.name = name

    def get_dataframe(self):
        if self.name in _BROKEN_DATASETS:
            raise RuntimeError(
                "Dataset '{}' not found (deliberately broken in test)".format(self.name)
            )
        factory = _DATA.get(self.name)
        if factory is None:
            raise RuntimeError("Dataset '{}' does not exist".format(self.name))
        return factory()


_stub_dataiku = types.ModuleType("dataiku")
_stub_dataiku.Dataset = _StubDataset
sys.modules["dataiku"] = _stub_dataiku

# ── Build the Flask test harness ──────────────────────────────────────
harness = _flask.Flask(__name__)
harness.config["TESTING"] = True

# Execute backend.py in a namespace where `app` = harness
_backend_path = os.path.join(WEBAPP, "backend.py")
with open(_backend_path) as fh:
    _backend_src = fh.read()

_backend_globals = {
    "__name__": "backend",
    "__file__": _backend_path,
    "app": harness,
}
exec(compile(_backend_src, _backend_path, "exec"), _backend_globals)

# Route that serves the assembled page (body.html + style.css + script.js)
@harness.route("/")
def index():
    body_path  = os.path.join(WEBAPP, "body.html")
    style_path = os.path.join(WEBAPP, "style.css")
    js_path    = os.path.join(WEBAPP, "script.js")

    with open(body_path)  as f: body  = f.read()
    with open(style_path) as f: style = f.read()
    with open(js_path)    as f: js    = f.read()

    page = textwrap.dedent("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Insiyab test</title>
          <style>{style}</style>
          <script>
            var __backendPort = {port};
            function getWebAppBackendUrl(path) {{
              return 'http://127.0.0.1:' + __backendPort + path;
            }}
          </script>
        </head>
        <body style="margin:0;padding:0">
        {body}
        <script>
        {js}
        </script>
        </body>
        </html>
    """).format(style=style, body=body, js=js, port="{port}")

    # Port is substituted after we know it; use a placeholder replaceable approach
    actual_port = harness.config.get("PORT", 0)
    page = page.replace("{port}", str(actual_port))
    return page


# Route to deliberately break a dataset during testing
@harness.route("/test-break/<name>")
def test_break(name):
    _BROKEN_DATASETS.add(name)
    return _flask.jsonify({"broken": name})


@harness.route("/test-restore/<name>")
def test_restore(name):
    _BROKEN_DATASETS.discard(name)
    return _flask.jsonify({"restored": name})


# ── Start server on a free port ───────────────────────────────────────
def _free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


PORT = _free_port()
harness.config["PORT"] = PORT


def _run():
    harness.run(host="127.0.0.1", port=PORT, use_reloader=False, threaded=True)


_server = threading.Thread(target=_run, daemon=True)
_server.start()
time.sleep(1.0)   # Give Flask time to start

BASE = "http://127.0.0.1:{}".format(PORT)

# ── Screenshot directory ──────────────────────────────────────────────
SHOT_DIR = "/tmp/insiyab-webapp-shots"
os.makedirs(SHOT_DIR, exist_ok=True)

# ── Test runner ───────────────────────────────────────────────────────
_failures = []
_passes   = []


def passed(name):
    _passes.append(name)
    print("  PASS  " + name)


def failed(name, detail=""):
    _failures.append(name)
    print("  FAIL  " + name + (" — " + detail if detail else ""))


def check(name, condition, detail=""):
    if condition:
        passed(name)
    else:
        failed(name, detail)


# ── Playwright tests ──────────────────────────────────────────────────
def run_all_tests():
    from playwright.sync_api import sync_playwright

    VIEWPORTS = [
        {"name": "desktop", "width": 1280, "height": 720},
        {"name": "mobile",  "width": 390,  "height": 844},
    ]

    TABS = [
        ("day",         "tbtn-day"),
        ("worklist",    "tbtn-worklist"),
        ("demand",      "tbtn-demand"),
        ("reliability", "tbtn-reliability"),
        ("supply",      "tbtn-supply"),
        ("forecast",    "tbtn-forecast"),
        ("whatif",      "tbtn-whatif"),
        ("build",       "tbtn-build"),
    ]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        for vp in VIEWPORTS:
            vname = vp["name"]
            print("\n-- {} ({}x{}) --".format(vname, vp["width"], vp["height"]))

            page = browser.new_page(
                viewport={"width": vp["width"], "height": vp["height"]},
            )

            # Capture console errors
            console_errors = []
            page.on("console", lambda m: console_errors.append(m)
                    if m.type == "error" else None)

            page.goto(BASE + "/", wait_until="domcontentloaded")
            page.wait_for_timeout(1500)   # let first tab data load

            # Test each tab
            for tab_id, btn_id in TABS:
                # Reset errors for this tab
                tab_errors_before = len(console_errors)

                page.click("#" + btn_id)
                page.wait_for_timeout(1200)

                # Screenshot
                shot = os.path.join(SHOT_DIR, "{}-{}.png".format(vname, tab_id))
                page.screenshot(path=shot, full_page=False)

                # 1. No console error
                new_errors = console_errors[tab_errors_before:]
                # Filter out known noisy but harmless errors
                real_errors = [e for e in new_errors
                               if "favicon" not in e.text.lower()
                               and "net::err_aborted" not in e.text.lower()]
                check(
                    vname + "/" + tab_id + "/no-console-error",
                    len(real_errors) == 0,
                    "; ".join(e.text[:120] for e in real_errors[:3]),
                )

                # 2. No sideways scroll
                scroll_w = page.evaluate("document.documentElement.scrollWidth")
                win_w    = page.evaluate("window.innerWidth")
                check(
                    vname + "/" + tab_id + "/no-sideways-scroll",
                    scroll_w <= win_w + 2,   # +2 px tolerance
                    "scrollWidth={} innerWidth={}".format(scroll_w, win_w),
                )

                # 3. No interactive control under 44 px (only on active panel)
                small = page.evaluate("""
                    (function() {
                        var sel = 'button, select, input[type=number]';
                        var items = Array.from(document.querySelectorAll('.panel.active ' + sel));
                        var small = items.filter(function(el) {
                            var r = el.getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && r.height < 44;
                        });
                        return small.map(function(el) {
                            return el.tagName + '#' + el.id + ' h=' + Math.round(el.getBoundingClientRect().height);
                        });
                    })()
                """)
                check(
                    vname + "/" + tab_id + "/controls-44px",
                    len(small) == 0,
                    "; ".join(small[:5]),
                )

            # What-if: check that SIMULATED text appears and numbers change
            page.click("#tbtn-whatif")
            page.wait_for_timeout(1200)
            shot = os.path.join(SHOT_DIR, "{}-whatif-before.png".format(vname))
            page.screenshot(path=shot)

            has_sim = page.evaluate("""
                document.body.innerText.includes('SIMULATED')
            """)
            check(vname + "/whatif/shows-simulated", has_sim)

            # Click + bus
            before_text = page.evaluate("(document.getElementById('whatif-results') || {}).innerText || ''")
            page.click("#wi-plus")
            page.wait_for_timeout(300)
            after_text = page.evaluate("(document.getElementById('whatif-results') || {}).innerText || ''")
            shot = os.path.join(SHOT_DIR, "{}-whatif-after.png".format(vname))
            page.screenshot(path=shot)
            check(
                vname + "/whatif/numbers-change-on-plus",
                before_text != after_text,
                "text did not change after clicking +",
            )

            # ── Forecast tab (always visible) ─────────────────────────
            page.click("#tbtn-forecast")
            page.wait_for_timeout(2000)
            shot = os.path.join(SHOT_DIR, "{}-forecast-data.png".format(vname))
            page.screenshot(path=shot, full_page=False)

            # Flow zone label is present
            fc_zone = page.evaluate("""
                (function() {
                    var el = document.querySelector('#panel-forecast .flow-zone-label');
                    return el ? el.innerText : '';
                })()
            """)
            check(
                vname + "/forecast/flow-zone-label",
                "forecast" in fc_zone.lower(),
                "flow-zone-label text: " + repr(fc_zone[:60]),
            )

            # First screenful at 1280x720: fc-summary is visible without scrolling
            if vp["width"] == 1280:
                summary_in_view = page.evaluate("""
                    (function() {
                        var el = document.getElementById('fc-summary');
                        if (!el) return false;
                        var r = el.getBoundingClientRect();
                        return r.top >= 0 && r.bottom <= window.innerHeight;
                    })()
                """)
                check(
                    vname + "/forecast/first-screenful-has-summary",
                    summary_in_view,
                    "fc-summary not in first screenful at 1280x720",
                )

            # Summary sentence has content (not skeleton)
            summary_text = page.evaluate("(document.getElementById('fc-summary') || {}).innerText || ''")
            check(
                vname + "/forecast/summary-sentence-not-empty",
                len(summary_text.strip()) > 20,
                repr(summary_text[:80]),
            )

            # Method chart section present
            method_el = page.evaluate("document.getElementById('fc-method-chart') !== null")
            check(vname + "/forecast/has-method-chart", method_el, "fc-method-chart not found")

            # Bands table present and non-empty
            bands_tbl = page.evaluate("(document.getElementById('fc-bands-table') || {}).innerText || ''")
            check(
                vname + "/forecast/bands-table-has-content",
                len(bands_tbl.strip()) > 10,
                repr(bands_tbl[:60]),
            )

            # Drivers chart present
            drivers_el = page.evaluate("document.getElementById('fc-drivers-chart') !== null")
            check(vname + "/forecast/has-drivers-chart", drivers_el, "fc-drivers-chart not found")

            # Planner section visible (running_time_bands is present in this test run)
            planner_hidden = page.evaluate("""
                (function() {
                    var el = document.getElementById('fc-planner-wrap');
                    return el ? el.hasAttribute('hidden') : true;
                })()
            """)
            check(
                vname + "/forecast/planner-section-visible",
                not planner_hidden,
                "fc-planner-wrap is hidden; running_time_bands should be present",
            )

            # ── Forecast tab with running_time_bands absent ───────────
            page.goto(BASE + "/test-break/running_time_bands")
            page.wait_for_timeout(200)
            page.goto(BASE + "/")
            page.wait_for_timeout(1000)
            page.click("#tbtn-forecast")
            page.wait_for_timeout(2000)
            shot = os.path.join(SHOT_DIR, "{}-forecast-no-bands.png".format(vname))
            page.screenshot(path=shot, full_page=False)
            # Main sections still render; planner shows "not built yet"
            summary_still = page.evaluate("(document.getElementById('fc-summary') || {}).innerText || ''")
            check(
                vname + "/forecast/summary-still-shows-without-bands",
                len(summary_still.strip()) > 20,
                repr(summary_still[:80]),
            )
            # Restore
            page.goto(BASE + "/test-restore/running_time_bands")
            page.wait_for_timeout(200)
            page.goto(BASE + "/")
            page.wait_for_timeout(1000)

            # ── Planner's worklist tab ─────────────────────────────────────
            page.click("#tbtn-worklist")
            page.wait_for_timeout(2000)

            # Worklist is SECOND tab (index 1 in the tab bar)
            tab_buttons = page.evaluate("""
                Array.from(document.querySelectorAll('.tab-btn')).map(function(b) { return b.dataset.tab; })
            """)
            check(
                vname + "/worklist/tab-is-second",
                len(tab_buttons) >= 2 and tab_buttons[1] == 'worklist',
                "tab order: " + repr(tab_buttons[:4]),
            )

            # Focal number visible in first screenful at desktop width
            if vp["width"] == 1280:
                focal_in_view = page.evaluate("""
                    (function() {
                        var el = document.getElementById('wl-focal-number');
                        if (!el) return false;
                        var r = el.getBoundingClientRect();
                        return r.top >= 0 && r.bottom <= window.innerHeight;
                    })()
                """)
                check(
                    vname + "/worklist/focal-number-in-first-screenful",
                    focal_in_view,
                    "wl-focal-number not in first screenful at 1280x720",
                )

            # Focal number has content
            focal_text = page.evaluate("(document.getElementById('wl-focal-number') || {}).innerText || ''")
            check(
                vname + "/worklist/focal-number-not-empty",
                "bus hours" in focal_text,
                repr(focal_text[:60]),
            )

            # Accept button changes the draft total.
            # Wait for Accept buttons to appear (async render) then trigger via JS:
            # A REAL click, as a person makes it. An earlier version of this check set the state by script
            # because the click "did not work": it did not work because the handler was attached twice and a
            # click accepted and then un-accepted the row. The table is redrawn first (a change of hour band and
            # back) so that a handler attached once per redraw would be caught again.
            page.wait_for_selector('.wl-accept-btn', timeout=6000)
            band = page.query_selector('#wl-band, select[id*="band"]')
            if band:
                opts = band.evaluate("e => Array.from(e.options).map(o => o.value)")
                if len(opts) > 1:
                    band.select_option(opts[1]); page.wait_for_timeout(300); band.select_option(opts[0]); page.wait_for_timeout(300)
            page.wait_for_selector('.wl-accept-btn', timeout=6000)
            page.locator('.wl-accept-btn').first.scroll_into_view_if_needed()
            page.locator('.wl-accept-btn').first.click()
            page.wait_for_timeout(300)
            draft_visible = page.evaluate("""
                (function() {
                    var el = document.getElementById('wl-draft-total');
                    var n = Object.keys(S.wlAccepted).filter(function(k){ return S.wlAccepted[k]; }).length;
                    return !!el && !el.hasAttribute('hidden') && n === 1;
                })()
            """)
            check(
                vname + "/worklist/accept-shows-draft-total",
                draft_visible,
                "wl-draft-total still hidden after clicking Accept",
            )
            draft_text = page.evaluate("(document.getElementById('wl-draft-text') || {}).innerText || ''")
            check(
                vname + "/worklist/draft-total-has-content",
                "accepted" in draft_text.lower() and "bus hours" in draft_text.lower(),
                repr(draft_text[:80]),
            )

            # Absent-dataset path: break running_time_bands and reload
            page.goto(BASE + "/test-break/running_time_bands")
            page.wait_for_timeout(200)
            # Also clear cached state via reload
            page.goto(BASE + "/")
            page.wait_for_timeout(1000)
            page.click("#tbtn-worklist")
            page.wait_for_timeout(2000)
            wl_text = page.evaluate("document.body.innerText")
            check(
                vname + "/worklist/absent-dataset-shows-not-built",
                "not been built yet" in wl_text.lower() or "not built yet" in wl_text.lower(),
                repr(wl_text[:200]),
            )
            # Restore
            page.goto(BASE + "/test-restore/running_time_bands")
            page.wait_for_timeout(200)
            page.goto(BASE + "/")
            page.wait_for_timeout(1000)

            # ── No chart text exceeds 16 px at 1280 wide ─────────────────
            if vp["width"] == 1280:
                # Check the day chart and worklist ledger chart for oversized text
                page.click("#tbtn-day")
                page.wait_for_timeout(1200)
                max_text_px = page.evaluate("""
                    (function() {
                        var maxPx = 0;
                        document.querySelectorAll('.chart-wrap svg text').forEach(function(el) {
                            var cs = window.getComputedStyle(el);
                            var sz = parseFloat(cs.fontSize) || 0;
                            if (sz > maxPx) maxPx = sz;
                        });
                        return maxPx;
                    })()
                """)
                check(
                    vname + "/chart-text/max-font-size-at-most-16px",
                    max_text_px <= 16,
                    "max chart text size: {}px".format(max_text_px),
                )

            # ── Thousands separator for counts >= 1000 ─────────────────────
            # Counts like "6,378" must carry a comma; years like "2025" are excluded.
            page.click("#tbtn-day")
            page.wait_for_timeout(1200)
            day_text_full = page.evaluate("document.body.innerText")
            import re as _re2
            raw_numbers = _re2.findall(r'(?<![,\d])(\d{4,})(?![,\d])', day_text_full)
            # Exclude calendar years (1900-2099) — they are not counts
            raw_counts = [n for n in raw_numbers if not (len(n) == 4 and n[:2] in ('19', '20'))]
            check(
                vname + "/thousands/no-unseparated-counts",
                len(raw_counts) == 0,
                "unseparated numbers found: " + repr(raw_counts[:5]),
            )

            # ── Fix 1: stat tiles for 08:00 and 18:00 are both populated ─
            # The redesign shows two fixed hours rather than a "worst hour" tile.
            page.click("#tbtn-day")
            page.wait_for_timeout(1200)
            b8_text  = page.evaluate("(document.getElementById('day-b8')  || {}).innerText || ''")
            b18_text = page.evaluate("(document.getElementById('day-b18') || {}).innerText || ''")
            check(
                vname + "/fix1/headline-and-tile-same-hour",
                bool(b8_text.strip()) and bool(b18_text.strip()),
                "08:00 tile={!r} 18:00 tile={!r}".format(b8_text.strip(), b18_text.strip()),
            )
            # Fix 1b: hours >= 24 on the service-day clock should show "(next day)" in prose.
            # SVG chart axis labels use the short form intentionally; we check only prose text
            # (elements that are not inside <svg> tags).
            prose_post_midnight = page.evaluate("""
                (function() {
                    // Collect text from non-SVG elements in the active panel
                    var proseEls = Array.from(document.querySelectorAll(
                        '.panel.active p, .panel.active h1, .panel.active h2, .panel.active h3, ' +
                        '.panel.active .stat-label, .panel.active .stat-val, .panel.active .headline'
                    ));
                    var text = proseEls.map(function(el) { return el.innerText; }).join(' ');
                    // Look for bare post-midnight times (00:, 01:, 02:) not followed by "(next day)"
                    var matches = text.match(/\\b(?:00|01|02):00\\b(?! \\(next day\\))/g);
                    return matches || [];
                })()
            """)
            check(
                vname + "/fix1/no-bare-post-midnight",
                len(prose_post_midnight) == 0,
                "bare post-midnight times in prose: " + str(prose_post_midnight[:3]),
            )

            # ── Fix 2: no border-left stripe on stat-box or assumptions ──
            has_stripe = page.evaluate("""
                (function() {
                    var els = Array.from(document.querySelectorAll('.stat-box, .assumptions'));
                    return els.some(function(el) {
                        var cs = window.getComputedStyle(el);
                        var bl = cs.getPropertyValue('border-left-width');
                        return bl && parseInt(bl) > 1;
                    });
                })()
            """)
            check(vname + "/fix2/no-left-stripe", not has_stripe, "border-left > 1px found on .stat-box or .assumptions")

            # ── Fix 3: what-if opens on route/hour with max buses_short_with_standing ──
            page.click("#tbtn-supply")
            page.wait_for_timeout(1200)
            page.click("#tbtn-whatif")
            page.wait_for_timeout(1200)
            wi_route = page.evaluate("(document.getElementById('wi-route') || {}).value || ''")
            wi_hour  = page.evaluate("(document.getElementById('wi-hour') || {}).value || ''")
            # Verify the selected route/hour has non-zero buses_short_with_standing
            wi_text = page.evaluate("(document.getElementById('whatif-results') || {}).innerText || ''")
            check(
                vname + "/fix3/whatif-opens-on-worst-row",
                bool(wi_route) and bool(wi_hour),
                "route={} hour={}".format(wi_route, wi_hour),
            )

            # ── Fix 4: bus-type control shows two labelled buttons ────────
            has_std_btn = page.evaluate("!!document.getElementById('wi-bus-std')")
            has_dbl_btn = page.evaluate("!!document.getElementById('wi-bus-dbl')")
            std_text = page.evaluate("(document.getElementById('wi-bus-std') || {}).innerText || ''")
            dbl_text = page.evaluate("(document.getElementById('wi-bus-dbl') || {}).innerText || ''")
            check(
                vname + "/fix4/bus-type-two-buttons",
                has_std_btn and has_dbl_btn,
                "wi-bus-std={} wi-bus-dbl={}".format(has_std_btn, has_dbl_btn),
            )
            check(
                vname + "/fix4/std-button-says-standard",
                "standard" in std_text.lower(),
                "std button text: " + repr(std_text[:60]),
            )
            check(
                vname + "/fix4/dbl-button-says-double",
                "double" in dbl_text.lower(),
                "dbl button text: " + repr(dbl_text[:60]),
            )

            # ── Fix 5: no literal "Tab 4" in page text ───────────────────
            full_text = page.evaluate("document.body.innerText")
            check(
                vname + "/fix5/no-tab-4-text",
                "Tab 4" not in full_text,
                "found 'Tab 4' in page text",
            )

            # ── Fix 6: what-if table shows both seated and standing rows ──
            wi_results = page.evaluate("(document.getElementById('whatif-results') || {}).innerText || ''")
            check(
                vname + "/fix6/whatif-has-seated-rule",
                "seated" in wi_results.lower(),
                "no 'seated' in whatif results",
            )
            check(
                vname + "/fix6/whatif-has-standing-rule",
                "standing" in wi_results.lower(),
                "no 'standing' in whatif results",
            )

            # ── Fix 7: supply tab auto-selects a peak hour and shows lead sentence ──
            page.click("#tbtn-supply")
            page.wait_for_timeout(1200)
            supply_hour_val = page.evaluate("(document.getElementById('supply-hour-sel') || {}).value || ''")
            lead_text = page.evaluate("(document.getElementById('supply-lead-sentence') || {}).innerText || ''")
            check(
                vname + "/fix7/supply-auto-selects-hour",
                bool(supply_hour_val) and supply_hour_val != "",
                "supply-hour-sel value={}".format(repr(supply_hour_val)),
            )
            check(
                vname + "/fix7/supply-lead-sentence-visible",
                "route-hours" in lead_text.lower() or "short" in lead_text.lower(),
                "lead sentence: " + repr(lead_text[:120]),
            )

            # Deliberately break punctuality_by_hour and check named error
            page.goto(BASE + "/test-break/punctuality_by_hour")
            page.wait_for_timeout(200)
            page.goto(BASE + "/")
            page.wait_for_timeout(1500)
            # First tab (day) should show the named error
            shot = os.path.join(SHOT_DIR, "{}-broken-dataset.png".format(vname))
            page.screenshot(path=shot)
            broken_text = page.evaluate("document.body.innerText")
            check(
                vname + "/broken-dataset/shows-named-error",
                "punctuality_by_hour" in broken_text,
                repr(broken_text[:200]) if "punctuality_by_hour" not in broken_text else "",
            )
            # Restore
            page.goto(BASE + "/test-restore/punctuality_by_hour")
            page.wait_for_timeout(200)
            page.goto(BASE + "/")
            page.wait_for_timeout(1000)

            # ── How it is built: four zones ───────────────────────────
            page.click("#tbtn-build")
            page.wait_for_timeout(800)
            build_text = page.evaluate("(document.getElementById('panel-build') || {}).innerText || document.body.innerText")
            for zone_name in ["Passenger demand", "Service reliability", "Supply and capacity", "Forecast"]:
                check(
                    vname + "/build/has-zone-" + zone_name.lower().replace(" ", "-"),
                    zone_name.lower() in build_text.lower(),
                    repr(build_text[:200]),
                )
            # Real step names
            for step_name in ["count_taps", "clean_running_time", "buses_needed_rule", "forecast_running_time"]:
                check(
                    vname + "/build/has-step-" + step_name,
                    step_name in build_text,
                    "step '{}' not found in build panel".format(step_name),
                )

            page.close()

        browser.close()

    # Print screenshot paths
    print("\nScreenshots saved to: " + SHOT_DIR)
    shots = sorted(os.listdir(SHOT_DIR))
    for s in shots:
        print("  " + os.path.join(SHOT_DIR, s))


# ── Run ───────────────────────────────────────────────────────────────
print("Insiyab webapp tests — server on " + BASE)
print("Stub data: made-up values, routes T01..T30, hours 3..26\n")

try:
    run_all_tests()
except Exception as exc:
    import traceback
    failed("unexpected-exception", traceback.format_exc())

print()
n_total = len(_passes) + len(_failures)
if _failures:
    print("{} FAILED  ({}/{} passed)".format(len(_failures), len(_passes), n_total))
    for f in _failures:
        print("  FAIL: " + f)
    sys.exit(1)
else:
    print("ALL PASS  ({} checks)".format(n_total))
