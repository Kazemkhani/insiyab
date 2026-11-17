import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build}=require('../node_modules/esbuild');
const [siteArg,outArg,audioArg]=process.argv.slice(2);
if(!siteArg||!outArg||!audioArg)throw Error('Usage: prepare-comic.mjs <built site> <media folder> <local audio folder>');
const site=path.resolve(siteArg),out=path.resolve(outArg),audio=path.resolve(audioArg);
await fs.mkdir(out,{recursive:true});
const read=async name=>JSON.parse(await fs.readFile(path.join(site,'data',name),'utf8'));
const [meta,network,personas,decisions,forecast,delay]=await Promise.all(['meta.json','network.json','personas.json','decisions.json','forecast/boardings-route.json','forecast/delay-route.json'].map(read));
const swap=decisions.decisions.find(d=>d.lever==='right_bus')?.swaps?.[0];
if(!swap)throw Error('This film requires a supplied vehicle exchange; it cannot invent one.');
const person=id=>personas.personas.find(p=>p.id===id);
const worker=person('site_worker'),office=person('office_worker');
if(worker.steps[0].before.load!==swap.from.largest_load||worker.steps[0].before.seats!==swap.from.seats||worker.steps[1]?.after?.load!==swap.from.largest_load||worker.steps[1]?.after?.seats!==swap.to.seats)throw Error('The worker story and first exchange do not describe the same load.');
const series=forecast.series.find(s=>s.id===swap.from.route_id)??forecast.series[0];
const rows=series.rows.filter(r=>r.horizon===3600).sort((a,b)=>a.bin_start-b.bin_start).slice(0,12);
const delaySeries=delay.series.find(s=>s.id===series.id)??delay.series[0];
const delayRow=delaySeries.rows.find(r=>r.stops_ahead===5)??delaySeries.rows[0];
// The sound owner supplies one normalized, timed mix. Refuse superseded claims.
const cues=JSON.parse(await fs.readFile(path.join(audio,'cues.json'),'utf8'));
if(cues.length_seconds!==60||cues.lines.length!==13)throw Error('Expected the supplied thirteen-line, sixty-second cut.');
for(const [i,line] of cues.lines.entries()){
 if(line.n!==i+1||!Number.isFinite(line.start)||!Number.isFinite(line.end)||line.start<0||line.end<=line.start||line.end>60||(i&&line.start<cues.lines[i-1].end))throw Error('Invalid narration timing.');
 if(/will be waiting|still happening|nobody can see|same half hour/i.test(line.text))throw Error('Superseded narration claim. Use the corrected recordings.');
}
await fs.mkdir(path.join(out,'audio'),{recursive:true});
await fs.copyFile(path.join(audio,'soundtrack.wav'),path.join(out,'audio/soundtrack.wav'));
const manifest={fixture:meta.fixture,date:meta.service_date,source:network.source,swap,worker,office,stop:network.stops.find(s=>s.stop_id===worker.anchor.stop_id),forecast:{route:series.id,rows,bin:forecast.bin_seconds},delay:{route:delaySeries.id,row:delayRow},cues,clips:{}};
await fs.writeFile(path.join(out,'comic.json'),JSON.stringify(manifest,null,2)+'\n');
for(const name of ['fonts','qr.svg','bundle.js','style.css'])await fs.cp(path.join(site,name),path.join(out,name),{recursive:true});
await build({entryPoints:[path.resolve('web/film/stage.mjs')],outfile:path.join(out,'stage.js'),bundle:true,format:'iife',target:'es2022',minify:true});
await fs.writeFile(path.join(out,'stage.html'),'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>html,body{margin:0!important;width:100%;height:100%;overflow:hidden}#scene{height:100vh!important;width:100vw!important;margin:0!important;border:0!important}.scene-tools,.scene-title,.scene-reading,.scene-simulation{display:none!important}</style></head><body><div id="scene"></div><script src="bundle.js"></script><script src="stage.js"></script></body></html>');
console.log('COMIC ASSETS PREPARED; thirteen corrected voice lines with the supplied normalized soundtrack.');
