"""Check the delivered pack, offline interaction, timing and PDF page counts."""
import json
import sys
from pathlib import Path
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

out=Path(sys.argv[1]).resolve()
shots=Path(sys.argv[2]);shots.mkdir(parents=True,exist_ok=True)
data=json.loads(Path(__file__).with_name('content.json').read_text())
for p in data['people']:
    doc=PdfReader(out/(p['id']+'-brief.pdf'))
    assert len(doc.pages)==2
    text=' '.join(page.extract_text() for page in doc.pages)
    assert p['name'] in text and all(q in text for q,_ in p['qa'])
    print('PASS two-page personal brief with five Q&A: '+p['name'])
for s in data['segments']:
    words=len(s['say'].split());duration=s['end']-s['start']
    assert words/(duration/60)<125,(s['title'],words,duration)
assert sum(s['end']-s['start'] for s in data['segments'])==600
print('PASS ten-minute schedule and every cue below 125 spoken words per minute')
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True)
    for w,h,reduced in [(1280,720,False),(390,844,False),(320,568,False),(768,1024,False),(390,844,True)]:
        c=b.new_context(viewport={'width':w,'height':h},offline=True,reduced_motion='reduce' if reduced else 'no-preference')
        page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((out/'index.html').as_uri())
        assert page.locator('.toc a').count()==5
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for a in page.locator('a[href^="#"]').all():
            assert page.locator(a.get_attribute('href')).count()==1
        for person in data['people']:
            page.locator(f'.toc a[href="#{person["id"]}"]').click()
            assert page.locator('#'+person['id']+' h2').inner_text()==person['name']
            page.locator('#'+person['id']+' details summary').first.click()
            assert page.locator('#'+person['id']+' details').first.get_attribute('open') is not None
        page.locator('[data-step="2"]').click()
        assert '13 minutes' in page.locator('#mechanism-title').inner_text()
        assert page.locator('[data-step="2"]').get_attribute('aria-pressed')=='true'
        page.locator('#start').click();page.wait_for_timeout(1200);page.locator('#start').click()
        assert page.locator('#time').inner_text()!='0:00'
        stopped=page.locator('#time').inner_text();page.wait_for_timeout(1100)
        assert page.locator('#time').inner_text()==stopped
        page.locator('#reset').click();assert page.locator('#time').inner_text()=='0:00'
        assert page.locator('#notes details').count()==8
        assert all(p['name'] in page.locator('body').inner_text() for p in data['people'])
        assert page.locator('button').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height>=44)')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if reduced:
            assert page.locator('#bus').evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
        if w in (1280,390) and not reduced:
            page.evaluate('scrollTo(0,0)');page.wait_for_timeout(600);page.screenshot(path=str(shots/f'contents-{w}.png'))
            page.locator('#sara-alrifai').scroll_into_view_if_needed();page.wait_for_timeout(600);page.screenshot(path=str(shots/f'brief-{w}.png'))
        assert not errors,errors
        print(f'PASS offline {w}x{h}, reduced={reduced}: named links, Q&A, animation state, timer, eight notes, no overflow/errors')
        c.close()
    b.close()
print('ALL TEAM BRIEFING CHECKS PASS')
