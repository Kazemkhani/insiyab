// Accessible SVG charts of supplied values. Scales describe the data; no fitted
// trend, interval or transport quantity is invented by the renderer.
import {number,clock} from './model.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const width=()=>Math.min(880,Math.max(300,document.documentElement.clientWidth-48));
const svg=(w,h,title,body)=>`<svg class="data-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const text=(x,y,label,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(label)}</text>`;
export function horizonChart(rows,horizon,label){
 const w=width(),h=270,l=42,r=w-80,top=20,bottom=215,max=Math.max(...rows.flatMap(x=>[x.model,x.naive].filter(Number.isFinite)),.01)*1.14;
 const x=i=>l+(rows[i].horizon-rows[0].horizon)/Math.max(1,rows.at(-1).horizon-rows[0].horizon)*(r-l),y=v=>bottom-v/max*(bottom-top);
 let out=[0,.5,1].map(f=>`<path class="chart-grid" d="M${l} ${y(max*f)}H${r}"/>${text(l-8,y(max*f)+4,number(max*f),'text-anchor="end"')}`).join('');
 for(const [key,name,cls] of [['naive','Naive','naive-line'],['model','Model','model-line']]){
  const valid=rows.map((v,i)=>({...v,i})).filter(v=>Number.isFinite(v[key]));out+=`<path class="${cls}" d="${valid.map((v,j)=>`${j?'L':'M'}${x(v.i)} ${y(v[key])}`).join(' ')}"/>`;
  out+=valid.map(v=>`<circle class="${cls} chart-dot" cx="${x(v.i)}" cy="${y(v[key])}" r="4"><title>${esc(name)}: ${number(v[key])}, ${v.horizon} ${esc(label)}</title></circle>`).join('');
  const end=valid.at(-1);if(end)out+=text(r+10,y(end[key])+(key==='model'?-8:16),name,`class="${cls}"`);
 }
 out+=rows.map((v,i)=>text(x(i),bottom+25,v.horizon,'text-anchor="middle"')).join('');out+=text((l+r)/2,h-5,label,'text-anchor="middle"');
 const active=rows.findIndex(v=>v.horizon===horizon);if(active>=0)out+=`<path class="chart-guide" d="M${x(active)} ${top}V${bottom}"/>`;
 return svg(w,h,'Average absolute miss by '+label,out);
}
export function subsetChart(rows){
 const w=width(),phone=w<500,left=phone?12:275,right=w-55,step=phone?64:42,top=30,h=top+rows.length*step+25,max=Math.max(...rows.flatMap(r=>[r.model,r.naive].filter(Number.isFinite)),.01)*1.05,x=v=>left+v/max*(right-left);
 let out=text(left,15,'Less miss','class="chart-muted"')+text(right,15,'More miss','text-anchor="end" class="chart-muted"');
 rows.forEach((r,i)=>{const y=top+i*step+(phone?28:10);out+=text(phone?12:0,phone?y-14:y+4,r.label.length>(phone?42:34)?r.label.slice(0,phone?39:31)+'…':r.label);out+=`<path class="chart-grid" d="M${left} ${y}H${right}"/>`;
  if(Number.isFinite(r.naive))out+=`<path class="chart-pair" d="M${x(r.model)} ${y}H${x(r.naive)}"/><circle class="naive-line chart-dot" cx="${x(r.naive)}" cy="${y}" r="5"/>`;
  out+=`<circle class="model-line chart-dot" cx="${x(r.model)}" cy="${y}" r="5"/>${text(right+8,y+4,number(r.model))}`;
 });return svg(w,h,'Subset average miss. Filled dots are the model; hollow dots the same naive comparison.',out);
}
export function forecastChart(rows,selected,revealed,time,bin){
 if(!rows.length)return '';
 const w=width(),h=270,l=38,r=w-18,top=32,bottom=220,max=Math.max(...rows.flatMap(x=>[x.forecast,x.baseline,x.hi,x.actual??0]),1)*1.1;
 const x=i=>l+(rows[i].bin_start-rows[0].bin_start)/Math.max(1,rows.at(-1).bin_start-rows[0].bin_start)*(r-l),y=v=>bottom-v/max*(bottom-top);
 let out=`<rect class="chart-heldout" x="${l}" y="${top}" width="${r-l}" height="${bottom-top}"/>${text(l,16,'Not seen in learning')}`;
 out+=[0,.5,1].map(f=>`<path class="chart-grid" d="M${l} ${y(max*f)}H${r}"/>${text(l-7,y(max*f)+4,number(max*f),'text-anchor="end"')}`).join('');
 out+=`<path class="chart-range" d="${rows.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v.hi)}`).join(' ')} ${rows.map((v,i)=>({v,i})).reverse().map(({v,i})=>`L${x(i)} ${y(v.lo)}`).join(' ')} Z"/>`;
 for(const [key,cls] of [['baseline','naive-line'],['forecast','model-line']])out+=`<path class="${cls}" d="${rows.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v[key])}`).join(' ')}"/>`;
 let connected=false,d='';rows.forEach((v,i)=>{const known=v.actual!==null&&(v.bin_start+bin<=time||(revealed&&i===selected));if(known){d+=`${connected?'L':'M'}${x(i)} ${y(v.actual)} `;connected=true;}else connected=false;});out+=`<path class="actual-line" d="${d}"/>`;
 rows.forEach((v,i)=>{const known=v.actual!==null&&(v.bin_start+bin<=time||(revealed&&i===selected));if(known)out+=`<circle class="actual-dot" cx="${x(i)}" cy="${y(v.actual)}" r="4"/>`;out+=`<g tabindex="0" role="button" aria-label="Reveal ${clock(v.bin_start)}" data-chart-bin="${i}"><circle class="chart-hit" cx="${x(i)}" cy="${y(v.forecast)}" r="22"/><circle class="model-line chart-dot" cx="${x(i)}" cy="${y(v.forecast)}" r="${i===selected?6:3}"/></g>`;});
 out+=[0,Math.floor((rows.length-1)/2),rows.length-1].map(i=>text(x(i),bottom+25,clock(rows[i].bin_start),'text-anchor="middle"')).join('');return svg(w,h,'Boardings forecast, supplied range, naive forecast and revealed actual counts through the day.',out);
}
export function gapChart(rows,routeName){
 const active=rows.filter(r=>r.over||r.spare),zero=rows.length-active.length,w=width(),phone=w<500,l=phone?10:160,r=w-16,centre=(l+r)/2,top=32,step=phone?60:38,h=top+active.length*step+32,max=Math.max(...active.flatMap(r=>[r.over,r.spare]),1),scale=(r-l)/2/max*.82;
 let out=text(l,15,'Above seats','class="over"')+text(r,15,'Spare seats','text-anchor="end" class="spare"');out+=`<path class="chart-guide" d="M${centre} ${top-10}V${h-24}"/>`;
 active.forEach((v,i)=>{const y=top+i*step+(phone?23:3);out+=text(phone?l:0,phone?y-9:y+12,`${routeName(v.route_id)} / ${v.direction}`);if(v.over)out+=`<rect class="over-fill" x="${centre-v.over*scale}" y="${y}" width="${v.over*scale}" height="15"/>${text(centre-v.over*scale-6,y+12,v.over,'text-anchor="end"')}`;if(v.spare)out+=`<rect class="spare-fill" x="${centre}" y="${y+3}" width="${v.spare*scale}" height="9"/>${text(centre+v.spare*scale+6,y+12,v.spare)}`;});
 return svg(w,h,'Route-hour passengers above seats on the left; spare seats on the right.',out)+(zero?`<p class="small">${zero} route-direction rows have neither an excess nor spare seats.</p>`:'');
}
