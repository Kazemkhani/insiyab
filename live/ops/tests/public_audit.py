"""Read-only public journey audit. Blocks every voice request and every write request.
Run with the same Playwright Python as run.sh. Findings intentionally return exit 1.
Generated evidence stays under ignored tests/out/; this is not the release gate.
"""
import argparse,json,re,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='https://insiyab.amirkazemkhani.com')
parser.add_argument('--out',type=Path,default=Path(__file__).parent/'out'/'public-audit')
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
base=args.base.rstrip('/');results=[];blocked=[]
def check(ok,persona,name,detail=''):
 row=dict(pass_=bool(ok),persona=persona,check=name,detail=detail);results.append(row)
 print(('PASS' if ok else 'FAIL')+f' [{persona}] {name}'+(f': {detail}' if detail else ''),flush=True)
def guard(route):
 if '/voice/' in route.request.url or route.request.method not in ('GET','HEAD'):
  blocked.append(route.request.url);route.abort()
 else:route.continue_()

with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(viewport={'width':1920,'height':1080},reduced_motion='reduce')
 context.route('**/*',guard)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 deployment=context.request.get(base+'/deploy.json').json()
 (args.out/'deployment.json').write_text(json.dumps(deployment,indent=2))
 for width,height in [(1920,1080),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for name,path in [('home','/'),('pitch','/pitch/'),('deck','/pitch/deck/'),('ops','/ops/')]:
   response=page.goto(base+path,wait_until='domcontentloaded');page.wait_for_timeout(1200)
   check(response.status==200,'accessibility',f'{name} loads at {width}',str(response.status))
   check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'accessibility',f'{name} no horizontal overflow at {width}')
   page.screenshot(path=str(args.out/f'{name}-{width}.png'),full_page=True)
   if name=='ops':
    page.wait_for_selector('#map[data-ready=true]')
    check(page.locator('#fixture-banner').is_visible(),'controller',f'{width}: stand-in alerts labelled')
   if name=='pitch':
    check(page.locator('#descent').evaluate("e=>e.classList.contains('static-story')"),'accessibility',f'{width}: reduced motion uses static chapters')
    check(page.locator('#worklist').count()==1,'planner',f'{width}: planner worklist exists')
   if name=='deck' and width==390:
    size=page.locator('.slide.on .lede').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)*document.querySelector("#stage").getBoundingClientRect().width/1920')
    check(size>=16,'accessibility','phone deck body text stays readable',f'{size:.1f} effective pixels; stage is uniformly scaled')
 page.set_viewport_size({'width':1920,'height':1080})
 page.goto(base+'/pitch/');page.wait_for_timeout(500)
 page.get_by_role('link',name='Insiyab Live, the console').click()
 page.wait_for_selector('#map[data-ready=true]')
 check('/ops/' in page.url,'controller','pitch navigation opens operations console')
 page.locator('#demo').click();start=time.monotonic()
 page.wait_for_selector('#calls[data-phase=calling_duty]',timeout=20000)
 check(not page.locator('.decision-stamp').count(),'controller','timeout never makes the human decision')
 page.wait_for_selector('#calls[data-phase=calling_supervisor]',timeout=65000)
 elapsed=time.monotonic()-start
 check(elapsed>=71.5,'controller','supervisor waits the full escalation period',f'{elapsed:.1f}s')
 page.locator('[data-option=send_spare]').click()
 check(page.locator('#calls').get_attribute('data-phase')=='calling_supervisor','controller','one click alone cannot decide')
 page.locator('#confirm').click()
 page.wait_for_selector('[data-role=driver][data-status=received]',timeout=7000)
 check(page.locator('[data-role=depot]').get_attribute('data-status')=='sent','controller','role receipts arrive separately')
 page.wait_for_function("document.querySelector('#lifecycle-status').textContent.includes('Demo complete')",timeout=25000)
 elapsed=time.monotonic()-start
 check(page.locator('[data-status=received]').count()==4 and 89.5<=elapsed<=105,'controller','real-time demo completes with four receipts',f'{elapsed:.1f}s')
 page.screenshot(path=str(args.out/'ops-demo-complete.png'),full_page=True)
 page.locator('#judge-route').select_option('8');page.locator('#judge-hour').select_option('18:00')
 check('simple rule was closer' in page.locator('.judge-result').inner_text(),'data-scientist','judge picker keeps model loss visible')
 page.locator('#judge-hour').select_option('20:00')
 check('No held-out row' in page.locator('#judge-pick').inner_text(),'data-scientist','missing route-hour is not invented')
 picker=page.locator('#judge-pick').inner_text()
 check('Stand-in forecasts' not in picker,'data-scientist','judge challenge has measured held-out predictions','Currently three invented route-hour rows, explicitly labelled')
 page.locator('#heat').click()
 check('July scenario' in page.locator('#heat').inner_text() and 'Stand-in' in page.locator('#heat-info').inner_text(),'planner','heat remains a labelled July scenario')
 page.screenshot(path=str(args.out/'ops-heat.png'),full_page=True)
 page.goto(base+'/pitch/deck/?s=7&all');page.wait_for_timeout(300)
 forecast=page.locator('.slide.on').inner_text();page.screenshot(path=str(args.out/'deck-model-evidence.png'))
 root=Path(__file__).resolve().parents[3]
 card=(root/'docs/MODEL-CARD.md').read_text()
 check(not ('STAND-IN DATA, NOT A RESULT' in card and 'Insiyab analysis on RTA records' in forecast),'data-scientist','forecast headline preserves source provenance','Model card labels the 43–46% figures as invented-data results; deck calls them RTA records')
 notes=page.locator('.slide').evaluate_all('es=>es.map(e=>e.dataset.notes||"")')
 duration=sum(int(m.group(1)) for n in notes if (m:=re.search(r'· (\d+) s',n)))+40
 check(duration<=480,'executive','planned stage sequence fits eight minutes',f'{duration}s including 40s film; planned timing, not measured delivery')
 page.goto(base+'/pitch/deck/?s=10&all');page.wait_for_timeout(200)
 heat=page.locator('.slide.on').inner_text()
 check('most stops are poles' not in heat,'executive','shelter claim respects incomplete coverage','993 poles among 1600 known kinds; 4526 total stops; majority of all stops not established')
 page.goto(base+'/pitch/deck/?s=11&all');page.wait_for_timeout(200)
 connections=page.locator('.slide.on').inner_text()
 check('proposal' in connections.lower() or 'Insiyab protects the whole journey' not in connections,'executive','connection dispatch has its proposal label beside the claim')
 page.goto(base+'/pitch/deck/?s=15&all');page.wait_for_timeout(200)
 close=page.locator('.slide.on').inner_text()
 check(all(x in close for x in ['One shift','Selected routes','Eight weeks']),'executive','closing ask specifies bounded pilot')
 check(not blocked,'controller','zero attempted voice or write requests',str(len(blocked)))
 check(not errors,'accessibility','no JavaScript exceptions',str(errors))
 after=context.request.get(base+'/deploy.json').json()
 check(after==deployment,'release','deployment identity stayed stable during audit',json.dumps(after))
 context.close();browser.close()
failed=sum(not r['pass_'] for r in results)
report={'time':datetime.now(timezone.utc).isoformat(),'base':base,'deployment':deployment,'results':results,'passed':len(results)-failed,'failed':failed,'blocked_requests':blocked}
(args.out/'results.json').write_text(json.dumps(report,indent=2))
print(f'PUBLIC AUDIT: {len(results)-failed} PASS, {failed} FAIL; zero real phone or relay calls',flush=True)
raise SystemExit(1 if failed else 0)
