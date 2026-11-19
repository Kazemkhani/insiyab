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
    # Theatre: new sequence — staff call BEFORE the decision.
    # predicted → suggested → unacknowledged → calling staff (red rings) →
    # talking + reports into ONE BRIEFING → decided → relaying → Sent → Received →
    # incident report → learn card.
    page = browser.new_page(viewport={'width':1440,'height':900})
    th_requests = []
    page.route('**/*', lambda route: (th_requests.append(route.request.url), route.abort()) if '/voice/' in route.request.url else route.continue_())
    page.clock.install()
    page.goto(url)
    page.wait_for_selector('#map[data-ready=true]')
    page.clock.pause_at('2027-01-01T00:00:00Z')
    # The NOW card comes from the alerts file, not the judge picker; the picker's rows are the model's output.
    assert page.locator('#now h3').inner_text() == 'Route 310 · 19:23'
    # Before demo: no theatre markers in the DOM (not added yet).
    assert page.locator('[data-person]').count() == 0
    page.screenshot(path=str(shots/'theatre-01-idle.png'), full_page=True)
    page.locator('#demo').click()
    page.clock.fast_forward(2000)
    assert page.locator('#calls').get_attribute('data-phase') == 'unacknowledged'
    # Staff should already be in calling state (red rings) at unacknowledged, not at relaying.
    calling_count = page.evaluate('''() => [...document.querySelectorAll('[data-person]')]
        .filter(e => e.dataset.state === 'calling').length''')
    assert calling_count == 4, f'Expected 4 calling markers at unacknowledged, got {calling_count}'
    # Red border on calling rings — borderTopColor (shorthand is empty in Chromium).
    red_ok = page.evaluate('''() => {
      const els = [...document.querySelectorAll('.theatre-marker[data-state=calling] .marker-ring')];
      return els.length === 4 && els.every(e => getComputedStyle(e).borderTopColor.includes('196, 43, 43'));
    }''')
    assert red_ok, 'Four calling markers with red ring border expected at unacknowledged'
    assert page.locator('#briefing').is_hidden()
    assert page.locator('#incident-report').is_hidden()
    page.screenshot(path=str(shots/'theatre-02-calling.png'), full_page=True)
    # Advance enough for all 4 staff to finish talking; longest is depot (~8.4 s from demo start).
    # At demo+12000 ms the lifecycle escalates to calling_duty — still pre-decision.
    page.clock.fast_forward(10000)
    # KEY ASSERTION: all four 'talking' states occurred BEFORE 'decided'.
    # Proof: each marker is now in 'reported' (calling → talking → reported). They talked
    # before the user has clicked confirm, so the decision has not been made yet.
    # theatre.mjs schedules 'reported' via a separate later() at the same depth as the
    # 'talking' later() — both are depth-1 within-range timers that fire within one
    # fast_forward, without relying on streamWords word-timeout cascading.
    reported_count = page.evaluate('''() => [...document.querySelectorAll('[data-person]')]
        .filter(e => e.dataset.state === 'reported').length''')
    assert reported_count == 4, (
        f'All four staff must reach "reported" state (talking complete) before the decision; '
        f'got {reported_count}')
    # Briefing must have all 4 rows — reports flew in pre-decision.
    assert page.locator('#briefing').is_visible()
    pre_rows = page.locator('.briefing-row').count()
    assert pre_rows == 4, f'Expected 4 briefing rows pre-decision, got {pre_rows}'
    page.screenshot(path=str(shots/'theatre-03-briefing.png'), full_page=True)
    # User decides via the two-click on-screen path (available throughout all pre-decided phases).
    page.locator('[data-option=send_spare]').click()
    page.get_by_role('button', name='Confirm decision:', exact=False).click()
    assert page.locator('#calls').get_attribute('data-phase') == 'decided'
    # Controller marker appears in 'decided' state.
    page.clock.fast_forward(100)
    assert page.locator('[data-person=controller]').get_attribute('data-state') == 'decided'
    page.screenshot(path=str(shots/'theatre-04-decided.png'), full_page=True)
    # Advance through relaying → driver sent.
    page.clock.fast_forward(1600)
    assert page.locator('[data-role=driver]').get_attribute('data-status') == 'sent'
    # Non-hidden markers still present (staff transitioning from reported → sent/received).
    present = page.evaluate('''() => [...document.querySelectorAll('[data-person]')]
        .filter(e => e.dataset.state !== 'hidden').length''')
    assert present > 0, f'Expected markers visible during relay, got {present}'
    page.screenshot(path=str(shots/'theatre-05-relaying.png'), full_page=True)
    page.clock.fast_forward(2400)
    assert page.locator('[data-role=driver]').get_attribute('data-status') == 'received'
    # Teal border on received markers (borderTopColor — shorthand is empty in Chromium).
    teal_ok = page.evaluate('''() => {
      const els = [...document.querySelectorAll('.theatre-marker[data-state=received] .marker-ring')];
      return els.length === 0 || els.every(e => getComputedStyle(e).borderTopColor.includes('46, 125, 107'));
    }''')
    assert teal_ok, 'received marker ring border should be teal'
    page.screenshot(path=str(shots/'theatre-06-driver-received.png'), full_page=True)
    page.clock.fast_forward(7800)
    assert page.locator('#calls').get_attribute('data-phase') == 'received'
    # Flush the 150ms theatre timers that fire near the end of the relay window.
    page.clock.fast_forward(300)
    # All four markers in received state; briefing rows still 4 (pre-decision reports).
    received_markers = page.evaluate('''() => [...document.querySelectorAll('.theatre-marker[data-state=received]')].length''')
    assert received_markers == 4, f'Expected 4 received markers, got {received_markers}'
    assert page.locator('#briefing').is_visible()
    briefing_rows = page.locator('.briefing-row').count()
    assert briefing_rows == 4, f'Expected 4 briefing rows, got {briefing_rows}'
    assert page.locator('#incident-report').is_visible()
    assert page.locator('.print-btn').count() == 1
    page.screenshot(path=str(shots/'theatre-07-all-received.png'), full_page=True)
    # Learn card appears after 1200ms timeout in briefing.mjs.
    page.clock.fast_forward(1500)
    assert page.locator('#learn').is_visible()
    page.screenshot(path=str(shots/'theatre-08-learn-card.png'), full_page=True)
    # PDF export: page.pdf() should produce a non-trivial PDF.
    pdf_bytes = page.pdf(format='A4', print_background=False)
    assert len(pdf_bytes) > 2000, f'PDF unexpectedly small: {len(pdf_bytes)} bytes'
    # Reset: markers hidden, panels hidden.
    page.locator('#demo').click()
    page.clock.fast_forward(200)
    visible_after_reset = page.evaluate('''() => [...document.querySelectorAll('[data-person]')]
        .filter(e => e.dataset.state !== 'hidden').length''')
    assert visible_after_reset == 0, f'{visible_after_reset} marker(s) still visible after demo reset'
    assert page.locator('#briefing').is_hidden()
    assert not th_requests, th_requests
    print('PASS theatre: staff call before decision (4 reported pre-decided), red calling rings at unacknowledged, teal received rings, 4 pre-decision briefing rows, incident report, learn card, PDF, reset, zero voice requests')
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
