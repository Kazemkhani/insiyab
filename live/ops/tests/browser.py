"""Real browser checks against the separately built static console."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import sys
import os
import time
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=sys.argv[1]))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
shots = Path(__file__).parent / 'out'
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
        page.clock.install()
        page.goto(url)
        page.evaluate('document.fonts.ready')
        page.wait_for_selector('#map[data-ready=true]')
        page.wait_for_timeout(600)
        assert 'unavailable' not in page.locator('#map-note').inner_text().lower()
        assert int(page.locator('#map').get_attribute('data-buses')) > 0
        assert int(page.locator('.bus3d').get_attribute('data-count')) > 0
        assert int(page.locator('.bus3d').get_attribute('data-late')) > 0
        assert page.locator('.bus3d').evaluate('(e)=>getComputedStyle(e).pointerEvents') == 'none'
        page.locator('#time').fill('67980')
        assert page.locator('#replay-clock').inner_text() == '18:53'
        page.locator('#time').fill('57600')
        assert page.locator('#fixture-banner').is_visible()
        assert page.get_by_role('button',name='July scenario').is_visible()
        page.locator('#heat').click()
        assert 'Stand-in heat' in page.locator('#heat-info').inner_text()
        assert page.locator('#map').get_attribute('data-heat') == '3'
        heat_layout=page.evaluate(LAYOUT)
        assert not heat_layout['overflow'] and not heat_layout['overlaps'],(width,heat_layout)
        if width>=1440: assert page.evaluate('document.documentElement.scrollHeight <= innerHeight+1'), 'Desktop heat layout exceeds viewport'
        page.screenshot(path=str(shots/f'{width}x{height}-heat.png'),full_page=True)
        page.locator('#heat').click()
        assert page.locator('#map').get_attribute('data-heat') == '0'
        assert page.get_by_text('Stand-in forecasts · STAND-IN DATA, NOT A RESULT').is_visible()
        # Data-driven: use whatever judge-pick rows this build loaded (stand-in demo or stream C's output).
        rows = page.evaluate('window.INSIYAB_OPS_DATA.judge.rows')
        def miss(r):
            if r.get('forecast_mae') is not None and r.get('baseline_mae') is not None: return r['forecast_mae'], r['baseline_mae']
            return abs(r['forecast']-r['actual']), abs(r['baseline']-r['actual'])
        def closer(r): f, b = miss(r); return f < b
        valid = [r for r in rows if None not in (r['forecast'], r['baseline'], r['actual'])]
        for want, phrase in ((False, 'simple rule was closer'), (True, 'forecast was closer')):
            pick = next((r for r in valid if closer(r) == want and miss(r)[0] != miss(r)[1]), None)
            if pick is None: continue
            page.locator('#judge-route').select_option(pick['route'])
            page.locator('#judge-hour').select_option(pick['hour'])
            assert phrase in page.locator('.judge-result').inner_text(), (phrase, pick)
            cells = page.locator('tbody td').all_text_contents()
            assert cells[-1] == str(pick['n']), (cells, pick)
            if pick.get('forecast_mae') is not None:
                text = page.locator('.judge-result').inner_text()
                assert f"Forecast miss: {round(pick['forecast_mae'], 2):g}" in text, (text, pick)  # the miss is the MAE, not |mean - mean|
        present = {(r['route'], r['hour']) for r in rows}
        missing = next(((rt, h) for rt in sorted({r['route'] for r in rows}) for h in ('16:00','17:00','18:00','19:00','20:00') if (rt, h) not in present), None)
        if missing:
            page.locator('#judge-route').select_option(missing[0])
            page.locator('#judge-hour').select_option(missing[1])
            assert 'No held-out row' in page.locator('.judge-result').inner_text()
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
        page.clock.pause_at('2027-01-01T00:00:00Z')
        page.locator('#demo').click()
        page.clock.fast_forward(2000)
        assert page.locator('#calls').get_attribute('data-phase') == 'unacknowledged'
        assert page.locator('#escalation').is_visible()
        layout = page.evaluate(LAYOUT)
        assert not layout['overflow'] and not layout['overlaps'], (width,layout)
        if width>=1440: assert page.evaluate('document.documentElement.scrollHeight <= innerHeight+1'), 'Desktop countdown layout exceeds viewport'
        page.screenshot(path=str(shots/f'{width}x{height}-countdown.png'), full_page=True)
        page.evaluate("window.decisionEvents=[];window.addEventListener('insiyab:decision', e=>window.decisionEvents.push(e.detail))")
        page.locator('[data-option=hold]').evaluate('(e)=>e.click()')
        assert not page.locator('#confirm').count()
        page.locator('[data-option=hold]').click()
        assert page.locator('#calls').get_attribute('data-phase') == 'unacknowledged'
        page.locator('#confirm').evaluate('(e)=>e.click()')
        assert page.locator('#calls').get_attribute('data-phase') == 'unacknowledged'
        assert page.evaluate('window.decisionEvents.length') == 0
        page.get_by_role('button', name='Confirm decision:', exact=False).click()
        assert page.evaluate('window.decisionEvents.length') == 1
        assert page.evaluate('window.decisionEvents[0].option') == 'hold'
        assert page.locator('#calls').get_attribute('data-phase') == 'decided'
        assert page.locator('[data-option=hold]').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
        page.clock.fast_forward(1600)
        assert page.locator('[data-role=driver]').get_attribute('data-status') == 'sent'
        page.clock.fast_forward(2400)
        assert page.locator('[data-role=driver]').get_attribute('data-status') == 'received'
        assert page.locator('[data-role=depot]').get_attribute('data-status') == 'sent'
        page.clock.fast_forward(7800)
        assert page.locator('#calls').get_attribute('data-phase') == 'received'
        final_layout = page.evaluate(LAYOUT)
        assert not final_layout['overflow'] and not final_layout['overlaps'], (width,final_layout)
        # Rendered colour ownership, including generated status marks.
        invalid = page.evaluate('''() => [...document.querySelectorAll('body *')].filter(e=>{
          const c=getComputedStyle(e).color;
          if(c==='rgb(196, 43, 43)')return !e.closest('.risk,.alert-pulse');
          if(c==='rgb(46, 125, 107)')return !e.closest('.received');
          if(c==='rgb(156, 123, 62)')return !e.matches('#suggested h2') && !e.closest('.logo');
          return false;
        }).map(e=>e.outerHTML.slice(0,100))''')
        assert not invalid, invalid
        backgrounds=page.evaluate('''()=>[...document.querySelectorAll('body *')].filter(e=>{
          const s=getComputedStyle(e);
          if(s.fontFamily.includes('Instrument Serif'))return true;
          if(s.backgroundColor==='rgb(196, 43, 43)')return e.id!=='escalation';
          if(s.backgroundColor==='rgb(46, 125, 107)')return !e.closest('.received');
          if(s.borderTopColor==='rgb(156, 123, 62)'&&s.borderTopWidth!=='0px')return e.id!=='suggested';
          return false;
        }).map(e=>e.tagName+'#'+e.id)''')
        assert not backgrounds,backgrounds
        assert not calls, calls
        assert not errors, errors
        page.screenshot(path=str(shots/f'{width}x{height}.png'), full_page=True)
        print(f'PASS {width}x{height}: inline logo, attribution, no overflow, no text overlap, zero voice requests')
        page.close()
    page = browser.new_page()
    requests=[]
    page.route('**/*',lambda route:(requests.append(route.request.url),route.abort()) if '/voice/' in route.request.url else route.continue_())
    page.clock.install()
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    page.clock.pause_at('2027-01-01T00:00:00Z')
    page.locator('#demo').click()
    page.clock.fast_forward(12000)
    assert page.locator('#calls').get_attribute('data-phase') == 'calling_duty'
    page.clock.fast_forward(59900)
    assert page.locator('#calls').get_attribute('data-phase') == 'calling_duty'
    page.clock.fast_forward(100)
    assert page.locator('#calls').get_attribute('data-phase') == 'calling_supervisor'
    page.clock.fast_forward(60000)
    assert 'Neither decision-maker answered' in page.locator('#escalation').inner_text()
    assert not page.locator('.decision-stamp').count()
    assert not page.locator('.received').count()
    ctx=page.evaluate("window.insiyabOps.setMode('live')")
    def event(kind, role=None):
        return page.evaluate('(e)=>window.insiyabOps.onEvent({...e,at:Date.now()})',dict(ctx,type=kind,role=role))
    assert event('decided') is False
    assert event('received','driver') is False
    assert event('suggested') is True
    page.locator('[data-option=monitor]').click()
    assert event('decided') is False
    page.locator('#confirm').click()
    assert event('relaying') is True
    assert event('received','driver') is False
    assert event('sent','driver') is True
    assert event('received','driver') is True
    assert page.locator('[data-role=depot]').get_attribute('data-status') == 'calling'
    page.evaluate("window.insiyabOps.setMode('demo')")
    page.clock.fast_forward(200000)
    assert page.locator('#calls').get_attribute('data-phase') == 'predicted'
    assert not requests,requests
    print('PASS browser escalation, two human clicks, per-role events, stale-run isolation and zero voice requests')
    page.close()
    page = browser.new_page(reduced_motion='reduce')
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    page.get_by_role('button', name='Replay', exact=True).click()
    assert page.locator('#replay-clock').inner_text() == '20:00'
    assert page.locator('#map').get_attribute('data-playing') == 'false'
    print('PASS reduced motion: replay jumps to its final state without travel')
    assert page.locator('.alert-pulse').evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
    page.close()
    # Verify the source flag governs the banner, independent of packaged fallback.
    page=browser.new_page()
    page.add_init_script('''let payload;Object.defineProperty(window,'INSIYAB_OPS_DATA',{get(){return payload},set(v){v.alerts.fixture=false;payload=v}});''')
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    assert not page.locator('#fixture-banner').is_visible()
    print('PASS fixture=false removes the alerts banner; reduced-motion pulse is disabled')
    page.close()
    # Rehearse the actual 90-second stage sequence, without an accelerated clock.
    if os.environ.get('OPS_REALTIME')=='1':
        page=browser.new_page(viewport={'width':1440,'height':900})
        requests=[]
        page.route('**/*',lambda route:(requests.append(route.request.url),route.abort()) if '/voice/' in route.request.url else route.continue_())
        page.goto(url)
        page.wait_for_selector('#map[data-ready=true]')
        start=time.monotonic()
        page.locator('#demo').click()
        page.wait_for_selector('#calls[data-phase=calling_duty]',timeout=20000)
        assert not page.locator('.decision-stamp').count()
        page.wait_for_selector('#calls[data-phase=calling_supervisor]',timeout=65000)
        assert time.monotonic()-start>=71.5
        page.locator('[data-option=send_spare]').click()
        assert page.locator('#calls').get_attribute('data-phase') == 'calling_supervisor'
        page.locator('#confirm').click()
        page.wait_for_selector('[data-role=driver][data-status=received]',timeout=7000)
        assert page.locator('[data-role=depot]').get_attribute('data-status')=='sent'
        page.wait_for_function("document.querySelector('#lifecycle-status').textContent.includes('Demo complete')",timeout=25000)
        elapsed=time.monotonic()-start
        assert 89.5<=elapsed<=100,elapsed
        assert page.locator('[data-status=received]').count()==4
        assert not requests,requests
        page.screenshot(path=str(shots/'90-second-demo.png'),full_page=True)
        print(f'PASS real-time {elapsed:.1f}s demo: duty, supervisor, two clicks, four separate receipts, zero voice requests')
        page.close()
    browser.close()
with sync_playwright() as p:
    browser=p.webkit.launch()
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    page.wait_for_timeout(600)
    assert 'unavailable' not in page.locator('#map-note').inner_text().lower()
    assert int(page.locator('.bus3d').get_attribute('data-count'))>0
    assert not errors,errors
    page.screenshot(path=str(shots/'webkit-1440x900.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    sizes=page.locator('button,select,input[type=range],summary').evaluate_all('(nodes)=>nodes.filter(e=>e.getBoundingClientRect().height).map(e=>({name:e.id||e.textContent.slice(0,30),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))')
    assert all(s['height']>=44 and s['width']>=44 for s in sizes),sizes
    print('PASS WebKit: local map and buses render; every phone control has a 44-pixel touch target')
    browser.close()
server.shutdown()
print('ALL PASS')
