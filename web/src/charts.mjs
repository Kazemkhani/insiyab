// Accessible SVG charts of supplied values. Scales describe the data; no fitted
// trend, interval or transport quantity is invented by the renderer.
import {number,clock} from './model.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const width=()=>Math.min(1184,Math.max(300,document.documentElement.clientWidth-48));   // the page's own measure: a chart capped short of it leaves a dead strip beside every chart
const svg=(w,h,title,body)=>`<svg class="data-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const text=(x,y,label,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(label)}</text>`;
export function horizonChart(rows,horizon,label){
 const w=width(),h=270,l=42,r=w-80,top=20,bottom=215,max=Math.max(...rows.flatMap(x=>[x.model,x.naive].filter(Number.isFinite)),.01)*1.14;
 const x=i=>l+(rows[i].horizon-rows[0].horizon)/Math.max(1,rows.at(-1).horizon-rows[0].horizon)*(r-l),y=v=>bottom-v/max*(bottom-top);
 let out=[0,.5,1].map(f=>`<path class="chart-grid" d="M${l} ${y(max*f)}H${r}"/>${text(l-8,y(max*f)+4,number(max*f),'text-anchor="end"')}`).join('');
 for(const [key,name,cls] of [['naive','Naive','naive-line'],['model','Model','model-line']]){
  const valid=rows.map((v,i)=>({...v,i})).filter(v=>Number.isFinite(v[key]));out+=`<path class="${cls}" d="${valid.map((v,j)=>`${j?'L':'M'}${x(v.i)} ${y(v[key])}`).join(' ')}"/>`;
  out+=valid.map(v=>`<circle class="${cls} chart-dot" cx="${x(v.i)}" cy="${y(v[key])}" r="4"><title>${esc(name)}: ${number(v[key])}, ${v.horizon} ${esc(label)}</title></circle>`).join('');
  const end=valid.at(-1);if(end){const other=key==='model'?'naive':'model',otherEnd=rows.filter(v=>Number.isFinite(v[other])).at(-1),ownY=y(end[key]),otherY=otherEnd?y(otherEnd[other]):NaN,offset=Math.abs(ownY-otherY)<18?(ownY<otherY?-9:ownY>otherY?9:key==='model'?-9:9):0;out+=text(r+10,ownY+4+offset,name,`class="${cls}"`);}
 }
 out+=rows.map((v,i)=>text(x(i),bottom+25,v.horizon,'text-anchor="middle"')).join('');out+=text((l+r)/2,h-5,label,'text-anchor="middle"');
 const active=rows.findIndex(v=>v.horizon===horizon);if(active>=0)out+=`<path class="chart-guide" d="M${x(active)} ${top}V${bottom}"/>`;
 // the finding, said in the chart: from where the model misses by more than the naive forecast
 const worse=rows.findIndex((v,i)=>Number.isFinite(v.model)&&Number.isFinite(v.naive)&&v.model>v.naive&&rows.slice(i).every(u=>u.model>u.naive));
 if(worse>=0)out+=text(x(worse),y(rows[worse].model)-12,worse===0?'The model misses more throughout':'The model misses more from here','text-anchor="end" class="chart-note"');
 return svg(w,h,'Average absolute miss by '+label,out);
}
export function subsetChart(rows){
 const w=width(),phone=w<500,left=phone?12:400,right=w-55,step=phone?64:42,top=30,h=top+rows.length*step+25,max=Math.max(...rows.flatMap(r=>[r.model,r.naive].filter(Number.isFinite)),.01)*1.05,x=v=>left+v/max*(right-left);
 let out=text(left,15,'Less miss','class="chart-muted"')+text(right,15,'More miss','text-anchor="end" class="chart-muted"');
 rows.forEach((r,i)=>{const y=top+i*step+(phone?28:10);out+=text(phone?12:0,phone?y-14:y+4,r.label.length>(phone?46:58)?r.label.slice(0,phone?45:57)+'…':r.label);out+=`<path class="chart-grid" d="M${left} ${y}H${right}"/>`;
  if(Number.isFinite(r.naive))out+=`<path class="chart-pair" d="M${x(r.model)} ${y}H${x(r.naive)}"/><circle class="naive-line chart-dot" cx="${x(r.naive)}" cy="${y}" r="5"/>`;
  out+=`<circle class="model-line chart-dot" cx="${x(r.model)}" cy="${y}" r="5"/>${text(right+8,y+4,number(r.model))}`;
 });return svg(w,h,'Subset average miss. Filled dots are the model; hollow dots the same naive comparison.',out);
}
export function forecastChart(rows,selected,revealed,time,bin){
 // One stop through the hours the model had not seen. Every row here is such an hour, so nothing is shaded: shading all of a plot says nothing.
 if(!rows.length)return '';
 const known=(v,i)=>v.actual!==null&&(i===selected?revealed:v.bin_start+bin<=time);
 const w=width(),phone=w<500,h=320,l=38,r=w-(phone?52:70),top=64,bottom=264,max=Math.max(...rows.flatMap((v,i)=>[v.forecast,v.baseline,v.hi,known(v,i)?v.actual:0]),1)*1.1;
 const x=i=>l+(rows[i].bin_start-rows[0].bin_start)/Math.max(1,rows.at(-1).bin_start-rows[0].bin_start)*(r-l),y=v=>bottom-v/max*(bottom-top);
 let out=text(0,14,'Passengers boarding in 15 minutes','class="chart-axis-title"');
 out+=[0,.5,1].map(f=>`<path class="chart-grid" d="M${l} ${y(max*f)}H${r}"/>${text(l-7,y(max*f)+4,number(max*f),'text-anchor="end"')}`).join('');
 out+=`<path class="chart-range" d="${rows.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v.hi)}`).join(' ')} ${rows.map((v,i)=>({v,i})).reverse().map(({v,i})=>`L${x(i)} ${y(v.lo)}`).join(' ')} Z"/>`;
 for(const [key,cls] of [['baseline','naive-line'],['forecast','model-line']])out+=`<path class="${cls}" d="${rows.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v[key])}`).join(' ')}"/>`;
 // the lines are named where they end, as on the look-ahead chart; the two names are kept apart when the lines end close together
 const end=rows.at(-1),yn=y(end.baseline),ym=y(end.forecast),apart=Math.abs(yn-ym)<14?(ym<=yn?[-9,9]:[9,-9]):[0,0];
 out+=text(r+8,ym+4+apart[0],'Model','class="model-line"')+text(r+8,yn+4+apart[1],'Naive','class="naive-line"');
 let connected=false,d='';rows.forEach((v,i)=>{if(known(v,i)){d+=`${connected?'L':'M'}${x(i)} ${y(v.actual)} `;connected=true;}else connected=false;});out+=`<path class="actual-line" d="${d}"/>`;
 rows.forEach((v,i)=>{if(known(v,i))out+=`<circle class="actual-dot" data-actual-bin="${i}" cx="${x(i)}" cy="${y(v.actual)}" r="4"/>`;out+=`<g tabindex="0" role="button" aria-label="Reveal ${clock(v.bin_start)}" data-chart-bin="${i}"><circle class="chart-hit" cx="${x(i)}" cy="${y(v.forecast)}" r="22"/><circle class="model-line chart-dot" cx="${x(i)}" cy="${y(v.forecast)}" r="3"/></g>`;});
 // the quarter of an hour the visitor chose: a ring, with its time above it
 if(rows[selected]){const sx=x(selected),sy=y(rows[selected].forecast),anchor=sx<l+60?'start':sx>r-60?'end':'middle';out+=`<circle class="chart-chosen" cx="${sx}" cy="${sy}" r="10"/><path class="chart-guide" d="M${sx} ${top}V${bottom}"/>${text(sx,top-14,`You chose ${clock(rows[selected].bin_start)} to ${clock(rows[selected].bin_start+bin)}`,`text-anchor="${anchor}" class="chart-chosen-label"`)}`;}
 out+=[0,Math.floor((rows.length-1)/2),rows.length-1].map(i=>text(x(i),bottom+25,clock(rows[i].bin_start),'text-anchor="middle"')).join('');return svg(w,h,'Boardings at this stop through the hours the model had not seen: the forecast with its range, the naive forecast, and what happened where it has been revealed.',out);
}
export function gapChart(rows,routeName){
 // Only the route-directions with passengers above the seats are drawn, fullest first. The rest are one line: sixteen bars for one finding hide the finding.
 const short=rows.filter(r=>r.over>0).sort((a,b)=>b.over-a.over||a.route_id.localeCompare(b.route_id)),rest=rows.filter(r=>!(r.over>0)),spare=rest.map(r=>r.spare).filter(v=>v>0).sort((a,b)=>a-b);
 const fold=rest.length?`<p class="gap-fold">${rest.length} other route-direction${rest.length===1?'':'s'}: nobody above the seats${spare.length?`, ${spare[0]===spare.at(-1)?spare[0]:`${spare[0]} to ${spare.at(-1)}`} seats spare`:''}.</p>`:'';
 if(!short.length)return `<p class="gap-none"><strong>Nobody above the seats in this hour.</strong></p>${fold}`;
 const w=width(),phone=w<500,l=phone?10:170,r=w-16,top=12,step=phone?66:44,h=top+short.length*step+8,max=Math.max(...short.flatMap(v=>[v.over,v.spare]),1),scale=(r-l-(phone?150:230))/max;   // room is kept at the right for the words beside each bar
 let out='';
 short.forEach((v,i)=>{const y=top+i*step+(phone?24:4),name=`Route ${routeName(v.route_id)}, direction ${v.direction}`;out+=text(phone?l:0,phone?y-8:y+13,name,'class="gap-name"');
  const wo=Math.max(4,v.over*scale);out+=`<rect class="over-fill" x="${l}" y="${y}" width="${wo}" height="14"/>${text(l+wo+8,y+12,`${v.over} above the seats`,'class="over"')}`;
  if(v.spare)out+=`<rect class="spare-fill" x="${l}" y="${y+19}" width="${Math.max(4,v.spare*scale)}" height="6"/>${text(l+Math.max(4,v.spare*scale)+8,y+27,`${v.spare} seats spare, other trips`,'class="spare"')}`;});
 return svg(w,h,'Route-directions with passengers above the seats in this hour, fullest first, each with the seats spare on its other trips.',out)+fold;
}
export function gainChart(row){
 const w=width(),l=35,r=w-35,min=Math.min(0,row.skill_lo)*1.15,max=Math.max(0,row.skill_hi)*1.15,span=max-min||1,x=v=>l+(v-min)/span*(r-l);
 const body=`<path class="chart-guide" d="M${x(0)} 15V85"/><path class="model-line" d="M${x(row.skill_lo)} 48H${x(row.skill_hi)}"/><path class="model-line" d="M${x(row.skill_lo)} 40V56M${x(row.skill_hi)} 40V56"/><circle class="model-line chart-dot" cx="${x(row.skill)}" cy="48" r="6"/>${text(x(row.skill_lo),106,number(row.skill_lo*100)+'%','text-anchor="middle"')}${text(x(row.skill_hi),106,number(row.skill_hi*100)+'%','text-anchor="middle"')}${text(x(0),14,'Zero','text-anchor="middle"')}${text(l,135,'More error')}${text(r,135,'Less error','text-anchor="end"')}`;
 return svg(w,150,'Gain over the named naive forecast, all horizons together. The vertical reference is zero gain.',body);
}
