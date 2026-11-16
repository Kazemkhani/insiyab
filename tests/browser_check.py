#!/usr/bin/env python3
"""The deployer's own look at the site in a real browser, at laptop and phone size. Run by scripts/deploy.sh,
first on the built folder and then on the served address. Lane 2 and lane 3 test their own screens in depth;
this checks only what must hold on every deploy, whoever built the page:

  the page loads, nothing on it throws, no file it asks for is missing, it does not scroll sideways,
  and when the bundle is stand-in data the words STAND-IN DATA, NOT A RESULT can be seen.

  python3 tests/browser_check.py <folder or address> [--fixture] [--khutwa] [--shots DIR]

The last line is "ERRORS: N"."""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

SIZES = {"laptop": (1280, 720), "phone": (390, 844)}
LABEL = "STAND-IN DATA, NOT A RESULT"
errors = []


def fail(msg):
    errors.append(msg); print("FAIL", msg)


def ok(msg):
    print("PASS", msg)


def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def look(browser, base, path, tag, size, fixture, shots):
    w, h = SIZES[size]
    ctx = browser.new_context(viewport={"width": w, "height": h})
    page = ctx.new_page(); thrown = []; missing = []
    page.on("pageerror", lambda e: thrown.append(str(e)[:200]))
    # A file that fails to load also writes a console line with no address in it. Those are judged below, by address, where the room relay's
    # calls are let through (a built folder has no relay); here only what the page's own code logged as an error is kept.
    page.on("console", lambda m: thrown.append(m.text[:200]) if m.type == "error" and not m.text.startswith("Failed to load resource") else None)
    page.on("requestfailed", lambda r: missing.append(r.url) if not r.url.startswith(base + "api/") else None)
    page.on("response", lambda r: missing.append(f"{r.status} {r.url}") if r.status >= 400 and r.url.startswith(base) and not r.url.startswith(base + "api/") else None)
    name = f"{tag} at {size}"
    try:
        resp = page.goto(base + path, wait_until="networkidle", timeout=45000)
    except Exception as e:
        fail(f"{name}: did not load: {str(e)[:160]}"); ctx.close(); return
    ok(f"{name} loads") if resp and resp.status == 200 else fail(f"{name}: answers {resp.status if resp else 'nothing'}")
    page.wait_for_timeout(1500)      # the room relay is given up on after two seconds; nothing may throw meanwhile
    if fixture:
        try:
            page.get_by_text(LABEL, exact=False).first.wait_for(state="visible", timeout=5000); ok(f"{name} says {LABEL}")
        except Exception:
            fail(f"{name}: the words {LABEL!r} cannot be seen")
    over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    ok(f"{name} does not scroll sideways") if over <= 1 else fail(f"{name}: scrolls sideways by {over} pixels")
    ok(f"{name} throws nothing") if not thrown else fail(f"{name}: page errors: {thrown[:3]}")
    ok(f"{name} finds every file") if not missing else fail(f"{name}: missing files: {missing[:3]}")
    if shots:
        os.makedirs(shots, exist_ok=True); page.screenshot(path=os.path.join(shots, f"{tag}-{size}.png"))
    ctx.close()


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); print("ERRORS: 1"); return 1
    target = args[0]; fixture = "--fixture" in args; khutwa = "--khutwa" in args
    shots = args[args.index("--shots") + 1] if "--shots" in args else None
    srv = None
    if target.startswith("http"):
        base = target.rstrip("/") + "/"
    else:
        srv = serve(target); base = f"http://127.0.0.1:{srv.server_address[1]}/"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size in SIZES:
            look(browser, base, "", "first screen", size, fixture, shots)
            if khutwa:
                look(browser, base, "khutwa/", "khutwa", size, fixture, shots)
        browser.close()
    if srv:
        srv.shutdown()
    print(f"ERRORS: {len(errors)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
