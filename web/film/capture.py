"""Capture the actual built app, with networking disabled, for the opening film."""
import argparse,json,pathlib,shutil,subprocess,hashlib
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',required=True);p.add_argument('--out',required=True);a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
for name in ['qr.svg','fonts']:
 src=site/name
 if src.is_dir():shutil.copytree(src,out/name,dirs_exist_ok=True)
 else:shutil.copyfile(src,out/name)
meta=json.loads((site/'data/meta.json').read_text());(out/'manifest.json').write_text(json.dumps({'fixture':meta['fixture'],'service_date':meta['service_date'],'bundle_commit':meta['commit'],'frontend_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'app_sha256':hashlib.sha256((site/'app.js').read_bytes()).hexdigest(),'bundle_sha256':hashlib.sha256((site/'bundle.js').read_bytes()).hexdigest(),'captions':True,'audio':False},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(args=['--use-angle=metal'])
 for name,view,duration in [('replay','replay',8),('forecast','forecast',6),('gap','gap',6),('planner','stories',3),('site_worker','stories',3),('office_worker','stories',3),('driver','stories',3)]:
  c=b.new_context(viewport={'width':1280,'height':720},record_video_dir=str(out/'work'),record_video_size={'width':1280,'height':720},offline=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(site.as_uri()+'/index.html');page.wait_for_function('window.insiyab&&insiyab.deck.isInitialized&&insiyab.map?.isSourceLoaded("basemap")');page.evaluate("insiyab.setTime(INSIYAB_BUNDLE['metrics.json'].targets.find(t=>t.level==='route'&&t.target==='boardings').split.origins[0])")
  if view!='replay':page.locator(f'[data-view={view}]').click()
  if view=='replay':page.locator('#play').click()
  if view=='stories':
   people=page.evaluate("INSIYAB_BUNDLE['personas.json'].personas.map(p=>p.id)");page.locator(f'[data-person="{people.index(name)}"]').click();page.wait_for_function('window.insiyabScene&&insiyabScene.renderer.info.render.calls>0')
  page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(500)
  if view in ['gap','forecast']:
   page.wait_for_timeout(1200);page.locator('#close-gaps' if view=='gap' else '#reveal').click();page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout((duration-1.2)*1000)
  else:page.wait_for_timeout(duration*1000)
  assert not errors, errors
  video=page.video;c.close();video.save_as(str(out/f'{name}.webm'));print('CAPTURED',name,flush=True)
 b.close()
print('CAPTURE PASS')
