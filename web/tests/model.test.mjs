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
const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*#([0-9a-fA-F]{6})/g)].map(m=>[m[1],m[2]]));
function lum(hex){const rgb=hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
for(const name of ['ink','flow','over','spare','simulated','muted','dark-grey']){const ratio=(lum(tokens.paper)+.05)/(lum(tokens[name])+.05);assert.ok(ratio>=4.5,`${name} ${ratio}`);console.log(`PASS contrast ${name} / paper ${ratio.toFixed(2)}:1`);}
const {rollingError}=await import('../src/model.mjs');
const forecasts={bin_seconds:10,series:[{rows:[{horizon:20,bin_start:20,forecast:4,baseline:8,actual:6},{horizon:20,bin_start:30,forecast:100,baseline:1,actual:4},{horizon:20,bin_start:10,forecast:5,baseline:8,actual:null}]}]};
assert.deepEqual(rollingError(forecasts,29,20),{n:0,model:null,naive:null});
assert.deepEqual(rollingError(forecasts,30,20),{n:1,model:2,naive:2});
assert.throws(()=>assert.equal(rollingError(forecasts,30,20).n,3));
console.log('PASS rolling error excludes future bins and missing actuals; negative control rejects leakage');
globalThis.document={documentElement:{clientWidth:928}};
const {horizonChart}=await import('../src/charts.mjs');
const chart=horizonChart([15,30,60,120].map(h=>({horizon:h,model:2,naive:4})),60,'minutes ahead');
const dots=[...chart.matchAll(/class="model-line chart-dot" cx="([\d.]+)"/g)].map(m=>+m[1]);
assert.equal(dots.length,4);assert.ok(Math.abs((dots[2]-dots[1])/(dots[1]-dots[0])-2)<.001);
assert.throws(()=>assert.ok(Math.abs((dots[2]-dots[1])/(dots[1]-dots[0])-1)<.001));
console.log('PASS horizon chart uses elapsed time, not equally spaced categories; negative control rejects uniform spacing');
