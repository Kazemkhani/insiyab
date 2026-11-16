import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createModel,locateBus,pointAlong,fitPaths,boardingsAt} from '../src/model.mjs';
const root=path.resolve(import.meta.dirname,'../..'),bundle={};
function load(dir){for(const name of fs.readdirSync(path.join(root,'fixtures',dir))){const relative=path.join(dir,name),full=path.join(root,'fixtures',relative);if(fs.statSync(full).isDirectory())load(relative);else if(name.endsWith('.json'))bundle[relative]=JSON.parse(fs.readFileSync(full));}}
load('');const m=createModel(bundle),t=m.trips[0],a=t.visits[0],b=t.visits[1];
assert.equal(locateBus(t,a.act_arr-1),null);assert.deepEqual(locateBus(t,a.act_dep).position,m.stops.get(a.stop_id).position);
assert.ok(Math.abs(locateBus(t,(a.act_dep+b.act_arr)/2).distance-(a.distance+b.distance)/2)<1e-7);
assert.equal(locateBus(t,t.visits.at(-1).act_dep+1),null);
console.log('PASS dwell, movement, endpoints and inactive bus');
const bent={points:[[0,0],[0,10],[10,10]],distances:[0,10,20]};
assert.deepEqual(pointAlong(bent,10),[0,10]);assert.deepEqual(pointAlong(bent,15),[5,10]);
assert.throws(()=>assert.deepEqual(pointAlong(bent,10),[5,5]));
console.log('PASS curved path; negative control rejects straight-line shortcut');
const time=a.act_dep,bin=Math.floor(time/m.meta.bin_seconds)*m.meta.bin_seconds;
assert.equal(boardingsAt(m,time).reduce((s,x)=>s+x.on,0),m.visits.filter(v=>v.act_dep>=bin&&v.act_dep<bin+m.meta.bin_seconds).reduce((s,v)=>s+v.on,0));
console.log('PASS stop boardings match record sums');
for(const [w,h] of [[900,330],[358,280]]){const f=fitPaths(m.paths,w,h);assert.ok(f.scale>0);}
console.log('PASS fitted map at laptop and phone sizes');
// Measure each semantic foreground against its actual background.
const css=fs.readFileSync(path.join(root,'web/src/style.css'),'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):#([0-9a-fA-F]{6})/g)].map(m=>[m[1],m[2]]));
function lum(hex){const rgb=hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
for(const name of ['ink','flow','over','spare','simulated','muted','dark-grey']){const ratio=(lum(tokens.paper)+.05)/(lum(tokens[name])+.05);assert.ok(ratio>=4.5,`${name} ${ratio}`);console.log(`PASS contrast ${name} / paper ${ratio.toFixed(2)}:1`);}
