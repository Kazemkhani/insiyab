"""Record the existing live 3D renderer and map, with external networking disabled."""
import json,pathlib,subprocess,sys
from playwright.sync_api import sync_playwright
site=pathlib.Path(sys.argv[1]).resolve();out=pathlib.Path(sys.argv[2]).resolve()
manifest=json.loads((out/'comic.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(args=['--use-angle=metal'])
 for name in ['waiting','full','spare','changed','office','map']:
  context=browser.new_context(viewport={'width':1440,'height':960},offline=True,record_video_dir=str(out/'work'),record_video_size={'width':1440,'height':960})
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if name=='map':
   page.goto(site.as_uri()+'/index.html');page.locator('#guide-explore').click();page.wait_for_function('window.insiyab?.map?.isSourceLoaded("basemap")')
   page.add_style_tag(content='body>*{display:none!important}body>#map{display:block!important;position:fixed;inset:0;width:100vw!important;height:100vh!important}.map-zoom,.map-note,#map-credit{display:none!important}')
   page.evaluate('document.body.append(document.querySelector("#map"));window.dispatchEvent(new Event("resize"))')
  else:
   page.goto(out.as_uri()+'/stage.html');page.wait_for_function("typeof window.showFilmStage==='function'");page.evaluate("Promise.all([document.fonts.ready,document.fonts.load('500 42px Plex')])");page.evaluate('(name)=>showFilmStage(name)',name)
   page.wait_for_function('window.insiyabScene?.renderer.info.render.calls>0')
  page.wait_for_timeout(300)
  if name in ['full','changed']:page.locator('[data-replay]').evaluate('(e)=>e.click()')
  page.wait_for_timeout(7000)
  assert not errors,errors
  video=page.video;context.close();video.save_as(str(out/f'{name}.webm'))
  length=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out/f'{name}.webm')],text=True))
  manifest['clips'][name]={'start':max(0,round((length-7)*30)),'frames':210}
  print('CAPTURED COMIC',name,flush=True)
 browser.close()
(out/'comic.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('COMIC CAPTURE PASS')
