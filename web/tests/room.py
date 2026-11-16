"""Browser → real relay handler → audience answer → browser, on loopback only."""
import os,pathlib,subprocess,sys
from playwright.sync_api import sync_playwright
server=subprocess.Popen(['node',str(pathlib.Path(__file__).with_name('room-server.cjs')),sys.argv[1]],stdout=subprocess.PIPE,text=True)
def check(ok,label):
 assert ok,label
 print('PASS room:',label,flush=True)
try:
 port=server.stdout.readline().strip();assert port.isdigit(),'test relay failed to start'
 url='http://127.0.0.1:'+port
 subprocess.run(['node','live/khutwa/build.mjs','--bundle',sys.argv[2] if len(sys.argv)>2 else 'fixtures','--out',str(pathlib.Path(sys.argv[1])/'khutwa')],check=True,capture_output=True)
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-angle=metal']);c=b.new_context();page=c.new_page();errors=[];writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:writes.append(r) if r.method=='POST' and '/api/room/phase' in r.url else None)
  page.goto(url);page.wait_for_function('window.insiyab&&insiyab.deck.isInitialized');page.locator('[data-view=gap]').click();page.locator('#playback').wait_for(state='visible');page.wait_for_timeout(1700)
  check(page.locator('#presenter').is_hidden(),'memory-only relay keeps playback primary and hides presenter mutations')
  page.locator('#playback').click();page.wait_for_timeout(1700);check('Played back' in page.locator('#room-count').inner_text(),'polling a memory-only relay preserves playback')
  c.request.post(url+'/__test/store',data={'kind':'shared'});page.locator('#presenter').wait_for(state='visible')
  page.locator('#close-gaps').click()
  page.locator('#close-gaps').click();check(not writes,'visitor can inspect proposals without a presenter mutation')
  page.locator('#presenter summary').click();page.locator('#presenter-code').fill('wrong-code');page.locator('#presenter-form button').click()
  page.locator('#close-gaps').click();page.locator('#close-gaps').click();page.wait_for_function("document.querySelector('#presenter-status').textContent.includes('refused')")
  check(c.request.get(url+'/api/room/state').json()['phase']=='waiting','wrong presenter code leaves the actual relay unchanged')
  page.locator('#presenter-code').fill('local-test-code');page.locator('#presenter-form button').click();check(page.locator('#presenter-code').input_value()=='','code is removed from input after use')
  page.locator('#close-gaps').click();page.locator('#close-gaps').click();page.wait_for_function("document.querySelector('#presenter-status').textContent.includes('offer is open')")
  state=c.request.get(url+'/api/room/state').json();check(state['phase']=='offer' and state['decision_id'],'presenter opens the bundle decision through the actual relay')
  phone_context=b.new_context(viewport={'width':390,'height':844});phone=phone_context.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
  phone.goto(url+'/khutwa/');phone.locator('#choices button').first.wait_for(state='visible');phone.locator('#no-walk').check();phone.locator('#choices button').first.click();phone.locator('#s-done').wait_for(state='visible');phone.wait_for_function("getComputedStyle(document.querySelector('#s-done')).opacity==='1'")
  check('points' in phone.locator('#done-headline').inner_text(),'actual Khutwa page accepts a no-extra-walk offer at phone size')
  if os.environ.get('INSIYAB_SHOTS'):phone.screenshot(path=str(pathlib.Path(os.environ['INSIYAB_SHOTS'])/'khutwa-390x844.png'))
  page.wait_for_function("document.querySelector('#room-count').textContent.includes('1 of 1 took')")
  check('not measured commuting behaviour' in page.locator('#room-count').inner_text(),'real local audience count remains distinct from commuting evidence')
  page.locator('.decision-evidence summary').first.click();page.wait_for_timeout(1700);check(page.locator('.decision-evidence').first.get_attribute('open') is not None,'polling preserves an opened evidence panel')
  if os.environ.get('INSIYAB_SHOTS'):
   for width,height in [(1280,720),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.locator('#room').evaluate('e=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(pathlib.Path(os.environ['INSIYAB_SHOTS'])/f'room-{width}x{height}.png'))
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}: presenter layout has no horizontal overflow')
   page.set_viewport_size({'width':1280,'height':720})
  check(page.evaluate("localStorage.length===0&&sessionStorage.length===0") and 'local-test-code' not in page.content() and all('local-test-code' not in r.url for r in writes),'presenter code is not in storage, markup or URLs')
  page.locator('#end-offer').click();page.wait_for_function("document.querySelector('#presenter-status').textContent.includes('has ended')");check(c.request.get(url+'/api/room/state').json()['phase']=='closed','presenter can end the room offer')
  count=len(writes);page.reload();page.wait_for_function('window.insiyab&&insiyab.deck.isInitialized');page.locator('[data-view=gap]').click();page.locator('#presenter').wait_for(state='visible');page.locator('#close-gaps').click();check(len(writes)==count,'reload forgets presenter authority')
  c.request.post(url+'/__test/fail',data={'fail':True});page.locator('#playback').wait_for(state='visible');page.locator('#playback').click();check('Played back, nobody is connected' in page.locator('#room-count').inner_text(),'store failure falls back to explicitly labelled playback')
  check(not errors,'room journey has no unhandled page errors');phone_context.close();c.close();b.close()
finally:
 server.terminate();server.wait(timeout=5)
print('ROOM BROWSER PASS')
