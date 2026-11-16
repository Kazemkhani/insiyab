"""Real Metal browser, direct-file/offline walk and bundle mutation checks."""
import argparse, json, pathlib, re, tempfile, time
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('site');parser.add_argument('--shots');args=parser.parse_args()
site=pathlib.Path(args.site).resolve()
shots=pathlib.Path(args.shots) if args.shots else None
if shots: shots.mkdir(parents=True,exist_ok=True)
def check(condition,label):
    assert condition,label
    print('PASS',label,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-angle=metal'])
    for width,height,reduced in [(1280,720,False),(390,844,False),(320,568,False),(844,390,False),(390,844,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference',offline=True)
        page=context.new_page();errors=[];remote=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda req:remote.append(req.url) if req.url.startswith(('http:','https:')) else None)
        started=time.monotonic();page.goto(site.as_uri()+'/index.html');page.wait_for_function('window.insiyab && insiyab.deck.isInitialized')
        check(time.monotonic()-started<3,f'{width}: usable within three seconds from folder, network off')
        renderer=page.evaluate("""()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}""")
        check('Metal' in renderer and 'SwiftShader' not in renderer,'real graphics chip: '+renderer)
        check(page.locator('#fixture').is_visible(),f'{width}: stand-in label visible')
        check(page.locator('#map-failure').is_hidden(),f'{width}: map rendered')
        first=page.evaluate('insiyab.time');page.wait_for_timeout(250);second=page.evaluate('insiyab.time')
        check(second==first if reduced else second>first,f'{width}: reduced motion respected' if reduced else f'{width}: clock and buses moving')
        page.evaluate('insiyab.setTime(insiyab.model.meta.origins[0]+insiyab.model.meta.bin_seconds)')
        page.wait_for_timeout(150)
        check(page.evaluate('insiyab.buses.length>0'),f'{width}: buses exist at record time')
        # Find a moving trip and independently check the rendered position on its path.
        check(page.evaluate("""()=>{const m=insiyab.model,t=m.trips.find(t=>t.visits.length>1),a=t.visits[0],b=t.visits[1],time=(a.act_dep+b.act_arr)/2;insiyab.setTime(time);const bus=insiyab.deck.props.layers.find(l=>l.id==='buses').props.data.find(b=>b.trip_id===t.trip_id);const expected=(a.distance+b.distance)/2;return Math.abs(bus.distance-expected)<.0001;}"""),f'{width}: bus at the correct distance between recorded stops')
        page.evaluate('insiyab.setTime(insiyab.model.meta.origins[0]+insiyab.model.meta.bin_seconds)')
        fill=page.evaluate("""()=>{const p=insiyab.model.paths.flatMap(p=>p.points),f=insiyab.fit,r=document.querySelector('#map').getBoundingClientRect();return Math.max((Math.max(...p.map(p=>p[0]))-Math.min(...p.map(p=>p[0])))*f.scale/r.width,(Math.max(...p.map(p=>p[1]))-Math.min(...p.map(p=>p[1])))*f.scale/r.height)}""")
        check(fill>=.65,f'{width}: network fills {fill:.0%} of map')
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}: no horizontal overflow')
        sizes=page.locator('button,select,input[type=range]').evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>({id:e.id,height:e.getBoundingClientRect().height}))')
        check(all(e['height']>=44 for e in sizes),f'{width}: all controls at least 44px {sizes}')
        if width in [1280,390] and not reduced:
            rect=page.locator('#play').bounding_box();check(rect['y']+rect['height']<=height,f'{width}: clock control visible without scrolling')
            if shots:page.screenshot(path=str(shots/f'first-{width}x{height}.png'))
        page.locator('#entity-type').select_option('bus');check('model year' in page.locator('#detail').inner_text(),f'{width}: bus details')
        page.locator('#entity-type').select_option('community');check('boardings over the service day' in page.locator('#detail').inner_text(),f'{width}: community totals')
        # Negative control: the very same label assertion must reject a deleted label.
        page.locator('#fixture').evaluate('(e)=>e.hidden=true')
        try: assert page.locator('#fixture').is_visible()
        except AssertionError:print('PASS negative control rejects missing stand-in label')
        else:raise AssertionError('Label test cannot fail')
        check(not errors,f'{width}: no page errors {errors}')
        check(not remote,f'{width}: no runtime network requests {remote}')
        context.close()
    # A different bundle is embedded without changing app.js, proving the screen reads it.
    context=browser.new_context(offline=True);page=context.new_page()
    text=(site/'bundle.js').read_text();data=json.loads(text.removeprefix('window.INSIYAB_BUNDLE=').rstrip(';\n'))
    old=data['summary.json']['headline'][0]['value'];data['summary.json']['headline'][0]['value']=old+987
    for v in data.values():v['fixture']=False
    page.add_init_script('window.TEST_BUNDLE='+json.dumps(data))
    page.goto(site.as_uri()+'/index.html');page.wait_for_function('window.insiyab && insiyab.deck.isInitialized')
    page.evaluate('document.querySelectorAll("script").forEach(s=>s.remove()); window.INSIYAB_BUNDLE=window.TEST_BUNDLE')
    # A fresh page uses an actual changed bundle file, not an app-level override.
    context.close()
    import shutil
    with tempfile.TemporaryDirectory(prefix='insiyab-mutant-') as tmp:
        mutant=pathlib.Path(tmp);shutil.copytree(site,mutant,dirs_exist_ok=True)
        (mutant/'bundle.js').write_text('window.INSIYAB_BUNDLE='+json.dumps(data)+';')
        context=browser.new_context(offline=True);page=context.new_page();page.goto(mutant.as_uri()+'/index.html');page.wait_for_function('window.insiyab && insiyab.deck.isInitialized')
        check(page.locator('[data-headline]').inner_text().replace(',','')==str(old+987),'mutated bundle count changes the screen')
        check(page.locator('#fixture').is_hidden(),'fixture false removes stand-in label')
        try:assert page.locator('[data-headline]').inner_text().replace(',','')==str(old)
        except AssertionError:print('PASS negative control rejects stale hard-coded bundle count')
        else:raise AssertionError('Bundle test cannot fail')
        context.close()
    browser.close()
print('BROWSER PASS')
