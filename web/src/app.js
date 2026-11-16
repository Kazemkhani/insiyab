import {horizonChart,subsetChart,forecastChart,gapChart,gainChart} from './charts.mjs';
import {sceneSVG,seatDiagram} from './scene.mjs';
import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';
import {PathLayer,ScatterplotLayer,PolygonLayer,TextLayer} from '@deck.gl/layers';
import {createModel, busesAt, boardingsAt, fitPaths, pointAlong, clock, number, rollingError, originRows} from './model.mjs';
const B=window.INSIYAB_BUNDLE, M=createModel(B), $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=getComputedStyle(document.documentElement);
const colour=name=>css.getPropertyValue('--'+name).trim().match(/\w\w/g).map(v=>parseInt(v,16));
const C=Object.fromEntries(['ink','paper','flow','over','spare','simulated','line','grey','muted'].map(n=>[n,colour(n)]));
const routeTarget=B['metrics.json'].targets.find(t=>t.target==='boardings'&&t.level==='route');
const openingTime=routeTarget?.split.origins[0]??M.meta.origins[0]+3600;
let time=Math.min(M.max,Math.max(M.min,openingTime)),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=300,deck,fit,selected=M.network.stops[0].stop_id,lastBin=-1,stopData=[],view='replay',forecastOrigin=M.meta.origins[0],lastErrorBin=-1,focusRoute='',closedGaps=false,roomState=null,playbackCount=null;
const busState=b=>b.load>b.seats?'Above seats':b.load===b.seats?'Full':'Has room';
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
    html=`<p class="eyebrow">${escape(M.routes.get(t.route_id).short_name)} · ${escape(t.trip_id)}</p><h3>${now?busState(now):'Between journeys'}</h3>${now?`<div class="load-reading"><strong>${now.load}</strong><span>passengers<br>for ${t.seats} seats</span></div><div class="seat-rule"><span style="width:${Math.min(100,now.load/t.seats*100)}%;background:var(--${now.load>t.seats?'over':'flow'})"></span></div>`:''}<p>${escape(t.bus_type.toLowerCase())} · ${t.seats} seats${t.model_year?` · model year ${t.model_year}`:''}</p><p>${now?`${number(now.delay/60)} minutes relative to schedule`:'Not travelling at this time.'}</p><span class="source">Measured · replay/ · ${M.meta.service_date}</span><details><summary>Load at every stop</summary><table><thead><tr><th>Stop</th><th>Load</th><th>Time</th></tr></thead><tbody>${t.visits.map(v=>`<tr><td>${escape(M.stops.get(v.stop_id).name)}</td><td>${v.load}</td><td>${clock(v.act_dep)}</td></tr>`).join('')}</tbody></table></details>`;
  } else {
    const c=M.network.communities.find(c=>c.community_id===selected),ids=new Set(M.network.stops.filter(s=>s.community_id===selected).map(s=>s.stop_id)),visits=M.visits.filter(v=>ids.has(v.stop_id));
    html=`<strong>${escape(c.name_en)}</strong><p>${number(visits.reduce((s,v)=>s+v.on,0))} boardings over the service day, across ${ids.size} stops. Measured.</p><span class="source">network.json + replay/ · ${M.meta.service_date}</span>`;
  }
  $('detail').innerHTML=html;
}
function pick(kind,id){$('entity-type').value=kind;selected=id;records();render();if(view==='forecast'&&B['forecast/boardings-stop.json']&&kind==='stop'){$('forecast-stop').value=id;forecastSeries();}}
function render() {
  if(Math.floor(time/M.meta.bin_seconds)!==lastErrorBin){renderError();lastErrorBin=Math.floor(time/M.meta.bin_seconds);}

  const errorTitle=$('error-counter').querySelector('.error-title');if(errorTitle)errorTitle.textContent='Miss so far at '+clock(time);
  $('clock').value=clock(time);$('time').value=time;
  const bin=Math.floor(time/M.meta.bin_seconds);
  if(bin!==lastBin){stopData=boardingsAt(M,time);lastBin=bin;detail();if(view==='gap')renderGap();if(view==='forecast'&&B['forecast/boardings-stop.json'])renderChallenge();}
  if(!deck||!fit)return;
  const buses=busesAt(M,time).filter(b=>!focusRoute||b.route_id===focusRoute),unit=1/fit.scale;
  const paths=M.paths.filter(p=>!focusRoute||p.route_id===focusRoute),stopIds=new Set(paths.flatMap(p=>p.stops)),shownStops=stopData.filter(s=>stopIds.has(s.stop_id));
  const shared={coordinateSystem:COORDINATE_SYSTEM.CARTESIAN};
  deck.setProps({layers:[
    ...forecastLayers(shared,unit),
    ...gapLayers(shared,unit),
    new PathLayer({...shared,id:'routes',data:paths.filter(p=>p.direction===0),getPath:d=>d.points,getColor:view==='gap'?[...C.muted,50]:C.muted,getWidth:2,widthUnits:'pixels'}),
    new PathLayer({...shared,id:'boardings',data:shownStops,getPath:s=>[s.position,[s.position[0],s.position[1]-Math.sqrt(s.on)*3.5*unit]],getColor:[...C.ink,110],getWidth:2,widthUnits:'pixels'}),
    new ScatterplotLayer({...shared,id:'stops',data:shownStops,getPosition:s=>s.position,getRadius:4,radiusUnits:'pixels',getFillColor:C.paper,getLineColor:C.ink,lineWidthUnits:'pixels',getLineWidth:1,stroked:true,pickable:true,onClick:({object})=>object&&pick('stop',object.stop_id)}),
    new PathLayer({...shared,id:'delay',data:buses.filter(b=>b.delay>0),getPath:b=>[pointAlong(b.path,Math.max(0,b.distance-b.delay*.13*unit)),b.position],getColor:C.over,getWidth:2,widthUnits:'pixels'}),
    new PolygonLayer({...shared,id:'buses',data:buses,getPolygon:b=>{const [x,y]=b.position;return b.load>b.seats?[[x,y-9*unit],[x+8*unit,y+7*unit],[x-8*unit,y+7*unit]]:[[x-7*unit,y-5*unit],[x+7*unit,y-5*unit],[x+7*unit,y+5*unit],[x-7*unit,y+5*unit]];},getFillColor:busColour,getLineColor:C.paper,getLineWidth:1,lineWidthUnits:'pixels',stroked:true,pickable:true,onClick:({object})=>object&&pick('bus',object.trip_id)}),
    new PathLayer({...shared,id:'load-bars',data:buses,getPath:b=>{const [x,y]=b.position;return [[x-7*unit,y+11*unit],[x+(-7+14*Math.min(1.5,b.load/b.seats))*unit,y+11*unit]];},getColor:busColour,getWidth:3,widthUnits:'pixels'}),
    new ScatterplotLayer({...shared,id:'selected-bus',data:$('entity-type').value==='bus'?buses.filter(b=>b.trip_id===selected):[],getPosition:b=>b.position,getRadius:16,radiusUnits:'pixels',filled:false,stroked:true,getLineColor:C.ink,getLineWidth:2,lineWidthUnits:'pixels'}),
    new TextLayer({...shared,id:'over-seat-labels',data:buses.filter(b=>b.load>b.seats),getPosition:b=>b.position,getText:b=>`${b.load}/${b.seats}`,getPixelOffset:[14,-10],getTextAnchor:'start',getSize:11,getColor:C.over,fontFamily:'Mono',background:true,getBackgroundColor:C.paper,backgroundPadding:[3,2]}),
    new TextLayer({...shared,id:'route-labels',data:paths.filter(p=>p.direction===0),getPosition:d=>d.points[0],getText:d=>d.label,getPixelOffset:[-15,15],getSize:14,getColor:C.ink,fontFamily:'Plex',fontWeight:500}),
    new TextLayer({...shared,id:'communities',data:view==='replay'&&$('entity-type').value==='community'?M.network.communities.filter(c=>c.community_id===selected):[],getPosition:c=>M.project(c.centroid),getText:c=>c.name_en,getPixelOffset:[0,-18],getSize:10,getColor:C.ink,fontFamily:'Plex',pickable:true,onClick:({object})=>object&&pick('community',object.community_id)})
  ]});
  // The browser checks rendered layer data, not a separate animation model.
  window.insiyab={model:M,time,buses,fit,deck,setTime:t=>{time=+t;playing=false;$('play').textContent='Play';render();},get selected(){return selected;},get view(){return view;},get forecastOrigin(){return forecastOrigin;}};
}
$('entity-type').value='bus';
selected=(busesAt(M,time).find(b=>b.load>b.seats)??busesAt(M,time)[0])?.trip_id??M.trips[0].trip_id;
$('entity-type').onchange=()=>{records();render();};$('entity').onchange=()=>{selected=$('entity').value;detail();render();};
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('time').oninput=e=>{time=+e.target.value;playing=false;$('play').textContent='Play';render();};
$('speed').onchange=e=>{speed=+e.target.value;};
records();render();
function fitMap(){const summary=document.querySelector('.forecast-summary'),grid=document.querySelector('.replay-grid'),reading=document.querySelector('.reading');if(matchMedia('(max-width:800px)').matches){if(summary.parentElement!==grid)grid.insertBefore(summary,reading);}else if(summary!==reading.firstElementChild)reading.prepend(summary);if(!deck)return;const rect=$('map').getBoundingClientRect();if(!rect.width||!rect.height)return;fit=fitPaths(M.paths.filter(p=>!focusRoute||p.route_id===focusRoute),rect.width,rect.height);deck.setProps({width:rect.width,height:rect.height,viewState:{target:fit.target,zoom:fit.zoom}});render();}
$('route-focus').innerHTML='<button data-route="" aria-pressed="true">All routes</button>'+M.network.routes.map(r=>`<button data-route="${escape(r.route_id)}" aria-pressed="false">${escape(r.short_name)}</button>`).join('');
document.querySelectorAll('[data-route]').forEach(e=>e.onclick=()=>{focusRoute=e.dataset.route;document.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b===e)));if(focusRoute){const bus=busesAt(M,time).find(b=>b.route_id===focusRoute);if(bus)pick('bus',bus.trip_id);}fitMap();});
async function start(){
  await document.fonts.ready;
  deck=new Deck({canvas:$('map-canvas'),views:new OrthographicView({id:'network',flipY:true}),controller:false,initialViewState:{target:[0,0,0],zoom:0},getCursor:({isHovering})=>isHovering?'pointer':'default',onError:e=>{console.error(e);$('map-failure').hidden=false;}});
  new ResizeObserver(fitMap).observe($('map'));
  let previous=performance.now(),lastRender=0;
  function tick(now){if(playing){time+=Math.min((now-previous)/1000,.2)*speed;if(time>M.max)time=M.min;if(now-lastRender>80){render();lastRender=now;}}previous=now;requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
}
start().catch(e=>{console.error(e);$('map-failure').hidden=false;});

const oneHour=3600;
const limit=B['metrics.json'].targets.find(t=>t.target==='boardings'&&t.level==='route')?.tested_on??`Tested on later hours of one day, ${new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(M.meta.service_date+'T00:00:00Z'))}. Not tested on another day.`;
document.querySelectorAll('.forecast-limit').forEach(e=>e.textContent=limit.startsWith('Tested')?limit:'Tested on '+limit);
document.querySelectorAll('.date').forEach(e=>e.textContent=M.meta.service_date);
const openingModel=routeTarget?.pooled?.find(r=>r.model===routeTarget.chosen),openingNaive=routeTarget?.pooled?.find(r=>r.model===routeTarget.best_naive);
if(openingModel&&openingNaive){
  $('evaluation').innerHTML=`<p class="eyebrow">Untouched hours · route forecast</p><div class="evaluation-numbers"><div><strong>${number(openingModel.mae)}</strong><span>model</span></div><div><strong>${number(openingNaive.mae)}</strong><span>naive forecast</span></div></div><p class="small">Average miss: ${escape(routeTarget.unit)}. Every look-ahead together. Gain range: ${number(openingModel.skill_lo*100)}% to ${number(openingModel.skill_hi*100)}%. ${openingModel.skill_lo<=0&&openingModel.skill_hi>=0?'Includes zero; improvement is not established.':''}</p><p class="source">metrics.json · untouched part · ${M.meta.service_date}</p>`;
}
function renderError(){
  const score=rollingError(B['forecast/boardings-route.json'],time,3600);
  $('error-counter').innerHTML=score.n?`<span class="error-title">Miss so far at ${clock(time)}</span><strong>${number(score.model)} <small>forecast</small></strong><strong>${number(score.naive)} <small>naive forecast</small></strong><span class="source">passengers / route / ${M.meta.bin_seconds/60} min · ${score.n} completed bins<br>forecast/boardings-route.json · ${M.meta.service_date}</span>`:'<span>Waiting for the first one-hour forecast bin to finish. No error is known yet.</span>';
}
async function setView(next){
  view=next;playing=false;$('play').textContent='Play';
  document.querySelectorAll('nav button').forEach(e=>e.setAttribute('aria-current',e.dataset.view===next?'page':'false'));
  $('replay').hidden=['model','stories'].includes(next);$('model').hidden=next!=='model';$('stories').hidden=next!=='stories';
  $('gap-controls').hidden=next!=='gap';$('gap-results').hidden=next!=='gap';$('replay').classList.toggle('gap-view',next==='gap');
  $('forecast-controls').hidden=next!=='forecast';$('pick-stop').hidden=next!=='forecast';
  $('replay').classList.toggle('forecast-view',next==='forecast');
  $('map-caption').textContent=next==='forecast'?'Forecast against what happened':next==='gap'?'Where seats and passengers do not match':'The day, replayed';
  if(next==='forecast'){try{await ensureStopForecast();freezeForecast();}catch{$('challenge').textContent='The local forecast file could not be opened. Return to this view to try again.';stopForecastPromise=null;render();return;}}
  if(next==='model')renderModel();
  if(next==='gap'){renderGap();pollRoom();}
  if(next==='stories')renderStory();
  fitMap();render();window.scrollTo(0,0);
}
document.querySelectorAll('nav button').forEach(e=>e.onclick=()=>setView(e.dataset.view));
function freezeForecast(){forecastOrigin=[...M.meta.origins].reverse().find(o=>o<=time)??M.meta.origins[0];$('frozen-at').textContent=`Made at ${clock(forecastOrigin)}. Quarter hour ending ${clock(forecastOrigin+3600)}. forecast/boardings-stop.json · ${M.meta.service_date}`;render();}
$('freeze').onclick=freezeForecast;
function forecastLayers(shared,unit){
  if(view!=='forecast'||!B['forecast/boardings-stop.json'])return [];
  const rows=originRows(B['forecast/boardings-stop.json'],forecastOrigin,3600).filter(r=>r.horizon===3600);
  const data=[...new Set(rows.map(r=>r.id))].map(id=>{
    const bins=rows.filter(r=>r.id===id),known=bins.filter(r=>r.bin_start+B['forecast/boardings-stop.json'].bin_seconds<=time && r.actual!==null);
    return {id,position:M.stops.get(id).position,forecast:bins.reduce((s,r)=>s+r.forecast,0),actual:known.length?known.reduce((s,r)=>s+r.actual,0):null};
  });
  return [new ScatterplotLayer({...shared,id:'forecast-halos',data,getPosition:d=>d.position,getRadius:d=>Math.sqrt(d.forecast)*4,radiusUnits:'pixels',radiusMaxPixels:34,filled:false,stroked:true,getLineColor:[...C.spare,130],getLineWidth:2,lineWidthUnits:'pixels',pickable:true,onClick:({object})=>{if(object){$('forecast-stop').value=object.id;forecastSeries();pick('stop',object.id);}}}),new ScatterplotLayer({...shared,id:'actual-halos',data:data.filter(d=>d.actual!==null),getPosition:d=>d.position,getRadius:d=>Math.sqrt(d.actual)*4,radiusUnits:'pixels',radiusMaxPixels:34,getFillColor:[...C.flow,90]})];
}
$('forecast-stop').innerHTML=M.network.stops.map(s=>`<option value="${escape(s.stop_id)}">${escape(s.name)}</option>`).join('');
// Open on a stop with something to see: the stop of the rewarded-choice decision, where a bus left full.
{const busy=B['decisions.json'].decisions.find(d=>d.lever==='rewarded_choice')?.where?.stop_ids?.[0];if(busy&&M.network.stops.some(s=>s.stop_id===busy))$('forecast-stop').value=busy;}
let stopForecastPromise;
function ensureStopForecast(){
  if(!stopForecastPromise)stopForecastPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='stop-forecast.js';script.onload=()=>{if(B['forecast/boardings-stop.json'].fixture!==M.meta.fixture){delete B['forecast/boardings-stop.json'];reject(Error('Mixed forecast bundle'));return;}$('forecast-stop').value=B['forecast/boardings-stop.json'].series[0]?.id;forecastSeries();resolve();};script.onerror=()=>{ $('challenge').textContent='The local forecast file could not be opened.';reject(Error('Missing stop-forecast.js'));};document.head.append(script);});
  return stopForecastPromise;
}
let challengeRows=[],challengeRevealed=false;
function forecastSeries(){const candidates=B['forecast/boardings-stop.json']?.series.map((s,i)=>({...s,index:i})).filter(s=>s.id===$('forecast-stop').value)??[];$('forecast-series').innerHTML=candidates.map((s,i)=>`<option value="${s.index}">${escape(M.routes.get(s.route_id).short_name)}${s.direction!==undefined?' · direction '+s.direction:''}${candidates.filter(c=>c.route_id===s.route_id&&c.direction===s.direction).length>1?' · series '+(i+1):''}</option>`).join('');forecastTimes();}
function forecastTimes(){
  const series=$('forecast-series').value===''?null:B['forecast/boardings-stop.json']?.series[+$('forecast-series').value];
  challengeRows=(series?.rows??[]).filter(r=>r.horizon===oneHour && r.bin_start>=12*3600).sort((a,b)=>a.bin_start-b.bin_start);
  $('forecast-time').innerHTML=challengeRows.map((r,i)=>`<option value="${i}">${clock(r.bin_start)} to ${clock(r.bin_start+B['forecast/boardings-stop.json'].bin_seconds)}</option>`).join('');
  challengeRevealed=false;renderChallenge();
}
function renderChallenge(){
  const row=challengeRows[+$('forecast-time').value];
  $('reveal').hidden=!row;$('forecast-time').disabled=!row;
  if(!row){$('challenge').innerHTML='<p>No forecast was supplied for this stop in the hours the model had not seen. Choose another stop; no value has been invented.</p>';return;}
  $('challenge').innerHTML=`<p>Forecast made at ${clock(row.origin)} for the quarter of an hour ending ${clock(row.origin+row.horizon)}. The model had seen no records after ${clock(row.origin)}.</p>${forecastChart(challengeRows,+$('forecast-time').value,challengeRevealed,time,B['forecast/boardings-stop.json'].bin_seconds)}<p class="chart-key">The band is the forecast’s own range. Ink is what happened. Choose a point to see what happened then.</p><div class="challenge-numbers"><div><span class="eyebrow">Forecast</span><strong>${number(row.forecast)}</strong><span>passengers boarding</span><small>Range ${number(row.lo)} to ${number(row.hi)}</small></div><div><span class="eyebrow">What happened · measured</span><strong data-actual>${challengeRevealed?number(row.actual):'?'}</strong><span>${challengeRevealed?'passengers boarded':'Hidden until you reveal'}</span></div></div>${challengeRevealed?`<p data-miss>${row.actual===null?'No actual count supplied.':`A miss of ${number(Math.abs(row.forecast-row.actual))} passengers. ${row.actual>=row.lo&&row.actual<=row.hi?'Inside':'Outside'} the supplied range. The naive forecast said ${number(row.baseline)} and missed by ${number(Math.abs(row.baseline-row.actual))}.`}</p>`:''}`;
  document.querySelectorAll('[data-chart-bin]').forEach(e=>{const reveal=()=>{$('forecast-time').value=e.dataset.chartBin;challengeRevealed=true;renderChallenge();};e.onclick=reveal;e.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();reveal();}};});
  $('reveal').textContent=challengeRevealed?'Hide what happened':'Reveal what happened';
}
$('pick-stop').querySelector('.forecast-limit').textContent='Tested on '+(B['metrics.json'].targets.find(t=>t.level==='stop'&&t.target==='boardings')?.tested_on??limit).replace(/^Tested on /,'');
$('forecast-stop').onchange=forecastSeries;$('forecast-series').onchange=forecastTimes;$('forecast-time').onchange=()=>{challengeRevealed=false;renderChallenge();};$('reveal').onclick=()=>{challengeRevealed=!challengeRevealed;renderChallenge();};
$('model-target').innerHTML=B['metrics.json'].targets.map((t,i)=>`<option value="${i}">${escape(t.target.replaceAll('_',' '))} · ${escape(t.level)}</option>`).join('');
let metricsTarget;
function renderModel(){
  const t=B['metrics.json'].targets[+$('model-target').value],horizons=[...new Set(t.results.map(r=>r.horizon))].sort((a,b)=>a-b),all=t.subsets.find(s=>s.kind==='all')?.subset;
  const delay=t.target==='arrival_delay_seconds',hLabel=h=>delay?`${h} ${h===1?'stop':'stops'}`:`${h/60} minutes`,unit=delay?'seconds':'passengers';
  const result=(model,horizon,subset)=>t.results.find(r=>r.model===model&&r.horizon===horizon&&r.subset===subset);
  const selectedH=$('model-horizon').value;$('model-horizon').innerHTML=horizons.map(h=>`<option value="${h}">${hLabel(h)}</option>`).join('');$('model-horizon').value=horizons.includes(+selectedH)?selectedH:(horizons.includes(oneHour)?oneHour:horizons[0]);
  const h=+$('model-horizon').value,choices=t.models.filter(m=>!m.is_baseline),oldChoice=metricsTarget===$('model-target').value?$('model-choice').value:t.chosen;metricsTarget=$('model-target').value;
  $('model-choice').innerHTML=choices.map(m=>`<option value="${escape(m.model)}">${escape(m.label)}</option>`).join('');if(choices.some(m=>m.model===oldChoice))$('model-choice').value=oldChoice;
  const chosen=t.models.find(m=>m.model===$('model-choice').value),best=result(chosen.model,h,all);
  const baselines=t.models.filter(m=>m.is_baseline).map(m=>({m,r:result(m.model,h,all)})).filter(x=>x.r).sort((a,b)=>a.r.mae-b.r.mae),comparison=baselines.find(x=>x.m.model===best?.skill_vs)??baselines[0],naive=comparison?.m,base=comparison?.r;
  $('model-sentence').textContent=`${hLabel(h)} ahead: ${number(best?.mae)} ${unit} average miss. Best naive forecast in this table: ${number(base?.mae)}.${best&&base?(best.mae<base.mae?' The model misses less.':best.mae>base.mae?' The naive forecast misses less.':' The two have the same average miss.'):''}`;
  $('comparison-note').textContent=`Comparing ${chosen.label} with ${naive?.label??'no supplied naive result'}. The naive forecast is the one this result names, scored on the same quarter-hours. The line keeps that comparator across horizons. This table comparison does not select a model for deployment.`;
  $('model').querySelector('.forecast-limit').textContent='Tested on '+(t.tested_on??limit).replace(/^Tested on /,'');
  const pooled=t.pooled?.find(r=>r.model===chosen.model),range=t.range;
  if(pooled?.skill_lo<=0&&pooled?.skill_hi>=0)$('model-sentence').textContent+=' Across all horizons, the gain range includes zero; improvement is not established.';
  $('model-reliability').innerHTML=pooled?.skill!==null&&pooled?.skill!==undefined?`<h2>Is the forecast really better?</h2><p>Its misses are ${Math.round(Math.abs(pooled.skill)*100)} in 100 ${pooled.skill>=0?'smaller':'larger'} than the best naive forecast’s (${escape((t.models.find(m=>m.model===pooled.skill_vs)?.label??pooled.skill_vs).toLowerCase())}), every look-ahead together, over ${Number(pooled.n).toLocaleString('en-GB')} forecasts.</p>${gainChart(pooled)}<p>${pooled.skill_lo<=0&&pooled.skill_hi>=0?'The range includes zero. An improvement is not established.':pooled.skill_hi<0?'The whole range is below zero. The naive forecast did better.':'The whole range is above zero in the hours the model had not seen.'}</p><p class="small">The supplied range covers 95 in 100 resamples of whole forecast origins. It does not test another day.</p>`:'';
  if(range)$('model-reliability').innerHTML+=`<h2>Did the forecast’s own range hold?</h2><p>${number(range.promised*100)}% intended coverage; ${number(range.kept*100)}% observed coverage across the supplied rows.</p><div class="coverage">${[['Nobody boarded','kept_when_nobody_boarded'],['Somebody boarded','kept_when_somebody_boarded']].filter(([,key])=>range[key]!==null&&range[key]!==undefined).map(([label,key])=>`<p><strong>${number(range[key]*100)}%</strong>${label}</p>`).join('')}</div><p class="small">Coverage belongs to the bundle-selected forecast ranges. A range that covers empty bins can still miss when passengers board.</p>`;
  if(t.cautions?.length)$('model-reliability').innerHTML=`<div class="cautions"><h2>Where not to lean on it</h2>${t.cautions.map(c=>`<p>${escape(c.say)}</p>`).join('')}</div>`+$('model-reliability').innerHTML;
  $('model-features').innerHTML=t.features?.length?`<h2>What the model uses</h2>${[...t.features].sort((a,b)=>b.share-a.share).map(f=>`<div class="feature-row"><span>${escape(f.label)}</span><span>${number(f.share*100)}%</span><i style="width:${f.share*100}%"></i></div>`).join('')}<p class="small">Share of the supplied model's split gain. This is global importance, not a reason for one forecast or evidence of cause.</p>`:'';
  $('model-numbers').innerHTML=`<div><strong>${number(best?.mae)}</strong><span>Model · ${unit}</span></div><div><strong>${number(base?.mae)}</strong><span>Naive forecast · ${unit}</span></div>`;
  $('model-chart').innerHTML=horizonChart(horizons.map(h=>({horizon:delay?h:h/60,model:result(chosen.model,h,all)?.mae,naive:result(naive?.model,h,all)?.mae})),delay?h:h/60,delay?'stops ahead':'minutes ahead');
  $('model-unit').textContent=`Average absolute miss (MAE). ${t.unit}. Lower is better.`;
  $('model-table').innerHTML=`<div class="table-scroll"><table class="metrics"><thead><tr><th>Model</th>${horizons.map(h=>`<th>${hLabel(h)}<small>ahead</small></th>`).join('')}</tr></thead><tbody>${t.models.map(m=>`<tr><th>${m.is_baseline?'Naive forecast: ':''}${escape(m.label)}</th>${horizons.map(h=>`<td>${number(result(m.model,h,all)?.mae)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const horizon=+$('model-horizon').value;
  const worst=new Map(t.models.map(m=>[m.model,Math.max(...t.results.filter(r=>r.model===m.model&&r.horizon===horizon&&r.subset!==all).map(r=>r.mae))]));
  $('subset-table').innerHTML=`<div class="table-scroll"><table class="metrics"><thead><tr><th>Subset / model</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>WAPE</th><th>Bins / MAPE bins</th></tr></thead><tbody>${t.subsets.filter(s=>s.subset!==all).map(s=>t.models.map(m=>{const r=result(m.model,horizon,s.subset);return r?`<tr class="${r.mae===worst.get(m.model)?'worst':''}"><th>${escape(s.label)}<small>${m.is_baseline?'Naive forecast':escape(m.label)}${r.mae===worst.get(m.model)?' · Largest miss':''}</small></th><td>${number(r.mae)}</td><td>${number(r.rmse)}</td><td>${r.mape===null?'—':number(r.mape*100)+'%'}</td><td>${r.wape===null?'—':number(r.wape*100)+'%'}</td><td>${r.n} / ${r.mape_n}</td></tr>`:'';}).join('')).join('')}</tbody></table></div>`;
  const subsets=t.subsets.filter(s=>s.subset!==all).map(s=>({label:s.label,model:result(chosen.model,horizon,s.subset)?.mae,naive:result(result(chosen.model,horizon,s.subset)?.skill_vs??naive?.model,horizon,s.subset)?.mae})).filter(s=>Number.isFinite(s.model)).sort((a,b)=>b.model-a.model);
  $('worst-subset').textContent=subsets.length?`Largest average miss: ${subsets[0].label}, ${number(subsets[0].model)} ${unit}. Showing the ${Math.min(8,subsets.length)} largest subset misses; every supplied row is in More measures.`:'No subset results supplied.';
  $('subset-chart').innerHTML=subsetChart(subsets.slice(0,8));
  $('mape-rule').textContent=t.mape_rule;$('split-rule').textContent=`Learning: ${t.split.train}. Held-out: ${t.split.test}.`;
}
$('model-target').onchange=renderModel;$('model-horizon').onchange=renderModel;$('model-choice').onchange=renderModel;

function gapRows(){const hour=Math.floor(time/B['gap.json'].bin_seconds)*B['gap.json'].bin_seconds;return B['gap.json'].rows.filter(r=>r.hour_start===hour);}
function gapLayers(shared,unit){
  if(view!=='gap')return [];
  const rows=gapRows().map(r=>({...r,path:M.paths.find(p=>p.route_id===r.route_id&&p.direction===r.direction)}));
  const decisions=closedGaps?B['decisions.json'].decisions:[];
  const positions=decisions.flatMap(d=>d.where.stop_ids.map(id=>({id:d.id,title:d.title,position:M.stops.get(id).position})));
  return [new PathLayer({...shared,id:'gaps',data:rows,getPath:r=>r.path.points.map(p=>[p[0]+(r.direction?4:-4)*unit,p[1]]),getColor:r=>[...(r.over>0?C.over:C.spare),closedGaps?100:230],getWidth:7,widthUnits:'pixels',pickable:true,onClick:({object})=>{if(object){$('gap-hour').textContent=`${M.routes.get(object.route_id).short_name}, direction ${object.direction}: ${object.over} passengers above seats; ${object.spare} spare seats. Supplied route-hour totals. gap.json · ${M.meta.service_date}`;}}}),new ScatterplotLayer({...shared,id:'decision-places',data:positions,getPosition:d=>d.position,getRadius:13,radiusUnits:'pixels',filled:false,stroked:true,getLineColor:C.simulated,getLineWidth:3,lineWidthUnits:'pixels',pickable:true,onClick:({object})=>object&&document.getElementById('decision-'+object.id)?.scrollIntoView({behavior:'instant',block:'start'})})];
}
const metricLabel=key=>({passenger_minutes_over_seats:'passenger-minutes without a seat',passengers_over_seats_minutes:'passenger-minutes without a seat',empty_seat_km:'seat-kilometres run empty',minutes_saved_per_trip:'minutes saved per trip',passengers_shifted:'passengers shifted',load:'passengers on board',seats:'seats',points:'Khutwa points',doors_not_opened:'stop visits with doors closed'}[key]??key.replaceAll('_',' '));
function renderGap(){
  const totals=B['gap.json'].totals,which=closedGaps?'after':'before',values=totals[which],kind=values.kind??totals.kind;
  const key=$('gap-metric').value;
  $('gap-totals').innerHTML=`<div><span class="eyebrow">Before · ${escape(totals.before.kind??totals.kind)}</span><strong>${number(totals.before[key])}</strong></div><div><span class="eyebrow">${closedGaps?'With the decisions':'Current'} · ${escape(kind)}</span><strong data-total="${key}">${number(values[key])}</strong><span>${metricLabel(key)}</span></div>`;
  $('gap-assumption').textContent=`Simulated assumption: ${values.assumption??totals.assumption??'See each decision.'}`;
  $('close-gaps').textContent=closedGaps?'Show before':'Close the gaps';$('close-gaps').setAttribute('aria-pressed',String(closedGaps));
  $('decisions').hidden=!closedGaps;
  const rows=gapRows();$('gap-hour').textContent=`Hour beginning ${clock(Math.floor(time/B['gap.json'].bin_seconds)*B['gap.json'].bin_seconds)}. The colours show route-hour totals, not the load of each stretch.${closedGaps?' Rings locate proposed decisions. Faded routes show the scenario, not recalculated route loads.':''}`;
  $('gap-routes').innerHTML=rows.length?gapChart(rows,id=>M.routes.get(id).short_name)+`<p class="small">${escape(B['gap.json'].index_note)} Source: gap.json · ${M.meta.service_date}. Above seats is a passenger count; spare is a seat count.</p>`:'<p>No gap forecast is supplied for this hour.</p>';
  if(closedGaps)renderDecisions();renderRoom();
}
function decisionHTML(d,print=false,idPrefix=print?'order-':'decision-'){
  const depot=roomState?.decision_id===d.id?roomState.depot:null;
  const state=depot==='confirmed'?'Confirmed by the depot':depot==='ringing'?'Ringing the team member':depot==='declined'?'Declined by the depot':'Proposed';
  const evidence=`<p>${escape(d.why)}</p><dl class="evidence">${d.evidence.map(e=>`<div><dt>${escape(e.label)}</dt><dd>${number(e.value)} ${escape(e.unit)}<span class="source">${escape(e.source)} · ${M.meta.service_date}</span></dd></div>`).join('')}</dl>${d.effect.filter(e=>e.assumption).map(e=>`<p class="small simulated">Simulated assumption: ${escape(e.assumption)}</p>`).join('')}<p>${number(d.passengers_affected)} passengers affected. Confidence: ${escape(d.confidence)}; this is the supplied judgement, not a probability.</p><p class="small">${escape(d.cost_note)}</p><p class="source">decisions.json · ${M.meta.service_date}</p>`;
  const also=(d.related??[]).map(id=>B['decisions.json'].decisions.find(x=>x.id===id)??null).filter(Boolean);
  return `<article class="decision" id="${idPrefix}${escape(d.id)}"><div class="decision-top"><p class="eyebrow">${escape(d.lever.replaceAll('_',' '))}</p><span class="decision-state">${state}</span></div><h2>${escape(d.title)}</h2><p>${escape(d.change)}</p><p class="small">${escape(M.routes.get(d.where.route_id)?.long_name??d.where.route_id)} · ${clock(d.when.from)} to ${clock(d.when.to)} · ${M.meta.service_date}</p><div class="effects">${d.effect.map(e=>`<div class="decision-effect ${e.kind==='simulated'?'simulated':''}"><p>${escape(e.kind)} · ${escape(metricLabel(e.metric))}</p><p><span>${number(e.before)} before</span><strong>${number(e.after)}</strong> after</p></div>`).join('')}</div>${print?evidence:`<details class="decision-evidence"><summary>Evidence, assumptions and cost</summary>${evidence}</details>`}${also.length&&!print?`<p class="see-also">On the same route: ${also.map(x=>`<a href="#decision-${escape(x.id)}">${escape(x.title)}</a>`).join('; ')}.</p>`:''}${depot&&depot!=='none'?'<p class="small">A real call to a team member’s phone. No RTA system was contacted.</p>':''}${print?'':`<button data-print="${escape(d.id)}">Print the order</button>${d.lever==='rewarded_choice'?'<a class="button-link" href="khutwa/">Open the passenger’s offer</a>':''}`}</article>`;

}
function renderDecisions(){
  $('decisions').innerHTML='<div class="section-heading"><p class="eyebrow">A planner decides</p><h2>The changes behind the totals</h2><p>Proposals only. Nothing was sent to a depot or changed in an RTA system.</p></div>'+B['decisions.json'].decisions.map(d=>decisionHTML(d)).join('');
  document.querySelectorAll('[data-print]').forEach(e=>e.onclick=()=>printOrder(e.dataset.print));
}
async function printOrder(id){
  const d=B['decisions.json'].decisions.find(d=>d.id===id);
  $('print-order').innerHTML=`<p class="fixture">${M.meta.fixture?'STAND-IN DATA, NOT A RESULT':'Aggregate records only'}</p><h1>SIMULATION. NOTHING WAS SENT.</h1>${decisionHTML(d,true)}${d.swaps?.length?`<h2>Proposed vehicle exchange</h2><table class="swap-table"><thead><tr><th>Pair</th><th>Route · trip</th><th>Start</th><th>Current vehicle</th><th>Seats / peak load</th></tr></thead><tbody>${d.swaps.map((pair,i)=>[pair.from,pair.to].map((t,j)=>`<tr class="${j===0?'pair-start':''}"><td>${j===0?i+1:'↳'}</td><td>${escape(t.route_id)} · ${escape(t.trip_id)}</td><td>${clock(t.start)}</td><td>${escape(t.vehicle)} · ${escape(t.bus_type)}</td><td>${t.seats} / ${t.largest_load}</td></tr>`).join('')).join('')}</tbody></table><p>Exchange the two vehicles within each numbered pair. Planner review required: depot, vehicle blocks, access and driver duties have not been validated.</p>`:'<p>No specific vehicle exchange supplied. A planner must validate and assign trips.</p>'}<img width="90" height="90" src="qr-${encodeURIComponent(d.id)}.svg" alt="QR code back to this decision"><p class="source">insiyab.amirkazemkhani.com/#decision-${escape(d.id)}</p><p>A student prototype for the RTA Future Move Hackathon. Not an RTA product.</p>`;
  $('print-order').hidden=false;await $('print-order').querySelector('img').decode();await document.fonts.ready;window.print();
}
window.addEventListener('afterprint',()=>{$('print-order').hidden=true;});
$('gap-metric').onchange=renderGap;
let presenterCode='',roomPolling=false;
$('presenter-form').onsubmit=event=>{event.preventDefault();presenterCode=$('presenter-code').value;$('presenter-code').value='';$('presenter-status').textContent='Code held in this tab. Close the gaps to open the room offer.';$('end-offer').hidden=false;};
function validRoom(data){return ['waiting','offer','closed'].includes(data?.phase)&&['none','ringing','confirmed','declined'].includes(data.depot)&&['joined','accepted','declined'].every(k=>Number.isInteger(data[k])&&data[k]>=0)&&data.accepted+data.declined<=data.joined;}
async function setRoomPhase(phase){
  if(!presenterCode||!roomState)return;
  try{
    const decision=B['decisions.json'].decisions.find(d=>d.lever==='rewarded_choice');
    const response=await fetch('api/room/phase',{method:'POST',headers:{'content-type':'application/json','x-presenter-code':presenterCode},body:JSON.stringify({phase,...(decision?{decision_id:decision.id}:{})}),signal:AbortSignal.timeout(2000)});
    if(response.status===401){presenterCode='';$('end-offer').hidden=true;throw Error('Presenter code refused. Enter it again.');}
    if(!response.ok)throw Error('The room did not accept the change.');
    const data=await response.json();if(!validRoom(data)||data.store!=='shared'){roomState=null;throw Error('The live room is not ready.');}
    roomState=data;playbackCount=null;$('presenter-status').textContent=phase==='offer'?'The room offer is open.':'The room offer has ended.';
  }catch(error){$('presenter-status').textContent=error.message+' The local proposal still works; no live change is confirmed.';}
  renderRoom();
}
$('end-offer').onclick=()=>setRoomPhase('closed');
$('close-gaps').onclick=()=>{closedGaps=!closedGaps;renderGap();render();if(closedGaps)setRoomPhase('offer');};
function renderRoom(){
  if(playbackCount!==null){
    const d=B['decisions.json'].decisions.find(d=>d.lever==='rewarded_choice'),effect=d?.effect.find(e=>e.metric==='passengers_shifted');
    $('room-count').textContent=`Played back, nobody is connected. ${number(playbackCount)} of ${number(d?.passengers_affected)} passengers shift in the simulated offer. ${effect?.assumption??''}`;
  }else if(roomState){$('room-count').textContent=`In this room: ${roomState.accepted} of ${roomState.joined} took the offer. ${roomState.declined} declined. Room responses are not measured commuting behaviour.`;}
  else $('room-count').textContent='No phones are connected to this page. Play the offer back to see what a passenger would see.';
  $('playback').hidden=!!roomState;$('presenter').hidden=!roomState;
}
$('playback').onclick=()=>{const d=B['decisions.json'].decisions.find(d=>d.lever==='rewarded_choice'),effect=d?.effect.find(e=>e.metric==='passengers_shifted');playbackCount=effect?.after??0;closedGaps=true;renderGap();render();};
async function pollRoom(){
  if(roomPolling||view!=='gap'||!/^https?:$/.test(location.protocol))return;
  roomPolling=true;const previous=roomState;
  try{const response=await fetch('api/room/state',{signal:AbortSignal.timeout(2000),cache:'no-store'});if(!response.ok)throw Error('Room absent');const data=await response.json();if(!validRoom(data)||data.store!=='shared')throw Error('Shared room absent');roomState=data;playbackCount=null;}
  catch{roomState=null;}finally{roomPolling=false;}
  renderRoom();if(closedGaps&&(previous?.depot!==roomState?.depot||previous?.decision_id!==roomState?.decision_id)){
    const open=[...document.querySelectorAll('.decision-evidence[open]')].map(e=>e.closest('.decision').id);renderDecisions();open.forEach(id=>document.getElementById(id)?.querySelector('details')?.setAttribute('open',''));
  }
}
setInterval(()=>{if(view==='gap')pollRoom();},1500);
if(location.hash.startsWith('#decision-')){closedGaps=true;setView('gap');setTimeout(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView(),0);}

let personIndex=0,stepIndex=0;
$('people').innerHTML=B['personas.json'].personas.map((p,i)=>`<button data-person="${i}">${escape(p.title)}</button>`).join('');
document.querySelectorAll('[data-person]').forEach(e=>e.onclick=()=>{personIndex=+e.dataset.person;stepIndex=0;renderStory();window.scrollTo(0,0);});
function renderStory(){
  const person=B['personas.json'].personas[personIndex],step=person.steps[stepIndex],simulated=step.kind==='simulated';
  time=step.t;playing=false;$('play').textContent='Play';
  if(person.anchor.stop_id){selected=person.anchor.stop_id;$('entity-type').value='stop';records();}
  document.querySelectorAll('[data-person]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.person===personIndex)));
  $('fictional').textContent=person.label;
  $('story-place').textContent=person.anchor.stop_id?M.stops.get(person.anchor.stop_id).name:M.routes.get(person.anchor.route_id).long_name;
  $('story-time').textContent=`${clock(step.t)} · ${M.meta.service_date}`;
  $('scene').innerHTML=sceneSVG(person,step,M,escape);
  $('scene-caption').textContent='Illustration. It does not show a real passenger or a count of people waiting.';
  $('story-kind').textContent=simulated?'With Insiyab · simulated':'What happened · measured';$('story-kind').classList.toggle('simulated',simulated);
  $('story-say').textContent=step.say;
  $('story-values').innerHTML=['before','after'].flatMap(which=>Object.entries(step[which]??{}).map(([key,value])=>`<p class="${simulated?'simulated':''}"><strong>${number(value)}</strong> ${escape(metricLabel(key))}<small>${which==='before'?'Before':'After'} · ${escape(step.kind)} · personas.json · ${M.meta.service_date}</small></p>`)).join('');
  $('story-seats').innerHTML=seatDiagram(step);
  $('story-source').textContent=`personas.json · ${M.meta.service_date} · Step ${stepIndex+1} of ${person.steps.length}`;
  const decision=B['decisions.json'].decisions.find(d=>d.id===step.decision_id);
  $('story-decision').innerHTML=decision?`<details><summary>The decision behind this change</summary>${decisionHTML(decision,false,'story-decision-').replace(/<button data-print=.*?<\/button>/,'')}</details>`:'';
  if(step.scene==='phone')$('story-action').innerHTML='<a class="button-link primary" href="khutwa/">See the offer on her phone</a>';
  else if(stepIndex<person.steps.length-1)$('story-action').innerHTML='<button id="story-next" class="primary">See what changes</button>';
  else $('story-action').innerHTML=`<button id="story-next" class="primary">${personIndex<B['personas.json'].personas.length-1?'Meet '+escape(B['personas.json'].personas[personIndex+1].title.toLowerCase()):'Return to the day'}</button>`;
  if($('story-next'))$('story-next').onclick=()=>{if(stepIndex<person.steps.length-1)stepIndex++;else if(personIndex<B['personas.json'].personas.length-1){personIndex++;stepIndex=0;}else{setView('replay');return;}renderStory();};
  const visits=M.visits.filter(v=>v.route_id===person.anchor.route_id&&(!person.anchor.stop_id||v.stop_id===person.anchor.stop_id));
  const closest=visits.reduce((a,b)=>Math.abs(a.act_dep-step.t)<Math.abs(b.act_dep-step.t)?a:b);
  const bin=Math.floor(step.t/M.meta.bin_seconds)*M.meta.bin_seconds;
  const boardings=visits.filter(v=>v.act_dep>=bin&&v.act_dep<bin+M.meta.bin_seconds).reduce((sum,v)=>sum+v.on,0);
  $('story-record').innerHTML=`<details><summary>Look at the recorded context</summary><p>${number(boardings)} boardings ${person.anchor.stop_id?'at this stop':'on this route'} in the quarter hour beginning ${clock(bin)}. Measured, not a count of people waiting.</p><p>Nearest recorded departure: ${clock(closest.act_dep)}, ${escape(closest.trip_id)}. ${closest.load} passengers on board; ${closest.seats} seats. ${number((closest.act_dep-closest.sched_dep)/60)} minutes relative to the timetable. Measured.</p><p class="source">replay/route-${escape(person.anchor.route_id)}.json · ${M.meta.service_date}. Story values above use personas.json; this is the nearest replay record, not a reconstructed personal journey.</p></details>`;
  render();
}
