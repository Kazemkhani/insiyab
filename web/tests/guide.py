"""First-visit story, capacities and onward journeys, with all networking off."""
import json,pathlib,sys,tempfile,shutil,time
from playwright.sync_api import sync_playwright
site=pathlib.Path(sys.argv[1]).resolve()
def check(ok,label):
 assert ok,label
 print('PASS guide:',label,flush=True)
def counts(page):
 return page.evaluate("()=>{const s=insiyabScene.scene;return {seats:s.getObjectsByProperty('name','seat').length,seated:s.getObjectsByProperty('name','seated-passenger').length,standing:s.getObjectsByProperty('name','passenger-above-seats').length}}")
with sync_playwright() as p:
 b=p.chromium.launch(args=['--use-angle=metal'])
 for w,h,reduced in [(1280,720,False),(390,844,False),(320,568,True)]:
  c=b.new_context(viewport={'width':w,'height':h},offline=True,reduced_motion='reduce' if reduced else 'no-preference');pg=c.new_page();errors=[];remote=[]
  pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http:','https:')) else None)
  started=time.monotonic();pg.goto(site.as_uri()+'/index.html');pg.wait_for_function('window.insiyabGuide&&window.insiyabScene')
  check(time.monotonic()-started<3,'first story renders within three seconds offline')
  check(pg.locator('#guide').is_visible() and pg.locator('#replay').is_hidden(),'new visitor sees one guided story before the dashboard')
  pair=pg.evaluate('insiyabGuide.pair');busy,spare=pair['from'],pair['to']
  expected={'seats':busy['seats'],'seated':min(busy['seats'],busy['largest_load']),'standing':max(0,busy['largest_load']-busy['seats'])}
  check(counts(pg)==expected,'passenger: scene has the exact busy-trip seats and people')
  if h>=720:
   rect=pg.locator('#guide-next').bounding_box();check(rect['y']+rect['height']<=h,'first action is visible without scrolling')
  check(pg.locator('#guide-title').inner_text()=='The bus arrives. Not enough seats.','judge: the first heading states the problem')
  check('forecasts how many people will board and how late buses will be' in pg.locator('.guide-lead').inner_text(),'judge: first screen explains both forecasts in plain words')
  pg.wait_for_timeout(1700);check(pg.evaluate('insiyabGuide.step')==0,'story waits for the visitor instead of advancing itself')
  check(pg.locator('#guide-scene canvas').evaluate("e=>getComputedStyle(e).touchAction.includes('pan-y')"),'phone swipes can scroll over the 3D scene')
  check(pg.evaluate('insiyabScene.reduced')==reduced,'reduced motion preference reaches the 3D renderer')
  for i in [1,2]:
   pg.locator('#guide-next').focus();pg.keyboard.press('Enter');check(pg.evaluate('insiyabGuide.step')==i,'keyboard advances to chapter '+str(i+1))
   check(pg.evaluate("document.activeElement.id==='guide-title'"),'new heading receives focus')
   check(pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow at '+str(w))
  pg.locator('#guide-next').click();pg.wait_for_timeout(1700)
  check(pg.evaluate('insiyabGuide.swapped'),'visitor performs the swap')
  check(counts(pg)=={'seats':spare['seats'],'seated':min(spare['seats'],busy['largest_load']),'standing':max(0,busy['largest_load']-spare['seats'])},'planner: exact same passengers and proposed larger capacity')
  check(pg.locator('#guide-scene .scene-simulation').is_visible() and 'driver duties still need checking' in pg.locator('#guide-note').inner_text(),'proposal remains visibly simulated with feasibility limits')
  check(pg.evaluate("insiyabScene.scene.getObjectByName('bus').position.x===-1"),'swap holds the bus in place while capacity changes')
  pg.locator('#guide-undo').click();check(counts(pg)==expected,'undo restores the original capacity and passengers')
  pg.locator('#guide-next').click();pg.locator('#guide-next').click()
  check('smaller miss is better' in pg.locator('.guide-lead').inner_text(),'judge: the error comparison explains which direction is better')
  pg.locator('#guide-test').click();pg.wait_for_function("window.insiyab&&insiyab.view==='forecast'&&document.querySelector('#forecast-stop').options.length>0")
  check(pg.locator('#pick-stop').is_visible(),'evidence action opens a working forecast experiment')
  pg.locator('#guide-return').click();check(pg.evaluate("insiyabGuide.step===3&&document.activeElement.id==='guide-title'"),'return keeps the visitor’s place and moves keyboard focus to the heading')
  pg.locator('#guide-next').click();check('seat is not reserved' in pg.locator('#guide-note').inner_text(),'passenger offer does not promise a reservation')
  check(pg.locator('#guide a[href="khutwa/"]').count()==1,'passenger can continue to Khutwa')
  pg.locator('#guide-next').click();pg.wait_for_function("insiyab.view==='replay'&&insiyab.deck.isInitialized")
  check(pg.locator('#replay').is_visible(),'completed story opens the network')
  pg.locator('.brand').click();check(pg.evaluate('insiyabGuide.step')==0,'brand restarts the introduction')
  check(not errors and not remote,'all chapters and onward journeys have no page errors or external requests')
  c.close()
 # Change the authoritative pair while leaving persona counts unchanged.
 with tempfile.TemporaryDirectory(prefix='insiyab-guide-') as tmp:
  target=pathlib.Path(tmp)/'site';shutil.copytree(site,target)
  bundle=json.loads((target/'bundle.js').read_text().removeprefix('window.INSIYAB_BUNDLE=').rstrip(';\n'))
  swap=next(d for d in bundle['decisions.json']['decisions'] if d['lever']=='right_bus')['swaps'][0]
  swap['from']['largest_load']=swap['from']['seats']+3
  (target/'bundle.js').write_text('window.INSIYAB_BUNDLE='+json.dumps(bundle)+';')
  c=b.new_context(offline=True);pg=c.new_page();pg.goto(target.as_uri()+'/index.html');pg.wait_for_function('window.insiyabScene')
  check(counts(pg)['standing']==3 and pg.locator('.guide-stats strong').nth(2).inner_text()=='3','changed decision data updates both picture and reading, even when persona data differs')
  c.close()
 b.close()
print('GUIDE PASS')
