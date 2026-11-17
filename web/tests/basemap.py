"""
Basemap tests: serve the built site over a Range-capable HTTP server
and verify map, credit, buses, and no sideways scroll at 390px.
Usage: python3 web/tests/basemap.py <site-dir>
"""
import sys, os, threading, time, subprocess, json, math, re, http.server, socket

SITE = sys.argv[1] if len(sys.argv) > 1 else sys.exit('Usage: basemap.py <site-dir>')
if not os.path.isdir(SITE):
    sys.exit(f'Site directory not found: {SITE}')

# ── Range-capable HTTP server ─────────────────────────────────────────────
class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        try:
            f = open(path, 'rb')
        except (OSError, IsADirectoryError):
            self.send_error(404, 'Not found')
            return
        fs = os.fstat(f.fileno())
        total = fs.st_size
        rng = self.headers.get('Range', '')
        if rng and rng.startswith('bytes='):
            # Parse "bytes=start-end"
            parts = rng[6:].split('-')
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else total - 1
            end = min(end, total - 1)
            length = end - start + 1
            f.seek(start)
            data = f.read(length)
            f.close()
            ctype = self.guess_type(path)
            self.send_response(206)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(length))
            self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            self.wfile.write(data)
        else:
            ctype = self.guess_type(path)
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(total))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            self.wfile.write(f.read())
            f.close()

    def log_message(self, fmt, *args):
        pass  # silence server logs during tests

def find_free_port():
    with socket.socket() as s:
        s.bind(('', 0))
        return s.getsockname()[1]

port = find_free_port()
handler = lambda *a, **kw: RangeHandler(*a, directory=SITE, **kw)
server = http.server.HTTPServer(('127.0.0.1', port), handler)
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()
BASE = f'http://127.0.0.1:{port}'
print(f'  Range-capable server on {BASE}')

# ── Playwright checks ─────────────────────────────────────────────────────
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    sys.exit('playwright not installed — run: pip install playwright && playwright install chromium')

PASS = []
FAIL = []

def check(name, ok, detail=''):
    if ok:
        PASS.append(name)
        print(f'  PASS {name}')
    else:
        FAIL.append(name)
        print(f'  FAIL {name}' + (f': {detail}' if detail else ''))

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=['--use-angle=metal'])

    def make_page(width, height):
        ctx = browser.new_context(
            viewport={'width': width, 'height': height},
            # Intercept to record all network requests
        )
        ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page = ctx.new_page()
        # Collect all network requests (URLs)
        requests_seen = []
        page.on('request', lambda r: requests_seen.append(r.url))
        return page, requests_seen

    # ── Test 1: 1280×720 desktop ─────────────────────────────────────────
    page, reqs = make_page(1280, 720)
    page.goto(f'{BASE}/index.html', wait_until='networkidle', timeout=30000)
    page.locator('#guide-explore').click()

    # Wait for insiyab to be ready
    try:
        page.wait_for_function('window.insiyab && insiyab.deck && insiyab.deck.isInitialized', timeout=15000)
        deck_ok = True
    except PWTimeout:
        deck_ok = False
    check('deck-initialized-1280', deck_ok)

    # Every network request must be to our own origin
    external = [u for u in reqs if u.startswith('http') and not u.startswith(BASE)]
    check('no-external-requests', len(external) == 0,
          f'external: {external[:3]}')

    # MapLibre canvas has non-background pixels (uses WebGL so we screenshot the element)
    try:
        from PIL import Image
        import io
        map_el = page.locator('#map')
        ss_bytes = map_el.screenshot()
        img = Image.open(io.BytesIO(ss_bytes)).convert('RGB')
        px = img.load()
        bg = (246, 245, 241)  # paper #F6F5F1
        diff = sum(1 for y in range(0, img.height, 4) for x in range(0, img.width, 4)
                   if abs(px[x,y][0]-bg[0])>8 or abs(px[x,y][1]-bg[1])>8 or abs(px[x,y][2]-bg[2])>8)
        check('map-canvas-nonblank', diff > 20, f'non-bg pixels={diff}')
    except ImportError:
        # Pillow not available; fall back to a WebGL readPixels approach
        pixel_variety = page.evaluate('''() => {
            const canvas = document.querySelector('.maplibregl-canvas') ||
                           document.getElementById('map-canvas');
            if (!canvas) return -1;
            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            if (!gl) return -2;
            const w = Math.min(canvas.width, 100), h = Math.min(canvas.height, 100);
            const buf = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            const bg = [246, 245, 241];
            let diff = 0;
            for (let i = 0; i < buf.length; i += 4)
                if (Math.abs(buf[i]-bg[0])>8 || Math.abs(buf[i+1]-bg[1])>8 || Math.abs(buf[i+2]-bg[2])>8) diff++;
            return diff;
        }''')
        check('map-canvas-nonblank', isinstance(pixel_variety, int) and pixel_variety > 50,
              f'non-bg pixels={pixel_variety}')

    # OSM attribution credit is visible
    credit = page.locator('#map .map-credit')
    credit_text = credit.inner_text(timeout=5000) if credit.count() else ''
    box, frame = (credit.bounding_box() if credit.count() else None), page.locator('#map').bounding_box()
    # visible, and in the map's bottom-left corner: the first version of this credit drifted to the middle of the map and still passed a text check
    check('osm-credit-visible',
          'openstreetmap contributors' in credit_text.lower() and credit.is_visible() and box is not None
          and box['x'] - frame['x'] < 24 and (frame['y'] + frame['height']) - (box['y'] + box['height']) < 24,
          f'got: {credit_text!r} at {box} in {frame}')

    # Buses layer is drawn
    buses_drawn = page.evaluate('''() => {
        if (!window.insiyab) return false;
        const layers = insiyab.deck && insiyab.deck.props && insiyab.deck.props.layers;
        if (!layers) return false;
        const bl = layers.find(l => l.id === 'buses');
        return bl && bl.props && bl.props.data && bl.props.data.length > 0;
    }''')
    check('buses-drawn-1280', bool(buses_drawn), f'buses_drawn={buses_drawn}')

    # Screenshot 1280×720
    ss_desktop = '/tmp/basemap-work/basemap-1280x720.png'
    page.screenshot(path=ss_desktop)
    print(f'  Screenshot saved: {ss_desktop}')
    page.context.close()

    # ── Test 2: 390×844 mobile ───────────────────────────────────────────
    page2, reqs2 = make_page(390, 844)
    page2.goto(f'{BASE}/index.html', wait_until='networkidle', timeout=30000)
    page2.locator('#guide-explore').click()
    try:
        page2.wait_for_function('window.insiyab && insiyab.deck && insiyab.deck.isInitialized', timeout=15000)
        deck_ok2 = True
    except PWTimeout:
        deck_ok2 = False
    check('deck-initialized-390', deck_ok2)

    # No sideways scroll at 390px
    scroll_w = page2.evaluate('document.documentElement.scrollWidth')
    viewport_w = page2.evaluate('window.innerWidth')
    check('no-horizontal-scroll-390',
          scroll_w <= viewport_w + 2,
          f'scrollWidth={scroll_w} innerWidth={viewport_w}')

    # Buses still drawn at mobile
    buses_m = page2.evaluate('''() => {
        if (!window.insiyab) return false;
        const layers = insiyab.deck && insiyab.deck.props && insiyab.deck.props.layers;
        if (!layers) return false;
        const bl = layers.find(l => l.id === 'buses');
        return bl && bl.props && bl.props.data && bl.props.data.length > 0;
    }''')
    check('buses-drawn-390', bool(buses_m))

    # Screenshot 390×844
    ss_mobile = '/tmp/basemap-work/basemap-390x844.png'
    page2.screenshot(path=ss_mobile)
    print(f'  Screenshot saved: {ss_mobile}')
    page2.context.close()

    browser.close()

server.shutdown()

# ── Summary ───────────────────────────────────────────────────────────────
print(f'\n  basemap: {len(PASS)} passed, {len(FAIL)} failed')
if FAIL:
    print('  FAIL items:', FAIL)
    sys.exit(1)
print('  ALL PASS')
