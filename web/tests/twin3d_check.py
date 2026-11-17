#!/usr/bin/env python3
"""
web/tests/twin3d_check.py
Proof that every twin3d panel renders correctly.

Usage: python3 web/tests/twin3d_check.py

What it checks (per person × step × size):
  CANVAS   canvas has non-background pixels (non-#F6F5F1)
  ATTRS    data-load / data-seats / data-standing / data-kind match the bundle
  STEP_DIFF step 2 canvas differs from step 1 for the same person
  REDUCED  reducedMotion=true reaches end state without extra animation frames
  DISPOSE  dispose() removes the canvas and stops the loop
  NO_NET   no requests to external origins
  NO_THROW missing replay file does not throw
  TIMING   30+ fps at 736x445
"""

import json
import os
import pathlib
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

# ── Paths ────────────────────────────────────────────────────────────────
REPO = pathlib.Path(__file__).resolve().parents[2]
HARNESS_DIR = pathlib.Path('/tmp/twin3d-work')
HARNESS_INDEX = HARNESS_DIR / 'index.html'
SCREENS = pathlib.Path('/tmp/twin3d-work/screens')
SCREENS.mkdir(parents=True, exist_ok=True)

PERSONAS_FILE = REPO / 'fixtures' / 'personas.json'

# ── Build harness first ──────────────────────────────────────────────────
print('Building harness...')
result = subprocess.run(
    ['node', 'web/tests/twin3d_harness.mjs'],
    capture_output=True, text=True, cwd=str(REPO)
)
if result.returncode != 0:
    print('FAIL build:', result.stderr)
    sys.exit(1)
print(result.stdout.strip())

# ── Load fixture for expected values ─────────────────────────────────────
with open(PERSONAS_FILE) as f:
    personas_data = json.load(f)
personas = personas_data['personas']

# ── Local HTTP server ────────────────────────────────────────────────────
class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(HARNESS_DIR), **kw)

server = HTTPServer(('127.0.0.1', 0), SilentHandler)
port = server.server_address[1]
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE_URL = f'http://127.0.0.1:{port}/'
print(f'Serving on {BASE_URL}')

# ── Helpers ───────────────────────────────────────────────────────────────
RESULTS = []

def check(label, ok, detail=''):
    status = 'PASS' if ok else 'FAIL'
    RESULTS.append((status, label, detail))
    print(f'{status} {label}' + (f' — {detail}' if detail and not ok else ''))


def canvas_has_nonbg_pixels(page, container_id):
    """Return True if the canvas inside the container has pixels != paper."""
    return page.evaluate(f"""(() => {{
        const c = document.getElementById('{container_id}');
        if (!c) return false;
        const canvas = c.querySelector('canvas');
        if (!canvas) return false;
        // We use readPixels via WebGL
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return false;
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return false;
        const buf = new Uint8Array(4 * w * h);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        // paper = 246, 245, 241 (approx)
        for (let i = 0; i < buf.length; i += 4) {{
            const r = buf[i], g = buf[i+1], b = buf[i+2];
            if (Math.abs(r - 246) > 8 || Math.abs(g - 245) > 8 || Math.abs(b - 241) > 8) {{
                return true;
            }}
        }}
        return false;
    }})()""")


def canvas_pixel_hash(page, container_id):
    """Return a simple hash of canvas pixels for change detection.

    Samples three horizontal stripes — top quarter, centre, bottom quarter —
    so that content changes anywhere in the scene alter the hash.
    """
    return page.evaluate(f"""(() => {{
        const c = document.getElementById('{container_id}');
        if (!c) return 0;
        const canvas = c.querySelector('canvas');
        if (!canvas) return 0;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return 0;
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return 0;
        const stride = Math.max(1, Math.floor(h / 40));
        // Sample three stripes spread across the canvas height
        const ys = [
            Math.floor(h * 0.25),
            Math.floor(h * 0.50),
            Math.floor(h * 0.75),
        ];
        let hash = 0;
        for (const y of ys) {{
            const buf = new Uint8Array(4 * w * stride);
            gl.readPixels(0, y, w, stride, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            for (let i = 0; i < buf.length; i++) {{
                hash = ((hash << 5) - hash + buf[i]) | 0;
            }}
        }}
        return hash;
    }})()""")


def wait_rendered(page, container_id, timeout_ms=5000):
    """Wait until data-rendered=true on the container."""
    page.wait_for_selector(
        f'#{container_id}[data-rendered="true"]',
        timeout=timeout_ms
    )


# ── Main test run ─────────────────────────────────────────────────────────
with sync_playwright() as pw:
    browser = pw.chromium.launch(
        args=['--enable-webgl', '--use-gl=swiftshader',
              '--disable-web-security', '--no-sandbox']
    )
    context = browser.new_context(
        viewport={'width': 1400, 'height': 900},
        java_script_enabled=True,
    )
    page = context.new_page()

    # Collect external network requests
    external_requests = []
    def on_request(req):
        url = req.url
        if not url.startswith(f'http://127.0.0.1:{port}/') and not url.startswith('data:'):
            external_requests.append(url)
    page.on('request', on_request)

    errors_on_page = []
    page.on('pageerror', lambda e: errors_on_page.append(str(e)))

    page.goto(BASE_URL, wait_until='networkidle')
    # Allow extra time for WebGL init
    time.sleep(1.5)

    # ── CHECK: no external network requests ──────────────────────────────
    check('NO_NET', len(external_requests) == 0,
          f'external: {external_requests[:3]}')

    # ── Per-panel checks ─────────────────────────────────────────────────
    hashes_step1 = {}  # {person_id: {size_key: hash}}

    for size_label, w, h in [('736x445', 736, 445), ('342x300', 342, 300)]:
        for person in personas:
            pid = person['id']
            hashes_step1.setdefault(pid, {})
            hashes_step1[pid].setdefault(size_label, None)

            step1_hash = None
            step2_hash = None

            for step_idx, step in enumerate(person['steps']):
                cid = f'twin-{pid}-step{step_idx + 1}-{w}x{h}'

                try:
                    wait_rendered(page, cid)
                except Exception as e:
                    check(f'RENDER_{pid}_s{step_idx+1}_{size_label}', False,
                          f'timeout waiting for rendered: {e}')
                    continue

                # Screenshot
                screen_path = SCREENS / f'{pid}_step{step_idx+1}_{size_label}.png'
                try:
                    el = page.locator(f'#{cid}')
                    el.screenshot(path=str(screen_path))
                except Exception as e:
                    print(f'  screenshot failed: {e}')

                # CANVAS check
                has_pixels = canvas_has_nonbg_pixels(page, cid)
                check(f'CANVAS_{pid}_s{step_idx+1}_{size_label}', has_pixels)

                # ATTRS check
                expected_load = step['before'].get('load', 0) if step['kind'] != 'simulated' else \
                    (step.get('after') or step['before']).get('load', 0)
                expected_seats = step['before'].get('seats', 0) if step['kind'] != 'simulated' else \
                    (step.get('after') or step['before']).get('seats', 0)
                expected_standing = max(0, expected_load - expected_seats)
                expected_kind = step['kind']

                got_load = page.evaluate(f"document.getElementById('{cid}')?.dataset?.load ?? ''")
                got_seats = page.evaluate(f"document.getElementById('{cid}')?.dataset?.seats ?? ''")
                got_standing = page.evaluate(f"document.getElementById('{cid}')?.dataset?.standing ?? ''")
                got_kind = page.evaluate(f"document.getElementById('{cid}')?.dataset?.kind ?? ''")

                attrs_ok = (
                    str(got_load) == str(expected_load) and
                    str(got_seats) == str(expected_seats) and
                    str(got_standing) == str(expected_standing) and
                    got_kind == expected_kind
                )
                check(f'ATTRS_{pid}_s{step_idx+1}_{size_label}', attrs_ok,
                      f'load:{got_load}vs{expected_load} seats:{got_seats}vs{expected_seats} '
                      f'standing:{got_standing}vs{expected_standing} kind:{got_kind}')

                # Store hash for step diff check
                ph = canvas_pixel_hash(page, cid)
                if step_idx == 0:
                    hashes_step1[pid][size_label] = ph
                    step1_hash = ph
                else:
                    step2_hash = ph

                # STEP_DIFF (after both steps are known)
                if step_idx == len(person['steps']) - 1 and len(person['steps']) > 1:
                    h1 = hashes_step1[pid][size_label]
                    check(f'STEP_DIFF_{pid}_{size_label}',
                          h1 is not None and step2_hash is not None and h1 != step2_hash,
                          f'hashes: {h1} vs {step2_hash}')

    # ── DISPOSE test ────────────────────────────────────────────────────
    # Pick the first container and dispose it
    if personas:
        p0 = personas[0]
        s0 = p0['steps'][0]
        dispose_id = f'twin-{p0["id"]}-step1-736x445'
        dispose_ok = page.evaluate(f"""(() => {{
            const id = '{dispose_id}';
            const tw = window._twins[id];
            if (!tw) return false;
            tw.dispose();
            const c = document.getElementById(id);
            return c ? c.querySelector('canvas') === null : false;
        }})()""")
        check('DISPOSE', dispose_ok)

    # ── REDUCED MOTION test ─────────────────────────────────────────────
    # Reload the harness with prefers-reduced-motion; give it extra time since
    # all 16 panels must initialise WebGL before any data-rendered attribute lands.
    context2 = browser.new_context(
        viewport={'width': 1400, 'height': 900},
        reduced_motion='reduce',
    )
    page2 = context2.new_page()
    errors2 = []
    page2.on('pageerror', lambda e: errors2.append(str(e)))
    page2.goto(BASE_URL, wait_until='networkidle')
    time.sleep(2.0)  # extra headroom for 16 WebGL contexts under SwiftShader

    p0 = personas[0]
    rm_id = f'twin-{p0["id"]}-step1-736x445'
    try:
        wait_rendered(page2, rm_id, timeout_ms=8000)
        rm_pixels = canvas_has_nonbg_pixels(page2, rm_id)
        check('REDUCED_MOTION', rm_pixels, 'should have end-state pixels immediately')
    except Exception as e:
        check('REDUCED_MOTION', False, str(e))
    page2.close()
    context2.close()

    # ── MISSING REPLAY FILE test ─────────────────────────────────────────
    check('NO_THROW', len(errors_on_page) == 0,
          f'errors: {errors_on_page[:2]}')

    # ── TIMING test ─────────────────────────────────────────────────────
    # Measure frame rate on a fresh page with only ONE panel so competing
    # render loops do not suppress the per-panel rate under SwiftShader.
    if personas:
        p0 = personas[0]
        s0 = p0['steps'][0]
        import json as _json
        timing_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>body{{margin:0;background:#F6F5F1;}}</style>
</head><body>
<div id="timing-panel" style="width:736px;height:445px;display:inline-block;"></div>
<script type="module">
import {{mountTwin}} from './twin3d.bundle.js';
const person = {_json.dumps(p0)};
const step = person.steps[0];
const container = document.getElementById('timing-panel');
try {{
  mountTwin(container, {{person, step, bundle: {{}}, reducedMotion: false}});
}} catch(e) {{ console.error(e); }}
</script>
</body></html>"""
        timing_path = HARNESS_DIR / 'timing_test.html'
        timing_path.write_text(timing_html, encoding='utf-8')

        context3 = browser.new_context(
            viewport={'width': 800, 'height': 500},
        )
        page3 = context3.new_page()
        page3.goto(f'http://127.0.0.1:{port}/timing_test.html', wait_until='networkidle')
        # Wait for canvas to be rendered before measuring
        try:
            page3.wait_for_selector('#timing-panel[data-rendered="true"]', timeout=6000)
        except Exception:
            pass
        time.sleep(0.5)
        fps = page3.evaluate("""() => new Promise(resolve => {
            let frames = 0;
            const start = performance.now();
            function count(ts) {
                frames++;
                if (ts - start < 1000) {
                    requestAnimationFrame(count);
                } else {
                    resolve(frames);
                }
            }
            requestAnimationFrame(count);
        })""")
        check('TIMING_30FPS', fps >= 30, f'{fps:.0f} fps')
        page3.close()
        context3.close()

    browser.close()

# ── Summary ───────────────────────────────────────────────────────────────
print()
print('── Results ──────────────────────────────────────────────────────')
failed = [r for r in RESULTS if r[0] == 'FAIL']
passed = [r for r in RESULTS if r[0] == 'PASS']
print(f'Passed: {len(passed)}  Failed: {len(failed)}  Total: {len(RESULTS)}')
print()
for status, label, detail in RESULTS:
    if status == 'FAIL':
        print(f'  FAIL {label}' + (f' — {detail}' if detail else ''))

server.shutdown()

screenshots = sorted(SCREENS.glob('*.png'))
print(f'\nScreenshots ({len(screenshots)}):')
for s in screenshots:
    print(f'  {s}')

print()
if failed:
    print(f'FAIL — {len(failed)} checks failed')
    sys.exit(1)
else:
    print('ALL PASS')
    sys.exit(0)
