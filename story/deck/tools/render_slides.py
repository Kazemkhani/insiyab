#!/usr/bin/env python3
"""Render every deck slide at 1920x1080 using ?all=1&s=N.
Usage: python3 render_slides.py [output_dir]
"""
import sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

deck_dir = Path(__file__).parent.parent.resolve()
deck_html = deck_dir / 'index.html'
out_dir   = Path(sys.argv[1]) if len(sys.argv) > 1 else deck_dir / 'renders'
out_dir.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=metal'])
    # First load to count slides
    ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()
    page.goto(deck_html.as_uri())
    page.wait_for_timeout(1500)
    n_slides = page.evaluate("document.querySelectorAll('.slide').length")
    ctx.close()

    print(f'Found {n_slides} slides')

    errors = []
    for i in range(1, n_slides + 1):
        ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = ctx.new_page()
        js_errs = []
        page.on('pageerror', lambda e: js_errs.append(str(e)))
        page.goto(deck_html.as_uri() + f'?all=1&s={i}')
        page.wait_for_timeout(1800)  # allow fonts + animations to settle
        shot = out_dir / f'slide-{i:02d}.png'
        page.screenshot(path=str(shot))
        ctx.close()
        print(f'  slide {i:02d} -> {shot.name}', flush=True)
        if js_errs:
            print(f'    JS errors: {js_errs}')
            errors.append((i, js_errs))

    browser.close()

print(f'\nDone. {n_slides} renders in {out_dir}')
if errors:
    print(f'JS errors on slides: {[e[0] for e in errors]}')
    sys.exit(1)
