// All transport values come from the contract bundle. Geometry uses a local
// equirectangular projection, then distance along the supplied route shape.
export const clock = s => `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor(s % 3600 / 60)).padStart(2,'0')}`;
export const number = n => n == null ? 'Not available' : new Intl.NumberFormat('en-GB',{maximumFractionDigits:Math.abs(n)>0&&Math.abs(n)<.01?4:2}).format(n);
export function createModel(bundle) {
  const meta = bundle['meta.json'], network = bundle['network.json'];
  const coords = network.routes.flatMap(r=>r.directions.flatMap(d=>d.shape));
  const lon = coords.reduce((a,p)=>a+p[0],0)/coords.length, lat = coords.reduce((a,p)=>a+p[1],0)/coords.length;
  const project = p => [(p[0]-lon)*Math.cos(lat*Math.PI/180)*10000,-(p[1]-lat)*10000];
  const stops = new Map(network.stops.map(s=>[s.stop_id,{...s,position:project([s.lon,s.lat])}]));
  const routes = new Map(network.routes.map(r=>[r.route_id,r]));
  const paths = network.routes.flatMap(r=>r.directions.map(d=> {
    const points=d.shape.map(project), distances=[0];
    for(let i=1;i<points.length;i++) distances.push(distances.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    return {...d,route_id:r.route_id,label:r.short_name,points,distances};
  }));
  const along = (p,path,min=0) => {
    let best={error:Infinity,distance:min};
    for(let i=1;i<path.points.length;i++) {
      const a=path.points[i-1],b=path.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=path.distances[i]-path.distances[i-1];
      const fraction=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length||1)));
      const distance=path.distances[i-1]+fraction*length;
      const error=Math.hypot(p[0]-a[0]-fraction*dx,p[1]-a[1]-fraction*dy);
      if(distance>=min-0.001 && error<best.error) best={error,distance};
    }
    return best.distance;
  };
  const trips=bundle['replay/index.json'].routes.flatMap(r=>bundle[r.file].trips.map(trip=>{
    const path=paths.find(p=>p.route_id===r.route_id && p.direction===trip.direction);
    let previous=0;
    return {...trip,route_id:r.route_id,path,visits:trip.visits.map(v=>{previous=along(stops.get(v.stop_id).position,path,previous);return {...v,distance:previous};})};
  }));
  const visits=trips.flatMap(t=>t.visits.map(v=>({...v,trip_id:t.trip_id,route_id:t.route_id,seats:t.seats})));
  const min=Math.min(...trips.map(t=>t.visits[0].act_arr)),max=Math.max(...trips.map(t=>t.visits.at(-1).act_dep));
  return {meta,network,stops,routes,paths,trips,visits,min,max,project};
}
export function pointAlong(path,distance) {
  for(let i=1;i<path.points.length;i++) if(distance<=path.distances[i]) {
    const f=(distance-path.distances[i-1])/(path.distances[i]-path.distances[i-1]||1),a=path.points[i-1],b=path.points[i];
    return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
  }
  return path.points.at(-1);
}
export function locateBus(trip,time) {
  const visits=trip.visits;
  if(time<visits[0].act_arr || time>visits.at(-1).act_dep) return null;
  let visit=visits[0],distance=visit.distance;
  for(let i=0;i<visits.length;i++) {
    visit=visits[i]; distance=visit.distance;
    if(time<=visit.act_dep) break;
    const next=visits[i+1];
    if(next && time<next.act_arr) {distance+=(next.distance-distance)*(time-visit.act_dep)/(next.act_arr-visit.act_dep); break;}
  }
  return {...trip,position:pointAlong(trip.path,distance),distance,load:visit.load,delay:visit.act_arr-visit.sched_arr,stop_id:visit.stop_id};
}
export const busesAt = (model,time) => model.trips.map(t=>locateBus(t,time)).filter(Boolean);
export function boardingsAt(model,time) {
  const start=Math.floor(time/model.meta.bin_seconds)*model.meta.bin_seconds;
  return [...model.stops.values()].map(s=>({...s,on:model.visits.filter(v=>v.stop_id===s.stop_id && v.act_dep>=start && v.act_dep<start+model.meta.bin_seconds).reduce((n,v)=>n+v.on,0)}));
}
export function fitPaths(paths,width,height) {
  const points=paths.flatMap(p=>p.points),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const padding=Math.min(48,width*.15,height*.15);
  const scale=Math.min((width-padding)/(maxX-minX||1),(height-padding)/(maxY-minY||1));
  return {target:[(minX+maxX)/2,(minY+maxY)/2,0],zoom:Math.log2(Math.max(.01,scale)),scale};
}
// Score only bins whose end is at or behind the clock. Null actuals never score.
export function rollingError(forecast,time,horizon) {
  const rows=forecast.series.flatMap(s=>s.rows).filter(r=>r.horizon===horizon && r.bin_start+forecast.bin_seconds<=time && r.actual!==null);
  const mean=key=>rows.length?rows.reduce((s,r)=>s+Math.abs(r[key]-r.actual),0)/rows.length:null;
  return {n:rows.length,model:mean('forecast'),naive:mean('baseline')};
}
export function originRows(forecast,origin,horizon) {
  return forecast.series.flatMap(s=>s.rows.filter(r=>r.origin===origin && r.horizon<=horizon).map(r=>({...r,id:s.id,route_id:s.route_id})));
}
