"""Adversarial checks from a forecast reviewer, planner and disconnected presenter."""
import json,pathlib,shutil,sys,tempfile
from playwright.sync_api import sync_playwright
site=pathlib.Path(sys.argv[1]).resolve()
def check(ok,label):
 assert ok,label
 print('PASS review:',label,flush=True)
with tempfile.TemporaryDirectory(prefix='insiyab-review-') as tmp, sync_playwright() as p:
 mutant=pathlib.Path(tmp);shutil.copytree(site,mutant,dirs_exist_ok=True)
 data=json.loads((site/'bundle.js').read_text().removeprefix('window.INSIYAB_BUNDLE=').rstrip(';\n'))
 target=data['metrics.json']['targets'][0];naive=next(m for m in target['models'] if m['is_baseline']);target['models'].append({'model':'review_strong_naive','label':'Review strong naive','is_baseline':True})
 target['results'] += [dict(r,model='review_strong_naive',mae=.01,rmse=.02) for r in list(target['results']) if r['model']==naive['model']]
 for r in target['results']:
  if r['model'] not in [m['model'] for m in target['models'] if m['is_baseline']]:r['skill_vs']='review_strong_naive'
 (mutant/'bundle.js').write_text('window.INSIYAB_BUNDLE='+json.dumps(data)+';')
 stop=json.loads((site/'data/forecast/boardings-stop.json').read_text());first=stop['series'][0];duplicate=json.loads(json.dumps(first))
 for r in duplicate['rows']:r.update(forecast=999.25,lo=998,hi=1001,actual=None)
 stop['series'].insert(1,duplicate)
 missing=next(s['stop_id'] for s in data['network.json']['stops'] if s['stop_id']!=first['id']);stop['series']=[s for s in stop['series'] if s['id']!=missing]
 local_file=mutant/'stop-forecast.js';local_file.write_text("window.INSIYAB_BUNDLE['forecast/boardings-stop.json']="+json.dumps(stop)+';')
 b=p.chromium.launch(args=['--use-angle=metal']);ctx=b.new_context(offline=True,viewport={'width':1280,'height':720});pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 def open_page():
  pg.goto(mutant.as_uri()+'/index.html');pg.wait_for_function('window.insiyab&&insiyab.deck.isInitialized')
 open_page();pg.locator('[data-view=model]').click()
 check('Best naive forecast in this table: 0.01.' in pg.locator('#model-sentence').inner_text(),'strongest naive is compared even when last in the file')
 check('The naive forecast misses less.' in pg.locator('#model-sentence').inner_text(),'loss is stated instead of presenting every model as a win')
 pg.locator('[data-view=forecast]').click();pg.wait_for_function("!!INSIYAB_BUNDLE['forecast/boardings-stop.json']")
 pg.locator('#forecast-series').select_option('1');check('999.25' in pg.locator('#challenge').inner_text(),'second series for the same stop can be inspected')
 pg.locator('#reveal').click();check('No actual count supplied.' in pg.locator('[data-miss]').inner_text(),'missing actual is not displayed as zero or scored')
 pg.locator('#forecast-stop').select_option(missing);check(pg.locator('#reveal').is_hidden() and 'No forecast was supplied for this stop' in pg.locator('#challenge').inner_text(),'stop with no series never borrows another stop forecast')
 local_file.unlink();open_page();pg.locator('[data-view=forecast]').click();pg.wait_for_function("document.querySelector('#challenge').textContent.includes('could not be opened')")
 check(not errors,'missing local forecast is handled without an unhandled page error')
 pg.locator('[data-view=replay]').click();check(pg.locator('#map').is_visible(),'replay still works after forecast file failure')
 # A negative control proves the strong-naive assertion detects the old behaviour.
 pg.locator('[data-view=model]').click();pg.locator('#model-sentence').evaluate("e=>e.textContent='The first naive wins.'")
 try:assert 'Best naive forecast in this table: 0.01.' in pg.locator('#model-sentence').inner_text()
 except AssertionError:print('PASS review: negative control rejects first-naive comparison',flush=True)
 else:raise AssertionError('Strong-naive check cannot fail')
 ctx.close();b.close()
print('REVIEW PASS')
