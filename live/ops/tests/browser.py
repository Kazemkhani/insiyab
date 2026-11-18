"""Real browser checks against the separately built static console."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import sys
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=sys.argv[1]))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
shots = Path(__file__).parent / 'shots'
shots.mkdir(exist_ok=True)
LAYOUT = """() => {
 const visible = e => {if(e.closest('details:not([open])') && !e.closest('summary'))return false; const r=e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden'};
 const overflow = [...document.querySelectorAll('body *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1}).map(e=>e.tagName+'.'+e.className);
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT), boxes=[]; let n;
 while(n=walker.nextNode()) {if(!n.textContent.trim() || !visible(n.parentElement) || ['SCRIPT','STYLE','OPTION','TITLE'].includes(n.parentElement.tagName) || n.parentElement.closest('svg,canvas,[hidden]'))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&r.height)boxes.push({text:n.textContent.trim().slice(0,50),r});}
 const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2 && Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2)overlaps.push([a.text,b.text]);}
 return {overflow,overlaps};
}"""
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in [(1920,1080),(1440,900),(390,844),(1280,720)]:
        page = browser.new_page(viewport={'width':width,'height':height}, device_scale_factor=1)
        calls, errors = [], []
        page.route('**/*', lambda route: (calls.append(route.request.url),route.abort()) if '/voice/' in route.request.url else route.continue_())
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.evaluate('document.fonts.ready')
        page.wait_for_selector('#map[data-ready=true]')
        page.wait_for_timeout(600)
        assert 'unavailable' not in page.locator('#map-note').inner_text().lower()
        assert int(page.locator('#map').get_attribute('data-buses')) > 0
        page.locator('#time').fill('67980')
        assert page.locator('#replay-clock').inner_text() == '18:53'
        page.locator('#time').fill('57600')
        assert page.locator('#fixture-banner').is_visible()
        assert page.locator('#now h3').inner_text() == 'Route 310 · 19:23'
        assert page.locator('[data-option]').count() == 3
        assert page.get_by_text("Simulated pick: RTA's system is not connected").is_visible()
        assert page.locator('h1').inner_text() == 'Insiyab Live'
        assert page.locator('.logo svg').count() == 1
        assert page.get_by_text('OpenStreetMap contributors').is_visible()
        layout = page.evaluate(LAYOUT)
        assert not layout['overflow'], (width,layout)
        assert not layout['overlaps'], (width,layout)
        page.locator('#next summary').click()
        expanded = page.evaluate(LAYOUT)
        assert not expanded['overflow'] and not expanded['overlaps'], (width,expanded)
        page.locator('#next summary').click()
        if width == 390:
            assert page.locator('aside').bounding_box()['y'] >= page.locator('.map-column').bounding_box()['y'] + page.locator('.map-column').bounding_box()['height'] - 1
        assert not calls, calls
        assert not errors, errors
        page.screenshot(path=str(shots/f'{width}x{height}.png'), full_page=True)
        print(f'PASS {width}x{height}: inline logo, attribution, no overflow, no text overlap, zero voice requests')
        page.close()
    page = browser.new_page(reduced_motion='reduce')
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    page.get_by_role('button', name='Replay', exact=True).click()
    assert page.locator('#replay-clock').inner_text() == '20:00'
    assert page.locator('#map').get_attribute('data-playing') == 'false'
    print('PASS reduced motion: replay jumps to its final state without travel')
    browser.close()
server.shutdown()
print('ALL PASS')
