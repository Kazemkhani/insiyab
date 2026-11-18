"""Browser regression: persistence and repeat controls; no provider calls."""
import json, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/console.html'
key='fake-private-key-for-browser-test'
state={'phase':'idle','timeline':[],'reports':{},'acknowledgements':{},'controls':{'can_start':True,'running':False,'armed':True,'request_id':None}}
posts=[]; fail_start=False
headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}
def handler(route):
 global fail_start
 if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
 if route.request.method=='GET':route.fulfill(status=200,content_type='application/json',body=json.dumps(state),headers=headers);return
 payload=route.request.post_data_json;posts.append(payload)
 if fail_start:route.abort();return
 state.update(phase='check',since='2026-11-18T08:00:00Z')
 state['controls'].update(can_start=False,running=True,request_id=payload['request_id'])
 route.fulfill(status=200,content_type='application/json',body=json.dumps({'started':True,'request_id':payload['request_id']}),headers=headers)
def check(v,label):
 assert v,label
 print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 c=b.new_context(viewport={'width':1280,'height':720});c.route('https://relay.test/**',handler)
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
 page.locator('#relay-url').fill('https://relay.test');page.locator('#view-key').fill(key);page.locator('#call-key').fill(key)
 page.locator('#connect').click();page.wait_for_function("!document.querySelector('#start-call').disabled")
 check(not posts,'connecting never dials')
 page.reload();page.wait_for_function("!document.querySelector('#start-call').disabled")
 check(page.locator('#call-key').input_value()==key,'call key survives reload')
 check(not posts,'auto reconnect never dials')
 page.locator('#start-call').click();page.wait_for_timeout(350)
 check(len(posts)==1 and posts[0]['scenario']=='default','one deliberate click starts the canonical scenario')
 check(page.locator('#start-call').is_disabled(),'active run blocks a second start')
 state.update(phase='done',outcome='complete');state['controls'].update(can_start=True,running=False)
 page.wait_for_function("!document.querySelector('#start-call').disabled")
 check(page.locator('#start-call').inner_text()=='Call the team again','completed run offers repeat')
 page.locator('#start-call').click();page.wait_for_timeout(300)
 check(len(posts)==2 and posts[1]['request_id']!=posts[0]['request_id'],'repeat generates a new explicit request ID')
 state['controls'].update(can_start=True,running=False);state.update(phase='done')
 page.wait_for_function("!document.querySelector('#start-call').disabled")
 fail_start=True;page.locator('#start-call').click();page.wait_for_timeout(300)
 lost_id=posts[-1]['request_id'];page.reload();page.wait_for_function("!document.querySelector('#start-call').disabled")
 check(len(posts)==3,'reload after uncertain start never retries automatically')
 fail_start=False;page.locator('#start-call').click();page.wait_for_timeout(300)
 check(posts[-1]['request_id']==lost_id,'lost response retries the same ID after reload')
 # Connection error disables starts, without losing saved credentials.
 c.unroute('https://relay.test/**');c.route('https://relay.test/**',lambda r:r.abort());page.wait_for_timeout(2800)
 check(page.locator('#start-call').is_disabled(),'connection loss blocks starts')
 page.locator('#settings summary').click();page.locator('#forget').click();page.reload()
 check(page.locator('#call-key').input_value()=='' and page.locator('#view-key').input_value()=='','forget removes both private keys')
 check(not errors,'no browser errors')
 for w,h in [(1280,720),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.locator('#sample').click();page.wait_for_timeout(9600)
  page.locator('#settings').evaluate('e=>e.open=false')
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{w}: no horizontal overflow')
  out=Path('/tmp/insiyab-repeat-shots');out.mkdir(exist_ok=True)
  page.evaluate('scrollTo(0,0)')
  page.screenshot(path=str(out/f'console-{w}x{h}.png'))
 b.close()
server.shutdown()
print('ALL CALLING DASHBOARD CHECKS PASS')
