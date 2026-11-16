import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';
import {PathLayer,ScatterplotLayer,PolygonLayer,TextLayer} from '@deck.gl/layers';
import {createModel, busesAt, boardingsAt, fitPaths, pointAlong, clock, number, rollingError, originRows} from './model.mjs';
const B=window.INSIYAB_BUNDLE, M=createModel(B), $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=getComputedStyle(document.documentElement);
const colour=name=>css.getPropertyValue('--'+name).trim().match(/\w\w/g).map(v=>parseInt(v,16));
const C=Object.fromEntries(['ink','paper','flow','over','spare','simulated','line','grey'].map(n=>[n,colour(n)]));
let time=Math.min(M.max,Math.max(M.min,M.meta.origins[0]+3600)),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=300,deck,fit,selected=M.network.stops[0].stop_id,lastBin=-1,stopData=[],view='replay',forecastOrigin=M.meta.origins[0],lastErrorBin=-1;
const busState=b=>b.load>b.seats?'Above seats':b.load===b.seats?'Full':'Room';
const busColour=b=>b.load>b.seats?C.over:b.load===b.seats?C.ink:C.flow;
$('fixture').hidden=!M.meta.fixture;
$('service-date').textContent=M.meta.service_date+' · Dubai time';
$('provenance').textContent=`${M.meta.notes}. Source bundle generated ${M.meta.generated_at}. Service day ${M.meta.service_date}. ${M.meta.fixture?'Every transport value in this build is invented.':'Measured values are supplied aggregate records.'}`;
const headline=B['summary.json'].headline[0];
$('headline').innerHTML=`<span class="big-number" data-headline>${number(headline.value)}</span><span class="headline-label">${escape(headline.label)}</span><span class="source">${escape(headline.kind)} · ${escape(headline.unit)}<br>${escape(headline.source)} · ${M.meta.service_date}</span>`;
$('time').min=M.min;$('time').max=M.max;
$('play').textContent=playing?'Pause':'Play';
function records() {
  const kind=$('entity-type').value;
  const items=kind==='stop'?M.network.stops.map(s=>[s.stop_id,s.name]):kind==='bus'?M.trips.map(t=>[t.trip_id,`${M.routes.get(t.route_id).short_name} · ${t.trip_id}`]):M.network.communities.map(c=>[c.community_id,c.name_en]);
  $('entity').innerHTML=items.map(([id,label])=>`<option value="${escape(id)}">${escape(label)}</option>`).join('');
  if(items.some(i=>i[0]===selected)) $('entity').value=selected;
  else selected=items[0][0];
  detail();
}
function detail() {
  const kind=$('entity-type').value;
  let html='';
  if(kind==='stop') {
    const s=M.stops.get(selected),visits=M.visits.filter(v=>v.stop_id===selected),current=stopData.find(v=>v.stop_id===selected);
    html=`<strong>${escape(s.name)}</strong><p>${number(current?.on??0)} boardings in this quarter hour. Measured.</p><span class="source">replay/ · ${M.meta.service_date}</span><details><summary>Boardings and buses through the day</summary><div class="table-scroll"><table><thead><tr><th>Time</th><th>Trip</th><th>Boardings</th></tr></thead><tbody>${visits.sort((a,b)=>a.act_dep-b.act_dep).map(v=>`<tr><td>${clock(v.act_dep)}</td><td>${escape(v.trip_id)}</td><td>${v.on}</td></tr>`).join('')}</tbody></table></div></details>`;
  } else if(kind==='bus') {
    const t=M.trips.find(t=>t.trip_id===selected),now=busesAt(M,time).find(t=>t.trip_id===selected);
    html=`<strong>${escape(t.trip_id)}</strong><p>${escape(t.bus_type.toLowerCase())} · ${t.seats} seats · model year ${t.model_year}</p><p>${now?`${now.load} passengers · ${busState(now)} · ${number(now.delay/60)} minutes relative to schedule`:'Not travelling at this time.'}</p><span class="source">Measured · replay/ · ${M.meta.service_date}</span><details><summary>Load at every stop</summary><table><thead><tr><th>Stop</th><th>Load</th><th>Time</th></tr></thead><tbody>${t.visits.map(v=>`<tr><td>${escape(M.stops.get(v.stop_id).name)}</td><td>${v.load}</td><td>${clock(v.act_dep)}</td></tr>`).join('')}</tbody></table></details>`;
  } else {
    const c=M.network.communities.find(c=>c.community_id===selected),ids=new Set(M.network.stops.filter(s=>s.community_id===selected).map(s=>s.stop_id)),visits=M.visits.filter(v=>ids.has(v.stop_id));
    html=`<strong>${escape(c.name_en)}</strong><p>${number(visits.reduce((s,v)=>s+v.on,0))} boardings over the service day, across ${ids.size} stops. Measured.</p><span class="source">network.json + replay/ · ${M.meta.service_date}</span>`;
  }
  $('detail').innerHTML=html;
}
function pick(kind,id){$('entity-type').value=kind;selected=id;records();if(view==='forecast'&&kind==='stop'){$('forecast-stop').value=id;forecastTimes();}}
function render() {
  if(Math.floor(time/M.meta.bin_seconds)!==lastErrorBin){renderError();lastErrorBin=Math.floor(time/M.meta.bin_seconds);}

  $('clock').value=clock(time);$('time').value=time;
  const bin=Math.floor(time/M.meta.bin_seconds);
  if(bin!==lastBin){stopData=boardingsAt(M,time);lastBin=bin;detail();}
  if(!deck||!fit)return;
  const buses=busesAt(M,time),unit=1/fit.scale;
  const shared={coordinateSystem:COORDINATE_SYSTEM.CARTESIAN};
  deck.setProps({layers:[
    ...forecastLayers(shared,unit),
    new PathLayer({...shared,id:'routes',data:M.paths.filter(p=>p.direction===0),getPath:d=>d.points,getColor:C.grey,getWidth:3,widthUnits:'pixels'}),
    new PathLayer({...shared,id:'boardings',data:stopData,getPath:s=>[s.position,[s.position[0],s.position[1]-Math.sqrt(s.on)*5*unit]],getColor:C.ink,getWidth:3,widthUnits:'pixels'}),
    new ScatterplotLayer({...shared,id:'stops',data:stopData,getPosition:s=>s.position,getRadius:4,radiusUnits:'pixels',getFillColor:C.paper,getLineColor:C.ink,lineWidthUnits:'pixels',getLineWidth:1,stroked:true,pickable:true,onClick:({object})=>object&&pick('stop',object.stop_id)}),
    new PathLayer({...shared,id:'delay',data:buses.filter(b=>b.delay>0),getPath:b=>[pointAlong(b.path,Math.max(0,b.distance-b.delay*.13*unit)),b.position],getColor:C.over,getWidth:2,widthUnits:'pixels'}),
    new PolygonLayer({...shared,id:'buses',data:buses,getPolygon:b=>{const [x,y]=b.position;return b.load>b.seats?[[x,y-9*unit],[x+8*unit,y+7*unit],[x-8*unit,y+7*unit]]:[[x-7*unit,y-5*unit],[x+7*unit,y-5*unit],[x+7*unit,y+5*unit],[x-7*unit,y+5*unit]];},getFillColor:busColour,getLineColor:C.paper,getLineWidth:1,lineWidthUnits:'pixels',stroked:true,pickable:true,onClick:({object})=>object&&pick('bus',object.trip_id)}),
    new PathLayer({...shared,id:'load-bars',data:buses,getPath:b=>{const [x,y]=b.position;return [[x-7*unit,y+11*unit],[x+(-7+14*Math.min(1.5,b.load/b.seats))*unit,y+11*unit]];},getColor:busColour,getWidth:3,widthUnits:'pixels'}),
    new TextLayer({...shared,id:'route-labels',data:M.paths.filter(p=>p.direction===0),getPosition:d=>d.points[0],getText:d=>d.label,getPixelOffset:[-15,15],getSize:12,getColor:C.ink,fontFamily:'Plex',fontWeight:500}),
    new TextLayer({...shared,id:'communities',data:$('map').clientWidth<600?[]:M.network.communities,getPosition:c=>M.project(c.centroid),getText:c=>c.name_en,getPixelOffset:[0,-18],getSize:10,getColor:C.ink,fontFamily:'Plex',pickable:true,onClick:({object})=>object&&pick('community',object.community_id)})
  ]});
  // The browser checks rendered layer data, not a separate animation model.
  window.insiyab={model:M,time,buses,fit,deck,setTime:t=>{time=+t;playing=false;$('play').textContent='Play';render();},get selected(){return selected;},get view(){return view;},get forecastOrigin(){return forecastOrigin;}};
}
$('entity-type').onchange=records;$('entity').onchange=()=>{selected=$('entity').value;detail();};
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('time').oninput=e=>{time=+e.target.value;playing=false;$('play').textContent='Play';render();};
$('speed').onchange=e=>{speed=+e.target.value;};
records();render();
async function start(){
  await document.fonts.ready;
  deck=new Deck({canvas:$('map-canvas'),views:new OrthographicView({id:'network',flipY:true}),controller:false,initialViewState:{target:[0,0,0],zoom:0},getCursor:({isHovering})=>isHovering?'pointer':'default',onError:e=>{console.error(e);$('map-failure').hidden=false;}});
  new ResizeObserver(()=>{const rect=$('map').getBoundingClientRect();fit=fitPaths(M.paths,rect.width,rect.height);deck.setProps({width:rect.width,height:rect.height,viewState:{target:fit.target,zoom:fit.zoom}});render();}).observe($('map'));
  let previous=performance.now(),lastRender=0;
  function tick(now){if(playing){time+=Math.min((now-previous)/1000,.2)*speed;if(time>M.max)time=M.min;if(now-lastRender>80){render();lastRender=now;}}previous=now;requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
}
start().catch(e=>{console.error(e);$('map-failure').hidden=false;});

const oneHour=3600;
const limit=`Tested on later hours of one day, ${new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(M.meta.service_date+'T00:00:00Z'))}. Not tested on another day.`;
document.querySelectorAll('.forecast-limit').forEach(e=>e.textContent=limit);
document.querySelectorAll('.date').forEach(e=>e.textContent=M.meta.service_date);
function renderError(){
  const score=rollingError(B['forecast/boardings-route.json'],time,3600);
  $('error-counter').innerHTML=score.n?`<span>Average miss so far<br><small>One hour ahead</small></span><strong>${number(score.model)} <small>forecast</small></strong><strong>${number(score.naive)} <small>naive forecast</small></strong><span class="source">passengers / route / ${M.meta.bin_seconds/60} min · <br>${score.n} held-out bins · forecast/boardings-route.json</span>`:'<span>Waiting for the first one-hour forecast bin to finish. No error is known yet.</span>';
}
function setView(next){
  view=next;playing=false;$('play').textContent='Play';
  document.querySelectorAll('nav button').forEach(e=>e.setAttribute('aria-current',e.dataset.view===next?'page':'false'));
  $('replay').hidden=next==='model';$('model').hidden=next!=='model';
  $('forecast-controls').hidden=next!=='forecast';$('pick-stop').hidden=next!=='forecast';
  $('map-caption').textContent=next==='forecast'?'The forecast meeting reality':'The day, replayed';
  if(next==='forecast')freezeForecast();
  if(next==='model')renderModel();
  render();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(e=>e.onclick=()=>setView(e.dataset.view));
function freezeForecast(){forecastOrigin=[...M.meta.origins].reverse().find(o=>o<=time)??M.meta.origins[0];$('frozen-at').textContent=`Made at ${clock(forecastOrigin)}. Quarter hour ending ${clock(forecastOrigin+3600)}. forecast/boardings-stop.json · ${M.meta.service_date}`;render();}
$('freeze').onclick=freezeForecast;
function forecastLayers(shared,unit){
  if(view!=='forecast')return [];
  const rows=originRows(B['forecast/boardings-stop.json'],forecastOrigin,3600).filter(r=>r.horizon===3600);
  const data=[...new Set(rows.map(r=>r.id))].map(id=>{
    const bins=rows.filter(r=>r.id===id),known=bins.filter(r=>r.bin_start+B['forecast/boardings-stop.json'].bin_seconds<=time && r.actual!==null);
    return {id,position:M.stops.get(id).position,forecast:bins.reduce((s,r)=>s+r.forecast,0),actual:known.length?known.reduce((s,r)=>s+r.actual,0):null};
  });
  return [new ScatterplotLayer({...shared,id:'forecast-halos',data,getPosition:d=>d.position,getRadius:d=>Math.sqrt(d.forecast)*4,radiusUnits:'pixels',radiusMaxPixels:34,filled:false,stroked:true,getLineColor:[...C.spare,130],getLineWidth:2,lineWidthUnits:'pixels',pickable:true,onClick:({object})=>{if(object){$('forecast-stop').value=object.id;forecastTimes();pick('stop',object.id);}}}),new ScatterplotLayer({...shared,id:'actual-halos',data:data.filter(d=>d.actual!==null),getPosition:d=>d.position,getRadius:d=>Math.sqrt(d.actual)*4,radiusUnits:'pixels',radiusMaxPixels:34,getFillColor:[...C.flow,90]})];
}
$('forecast-stop').innerHTML=M.network.stops.map(s=>`<option value="${escape(s.stop_id)}">${escape(s.name)}</option>`).join('');
$('forecast-stop').value=B['forecast/boardings-stop.json'].series[0]?.id;
let challengeRows=[],challengeRevealed=false;
function forecastTimes(){
  const series=B['forecast/boardings-stop.json'].series.find(s=>s.id===$('forecast-stop').value);
  challengeRows=(series?.rows??[]).filter(r=>r.horizon===oneHour && r.bin_start>=12*3600).sort((a,b)=>a.bin_start-b.bin_start);
  $('forecast-time').innerHTML=challengeRows.map((r,i)=>`<option value="${i}">${clock(r.bin_start)} to ${clock(r.bin_start+B['forecast/boardings-stop.json'].bin_seconds)}</option>`).join('');
  challengeRevealed=false;renderChallenge();
}
function renderChallenge(){
  const row=challengeRows[+$('forecast-time').value];
  $('reveal').hidden=!row;$('forecast-time').disabled=!row;
  if(!row){$('challenge').innerHTML='<p>No held-out afternoon forecast supplied for this stop. Choose another stop; no value has been invented.</p>';return;}
  $('challenge').innerHTML=`<p>Forecast made at ${clock(row.origin)} for the bin ending ${clock(row.origin+row.horizon)}. The model had seen no records after ${clock(row.origin)}.</p><div class="challenge-numbers"><div><span class="eyebrow">Forecast</span><strong>${number(row.forecast)}</strong><span>passengers boarding</span><small>Range ${number(row.lo)} to ${number(row.hi)}</small></div><div><span class="eyebrow">What happened · measured</span><strong data-actual>${challengeRevealed?number(row.actual):'?'}</strong><span>${challengeRevealed?'passengers boarded':'Hidden until you reveal'}</span></div></div>${challengeRevealed?`<p data-miss>${row.actual===null?'No actual count supplied.':`A miss of ${number(Math.abs(row.forecast-row.actual))} passengers. The naive forecast said ${number(row.baseline)} and missed by ${number(Math.abs(row.baseline-row.actual))}.`}</p>`:''}`;
  $('reveal').textContent=challengeRevealed?'Hide what happened':'Reveal what happened';
}
$('forecast-stop').onchange=forecastTimes;$('forecast-time').onchange=()=>{challengeRevealed=false;renderChallenge();};$('reveal').onclick=()=>{challengeRevealed=!challengeRevealed;renderChallenge();};forecastTimes();
$('model-target').innerHTML=B['metrics.json'].targets.map((t,i)=>`<option value="${i}">${escape(t.target.replaceAll('_',' '))} · ${escape(t.level)}</option>`).join('');
function renderModel(){
  const t=B['metrics.json'].targets[+$('model-target').value],horizons=[...new Set(t.results.map(r=>r.horizon))].sort((a,b)=>a-b),all=t.subsets.find(s=>s.kind==='all')?.subset,chosen=t.models.find(m=>!m.is_baseline),naive=t.models.find(m=>m.is_baseline);
  const h=horizons.includes(oneHour)?oneHour:horizons[0],result=(model,horizon,subset)=>t.results.find(r=>r.model===model&&r.horizon===horizon&&r.subset===subset);
  const best=result(chosen.model,h,all),base=result(naive.model,h,all);
  $('model-sentence').textContent=`${h/60} minutes ahead, the forecast misses by ${number(best?.mae)} on average. The naive forecast misses by ${number(base?.mae)}. Unit: ${t.unit}.`;
  $('model-unit').textContent=`Average absolute miss (MAE). ${t.unit}. Lower is better.`;
  $('model-table').innerHTML=`<div class="table-scroll"><table class="metrics"><thead><tr><th>Model</th>${horizons.map(h=>`<th>${h/60} min ahead</th>`).join('')}</tr></thead><tbody>${t.models.map(m=>`<tr><th>${m.is_baseline?'Naive forecast: ':''}${escape(m.label)}</th>${horizons.map(h=>`<td>${number(result(m.model,h,all)?.mae)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const selected=$('model-horizon').value;$('model-horizon').innerHTML=horizons.map(h=>`<option value="${h}">${h/60} minutes</option>`).join('');$('model-horizon').value=horizons.includes(+selected)?selected:h;
  const horizon=+$('model-horizon').value;
  const worst=new Map(t.models.map(m=>[m.model,Math.max(...t.results.filter(r=>r.model===m.model&&r.horizon===horizon&&r.subset!==all).map(r=>r.mae))]));
  $('subset-table').innerHTML=`<div class="table-scroll"><table class="metrics"><thead><tr><th>Subset / model</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>WAPE</th><th>Bins / MAPE bins</th></tr></thead><tbody>${t.subsets.filter(s=>s.subset!==all).map(s=>t.models.map(m=>{const r=result(m.model,horizon,s.subset);return r?`<tr class="${r.mae===worst.get(m.model)?'worst':''}"><th>${escape(s.label)}<small>${m.is_baseline?'Naive forecast':escape(m.label)}${r.mae===worst.get(m.model)?' · Largest miss':''}</small></th><td>${number(r.mae)}</td><td>${number(r.rmse)}</td><td>${r.mape===null?'—':number(r.mape*100)+'%'}</td><td>${r.wape===null?'—':number(r.wape*100)+'%'}</td><td>${r.n} / ${r.mape_n}</td></tr>`:'';}).join('')).join('')}</tbody></table></div>`;
  $('mape-rule').textContent=t.mape_rule;$('split-rule').textContent=`Learning: ${t.split.train}. Held-out: ${t.split.test}.`;
}
$('model-target').onchange=renderModel;$('model-horizon').onchange=renderModel;
