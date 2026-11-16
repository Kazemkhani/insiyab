import {Deck, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';
import {PathLayer,ScatterplotLayer,PolygonLayer,TextLayer} from '@deck.gl/layers';
import {createModel, busesAt, boardingsAt, fitPaths, pointAlong, clock, number} from './model.mjs';
const B=window.INSIYAB_BUNDLE, M=createModel(B), $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=getComputedStyle(document.documentElement);
const colour=name=>css.getPropertyValue('--'+name).trim().match(/\w\w/g).map(v=>parseInt(v,16));
const C=Object.fromEntries(['ink','paper','flow','over','spare','simulated','line','grey'].map(n=>[n,colour(n)]));
let time=Math.min(M.max,Math.max(M.min,M.meta.origins[0]+M.meta.bin_seconds)),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=300,deck,fit,selected=M.network.stops[0].stop_id,lastBin=-1,stopData=[];
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
function pick(kind,id){$('entity-type').value=kind;selected=id;records();}
function render() {
  $('clock').value=clock(time);$('time').value=time;
  const bin=Math.floor(time/M.meta.bin_seconds);
  if(bin!==lastBin){stopData=boardingsAt(M,time);lastBin=bin;detail();}
  if(!deck||!fit)return;
  const buses=busesAt(M,time),unit=1/fit.scale;
  const shared={coordinateSystem:COORDINATE_SYSTEM.CARTESIAN};
  deck.setProps({layers:[
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
  window.insiyab={model:M,time,buses,fit,deck,setTime:t=>{time=+t;playing=false;$('play').textContent='Play';render();},get selected(){return selected;}};
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
