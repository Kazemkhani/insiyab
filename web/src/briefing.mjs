import {number as quantity} from './model.mjs';
// The first thing a visitor reads: the day in plain words, for someone who has never seen a forecast table.
// Every number is read from the bundle (summary.json, decisions.json, metrics.json). Nothing is typed here, and each number
// says whether it was counted from the day's records (measured) or is what we expect if a change were made (simulated).
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const whole=n=>Number(n).toLocaleString('en-GB',{maximumFractionDigits:0});
const day=iso=>new Date(iso+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});

// What each lever means to a passenger or a planner, in one line, and the unit its effect is counted in.
const LEVERS={
  right_bus:{verb:'Put the bigger bus where the passengers are',unit:'minutes passengers spent without a seat'},
  right_stop:{verb:'Consider request stops, with a way to ask for a stop',unit:'calls assumed unnecessary'},
  rewarded_choice:{verb:'Reward the passenger who takes the emptier bus',unit:'passengers move to a bus with room'},
  right_time:{verb:'Set the timetable to the time buses really take',unit:''},on_demand:{verb:'Send a bus only when it is asked for',unit:''},
};

export function briefingHTML(bundle){
  const head=new Map((bundle['summary.json']?.headline??[]).map(h=>[h.key,h])),meta=bundle['meta.json'],decisions=bundle['decisions.json']?.decisions??[];
  const v=k=>head.get(k)?.value,has=k=>Number.isFinite(v(k));
  const facts=[
    has('trips_over_seats')&&{n:v('trips_over_seats'),say:`bus ${v('trips_over_seats')===1?'trip':'trips'} ran with more passengers than seats`,tone:'over'},
    has('trips_under_a_third_full')&&{n:v('trips_under_a_third_full'),say:`bus ${v('trips_under_a_third_full')===1?'trip':'trips'} never filled a third of the seats`,tone:'spare'},
    has('visits_with_nobody')&&{n:v('visits_with_nobody'),say:'stop visits with no recorded boarding or alighting',tone:'ink'},
  ].filter(Boolean);
  const scale=[has('routes')&&`${whole(v('routes'))} routes`,has('stops')&&`${whole(v('stops'))} stops`,has('trips')&&`${whole(v('trips'))} bus trips`,has('boardings')&&`${whole(v('boardings'))} passengers boarding`].filter(Boolean).join(', ');
  const late=(bundle['metrics.json']?.targets??[]).find(t=>t.target==='arrival_delay_seconds'),latePool=late?.pooled?.find(r=>r.model===late.chosen);
  const board=(bundle['metrics.json']?.targets??[]).find(t=>t.target==='boardings'&&t.level==='route'),boardPool=board?.pooled?.find(r=>r.model===board.chosen);
  const sure=p=>p&&Number.isFinite(p.skill_lo)&&p.skill_lo>0;
  const foresight=[
    latePool&&Number.isFinite(latePool.skill)&&{title:'How late will the bus be?',say:sure(latePool)?`Our forecast is ${Math.round(latePool.skill*100)} in 100 closer than assuming a late bus stays as late as it is.`:`Our forecast is not yet shown to beat assuming a late bus stays as late as it is.`,ok:sure(latePool)},
    boardPool&&Number.isFinite(boardPool.skill)&&{title:'How many passengers will board?',say:sure(boardPool)?`Our forecast is ${Math.round(boardPool.skill*100)} in 100 closer than the best simple guess.`:`On one day this forecast is not yet shown to beat a simple guess, and we say so.`,ok:sure(boardPool)},
  ].filter(Boolean);
  return `<section class="briefing" aria-label="The day in brief">
<p class="eyebrow">${esc(day(meta.service_date))}${scale?` · ${esc(scale)}`:''}</p>
<h2 class="briefing-title">The service day, in numbers.</h2>
<ol class="briefing-facts">${facts.map(f=>`<li class="tone-${f.tone}"><strong>${whole(f.n)}</strong><span>${esc(f.say)}</span></li>`).join('')}</ol>
<p class="briefing-kind">${meta.fixture?'Counted from invented service records.':'Counted from the supplied service records.'} Seats are counted, not standing room. No boarding or alighting does not prove that nobody waited.</p>
${decisions.length?`<h2>Proposals a planner could review</h2>
<ol class="briefing-moves">${decisions.slice(0,3).map(d=>{const e=d.effect?.[0],l=LEVERS[d.lever]??{verb:d.title,unit:''};const moved=e&&Number.isFinite(e.before)&&Number.isFinite(e.after);
  return `<li><a href="#decision-${esc(d.id)}"><span class="move-verb">${esc(l.verb)}</span>${moved?(e.before===0?`<span class="move-effect"><b>${quantity(e.after)}</b><em>${esc(l.unit)}, at one stop in one hour · ${esc(e.kind)}</em></span>`:`<span class="move-effect"><b>${whole(e.before)}</b><i aria-hidden="true">to</i><b>${quantity(e.after)}</b><em>${esc(l.unit)} · ${esc(e.kind)}</em></span>`):''}</a></li>`;}).join('')}</ol>`:''}
${foresight.length?`<h2>Can it be seen coming?</h2><ul class="briefing-foresight">${foresight.map(f=>`<li class="${f.ok?'holds':'open'}"><b>${esc(f.title)}</b> ${esc(f.say)}</li>`).join('')}</ul><p class="briefing-kind">${esc(late?.tested_on??board?.tested_on??'')}</p>`:''}
<div class="briefing-go"><button class="primary" data-go="replay">Watch the day on the map</button><button data-go="stories">Meet four people</button><button data-go="model">See the proof</button></div>
</section>`;
}
