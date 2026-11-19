import {HEAT_THRESHOLD} from './heat.mjs';
import {initMap} from '../../../web/src/map.mjs';
import {createModel, busesAt, clock} from '../../../web/src/model.mjs';
import maplibregl from 'maplibre-gl';
import {Protocol, PMTiles, FileSource} from 'pmtiles';
import {PathLayer, ScatterplotLayer} from '@deck.gl/layers';

export async function mountReplay(bundle) {
  const model = createModel(bundle), host = document.querySelector('#map');
  const slider = document.querySelector('#time'), replay = document.querySelector('#replay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ink = [21,24,29], muted = [134,135,135], ivory = [247,245,240];
  let map, overlay, seconds = 57600, playing = false, frame, last, busRenderer;
  const origin = model.project([0,0]), unit = model.project([1,1]);
  const lngLat = p => [(p[0]-origin[0])/(unit[0]-origin[0]), (p[1]-origin[1])/(unit[1]-origin[1])];
  const pulse=document.createElement('div');pulse.className='alert-pulse';pulse.hidden=true;host.append(pulse);
  const stallRing=document.createElement('div');stallRing.className='stall-ring';stallRing.hidden=true;host.append(stallRing);
  const stallLabel=document.createElement('div');stallLabel.className='stall-label';stallLabel.hidden=true;stallLabel.textContent='Not moving · likely 13 min late';host.append(stallLabel);
  let lateRoutes = new Set(), alert = null, heat = [], stalled = null, stalledRoute = null;
  const paths = model.network.routes.flatMap(r => r.directions.map(d => ({path: d.shape})));
  function draw() {
    if (!overlay) return;
    if (alert) {const p=map.project([alert.lon,alert.lat]);pulse.style.left=`${p.x-13}px`;pulse.style.top=`${p.y-13}px`;pulse.hidden=false;} else pulse.hidden=true;
    if (stalled) {
      const sp=map.project([stalled.lon,stalled.lat]);
      stallRing.style.left=`${sp.x-16}px`;stallRing.style.top=`${sp.y-16}px`;stallRing.hidden=false;
      stallLabel.style.left=`${sp.x+22}px`;stallLabel.style.top=`${sp.y-10}px`;stallLabel.hidden=false;
    } else {stallRing.hidden=true;stallLabel.hidden=true;}
    const buses = busesAt(model, seconds).map(b => ({position: lngLat(b.position), route: b.route_id}));
    host.dataset.buses = String(buses.length);
    host.dataset.time = String(seconds);
    const layers = [
      new PathLayer({id:'routes', data:paths, getPath:d=>d.path, getColor:[...ink,128], getWidth:1, widthUnits:'pixels'}),
      new ScatterplotLayer({id:'stops', data:model.network.stops, getPosition:d=>[d.lon,d.lat], getRadius:2, radiusUnits:'pixels', getFillColor:d=>d.stop_kind==='ac_shelter'?ink:ivory, getLineColor:d=>d.stop_kind?muted:[191,190,187], stroked:true, lineWidthMinPixels:1}),
    ];
    if (!busRenderer) layers.push(new ScatterplotLayer({id:'buses', data:buses, getPosition:d=>d.position, getRadius:3, radiusUnits:'pixels', getFillColor:d=>lateRoutes.has(d.route)?[196,43,43]:ink}));
    if (alert) layers.push(new ScatterplotLayer({id:'alert-stop', data:[alert], getPosition:d=>[d.lon,d.lat], getRadius:9, radiusUnits:'pixels', getFillColor:ivory, getLineColor:[196,43,43], stroked:true,lineWidthMinPixels:2}));
    if (stalled && stalledRoute) {
      const stalledPaths=model.network.routes.filter(r=>(r.route_id||r.id||r.route)===stalledRoute).flatMap(r=>r.directions.map(d=>({path:d.shape})));
      if (stalledPaths.length) layers.push(new PathLayer({id:'stall-route',data:stalledPaths,getPath:d=>d.path,getColor:[196,43,43,220],getWidth:3,widthUnits:'pixels'}));
    }
    if (heat.length) layers.push(new ScatterplotLayer({id:'heat-stops', data:heat, getPosition:d=>[d.lon,d.lat], getRadius:d=>Math.max(5,Math.min(24,Math.sqrt(d.priority)*1.3)), radiusUnits:'pixels', getFillColor:d=>d.stop_kind==='ac_shelter'?ink:ivory,getLineColor:d=>d.priority>HEAT_THRESHOLD?[196,43,43]:ink,stroked:true,lineWidthMinPixels:2}));
    overlay.setProps({layers});
    busRenderer?.draw(buses, lateRoutes);
  }
  function setTime(value) {
    seconds = Math.min(72000, Math.max(57600, value));
    slider.value = String(Math.round(seconds));
    document.querySelector('#replay-clock').textContent = clock(seconds);
    slider.setAttribute('aria-valuetext', clock(seconds));
    draw();
  }
  function stop() {playing=false;cancelAnimationFrame(frame);replay.textContent='Replay';host.dataset.playing='false';}
  function tick(now) {
    if (!playing) return;
    // Four hours in 90 seconds, only while the presenter explicitly replays.
    const next = seconds + (now-last)/1000*160; last=now;
    setTime(next);
    if (seconds >= 72000) stop(); else frame=requestAnimationFrame(tick);
  }
  function play() {
    if (reduced.matches) {stop();setTime(72000);return;}
    if (seconds >= 72000) setTime(57600);
    playing=true;last=performance.now();replay.textContent='Pause';host.dataset.playing='true';frame=requestAnimationFrame(tick);
  }
  replay.disabled=false;
  replay.addEventListener('click',()=>playing?stop():play());
  slider.addEventListener('input',()=>{stop();setTime(Number(slider.value));});
  reduced.addEventListener('change',()=>{stop();draw();});
  const note = document.querySelector('#map-note');
  note.textContent = `${model.network.source.credit}. Stand-in bus movements, not live positions.`;
  // Python's simple HTTP server does not implement byte-range requests. Read
  // the small local archive once, then reuse the home map's PMTiles protocol.
  let localProtocol;
  if (location.protocol !== 'file:') {
    const archiveURL = new URL('map/dubai.pmtiles', location.href).href;
    const response = await fetch(archiveURL);
    if (!response.ok) throw Error('Local map archive unavailable');
    localProtocol = new Protocol();
    localProtocol.add(new PMTiles(new FileSource(new File([await response.arrayBuffer()], archiveURL))));
  }
  const result = await initMap(host, (readyMap, readyOverlay)=>{
    map=readyMap;overlay=readyOverlay;
    const points=paths.flatMap(p=>p.path), xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const fit=()=>map.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]], {padding:45,duration:0});
    new ResizeObserver(()=>{map.resize();fit();draw();}).observe(host);
    fit();
    map.on('move',draw);
    host.dataset.ready='true';draw();
  },()=>{note.textContent='Basemap unavailable. Route geometry remains visible. '+model.network.source.credit;});
  if (localProtocol) maplibregl.addProtocol('pmtiles', (params, abort) => localProtocol.tile(params, abort));
  map=result.map;
  return {setTime, stop, play,
    setAlerts(alerts) {lateRoutes=new Set(alerts.filter(a=>a.watcher==='running_late').map(a=>a.route));alert=alerts[0]??null;pulse.hidden=true;draw();},
    setHeat(stops) {heat=stops;host.dataset.heat=String(stops.length);draw();},
    setBusRenderer(renderer) {busRenderer=renderer;draw();},
    stallBus(lon, lat, route) {
      stalled={lon,lat}; stalledRoute=route||null;
      if (reduced.matches) { if (map) map.jumpTo({center:[lon,lat],zoom:14}); }
      else if (map) map.flyTo({center:[lon,lat],zoom:14,duration:1200});
      stallRing.classList.remove('stall-ring--active');
      void stallRing.offsetWidth; // force reflow so animation restarts
      stallRing.classList.add('stall-ring--active');
      draw();
    },
    map,
  };
}
