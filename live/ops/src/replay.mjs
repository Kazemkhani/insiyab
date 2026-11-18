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
  let lateRoutes = new Set(), alert = null, heat = [];
  const paths = model.network.routes.flatMap(r => r.directions.map(d => ({path: d.shape})));
  function draw() {
    if (!overlay) return;
    const buses = busesAt(model, seconds).map(b => ({position: lngLat(b.position), route: b.route_id}));
    host.dataset.buses = String(buses.length);
    host.dataset.time = String(seconds);
    const layers = [
      new PathLayer({id:'routes', data:paths, getPath:d=>d.path, getColor:[...ink,128], getWidth:1, widthUnits:'pixels'}),
      new ScatterplotLayer({id:'stops', data:model.network.stops, getPosition:d=>[d.lon,d.lat], getRadius:2, radiusUnits:'pixels', getFillColor:ivory, getLineColor:muted, stroked:true, lineWidthMinPixels:1}),
    ];
    if (!busRenderer) layers.push(new ScatterplotLayer({id:'buses', data:buses, getPosition:d=>d.position, getRadius:3, radiusUnits:'pixels', getFillColor:d=>lateRoutes.has(d.route)?[196,43,43]:ink}));
    if (alert) layers.push(new ScatterplotLayer({id:'alert-stop', data:[alert], getPosition:d=>[d.lon,d.lat], getRadius:9, radiusUnits:'pixels', getFillColor:ivory, getLineColor:[196,43,43], stroked:true,lineWidthMinPixels:2}));
    if (heat.length) layers.push(new ScatterplotLayer({id:'heat-stops', data:heat, getPosition:d=>[d.lon,d.lat], getRadius:d=>Math.max(5,Math.min(24,Math.sqrt(d.priority)*1.3)), radiusUnits:'pixels', getFillColor:d=>d.stop_kind==='ac_shelter'?ink:ivory,getLineColor:d=>d.priority>160?[196,43,43]:ink,stroked:true,lineWidthMinPixels:2}));
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
    map.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]], {padding:45,duration:0});
    host.dataset.ready='true';draw();
  },()=>{note.textContent='Basemap unavailable. Route geometry remains visible. '+model.network.source.credit;});
  if (localProtocol) maplibregl.addProtocol('pmtiles', (params, abort) => localProtocol.tile(params, abort));
  map=result.map;
  return {setTime, stop, play,
    setAlerts(alerts) {lateRoutes=new Set(alerts.filter(a=>a.watcher==='running_late').map(a=>a.route));alert=alerts[0]??null;draw();},
    setHeat(stops) {heat=stops;draw();},
    setBusRenderer(renderer) {busRenderer=renderer;draw();},
    map,
  };
}
