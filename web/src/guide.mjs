import {showTwin,clearTwin} from './twin-scene.mjs';
import {number,clock} from './model.mjs';

export function createGuide(bundle,model,explore){
  const host=document.getElementById('guide'),copy=document.getElementById('guide-copy'),scene=document.getElementById('guide-scene');
  const decision=bundle['decisions.json'].decisions.find(d=>d.lever==='right_bus'),pair=decision?.swaps?.[0];
  const people=bundle['personas.json'].personas,worker=people.find(p=>p.id==='site_worker'),planner=people.find(p=>p.id==='planner'),office=people.find(p=>p.id==='office_worker');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const target=bundle['metrics.json'].targets.find(t=>t.target==='boardings'&&t.level==='route');
  const score=target?.pooled?.find(r=>r.model===target.chosen),naive=target?.pooled?.find(r=>r.model===(score?.skill_vs??target.best_naive));
  let step=0,swapped=false;
  const titles=['The day’s records','The timetable','One idea','Check the forecast','How it is built','The passenger’s choice'];
  const pipeline=[["RTA’s tables",'Start with the supplied timetable, bus, stop and boarding records.'],['Prepare','Check the records and join each boarding to a bus trip and stop.'],['Insights','Compare the service that ran with the timetable to find where the day changes.'],['Forecast','Estimate boardings and bus lateness ahead of time, then check the misses.'],['Decisions','Compare vehicle exchanges against passenger demand, seats and empty running.'],['Published','Publish the approved totals and proposals for a planner to inspect.']];
  const stat=(value,label,colour='ink')=>`<div><strong style="color:var(--${colour})">${number(value)}</strong><span>${label}</span></div>`;
  function render(focus=false){
    host.dataset.step=step;host.dataset.swapped=String(swapped);
    document.getElementById('guide-progress').textContent=`${step+1} of ${titles.length} · ${titles[step]}`;
    document.getElementById('guide-back').hidden=step===0;
    document.getElementById('guide-steps').innerHTML=titles.map((title,i)=>`<li ${i===step?'aria-current="step"':''}><span>${i+1}</span>${escape(title)}</li>`).join('');
    if(!pair||!worker||!office||!planner){copy.innerHTML='<h1 id="guide-title" tabindex="-1">Understand the day. Inspect a decision.</h1><p class="guide-lead">Explore the supplied routes, test a forecast and inspect the planner’s proposals.</p>';scene.hidden=true;return;}
    const busy=pair.from,spare=pair.to;
    const trip=model.trips.find(t=>t.trip_id===busy.trip_id&&t.route_id===busy.route_id),visits=trip?.visits??[],first=visits[0],last=visits.at(-1);
    const before={...worker.steps[0],before:{load:busy.largest_load,seats:busy.seats}};
    let title,lead,stats='',note='',action,person=worker,story=before;
    if(step===0){
      title='First, read the day.';
      lead='A boarding is a passenger getting on a bus. Insiyab forecasts boardings and lateness from the service day.';
      stats=stat(model.meta.counts.boardings,'boardings over the service day');
      note=`Measured from ${model.meta.fixture?'invented':'supplied'} records. meta.json · ${model.meta.service_date}.`;
      person=planner;story=planner.steps[0];action='Compare the day with the plan';
    }else if(step===1){
      title='The timetable sets the plan.';
      lead='The timetable is fixed. Compare it with the recorded departures at the first and last stops of this trip.';
      if(last){const minutes=(last.act_dep-last.sched_dep)/60;stats=stat(Math.abs(minutes),minutes<0?'minutes early at the last stop':minutes>0?'minutes late at the last stop':'minutes from the plan at the last stop',minutes>0?'over':'ink');}
      note=last?`Route ${busy.route_id} · trip ${busy.trip_id} · measured · replay/route-${busy.route_id}.json · ${model.meta.service_date}. One trip does not establish the morning/evening pattern.`:'No replay was supplied for this trip; no timetable comparison is shown.';
      action='Try the vehicle swap';
    }else if(step===2){
      title=swapped?'Same people. More seats.':'Try a bigger bus.';
      lead=swapped?'The vehicles exchange trips. Nobody has to travel at a different time. This is a simulated proposal.':'Try it. Keep the passenger demand the same, and exchange the two vehicles.';
      const seats=swapped?spare.seats:busy.seats,excess=Math.max(0,busy.largest_load-seats);
      stats=stat(busy.largest_load,'passengers')+stat(seats,'seats',swapped?'simulated':'ink')+stat(excess?excess:seats-busy.largest_load,excess?'without a seat':'seats free',excess?'over':'flow');
      note=`Simulated proposal. ${number(pair.empty_km)} km of empty running estimated for this pair. Vehicle access and driver duties still need checking.`;
      story=swapped?{...worker.steps[1],kind:'simulated',motion:'capacity-change',previousSeats:busy.seats,after:{load:busy.largest_load,seats:spare.seats}}:before;
      action=swapped?'How do we test the forecast?':'Swap the buses';
    }else if(step===3){
      title='Test the forecast. Then decide.';
      lead='How many people will board? We test the model against the day’s records and a simple forecast. A smaller miss is better.';
      stats=score&&naive?stat(score.mae,'model: average miss')+stat(naive.mae,'simple forecast: average miss'):'';
      note=`${target?.unit??'Supplied route forecast errors'}. ${target?.tested_on??'Tested on one service day only.'} ${score?.skill_lo<=0&&score?.skill_hi>=0?'The gain range includes zero. An improvement is not established.':''}`;
      person=planner;story=planner.steps[0];action='How is it built?';
    }else if(step===4){
      title='How it is built.';
      lead='From the supplied tables to a decision a planner can inspect.';
      // notes is already contracted. Quote it verbatim, rather than inventing a
      // producer flag or treating a mention of Dataiku as proof of execution.
      const sourceNote=bundle['meta.json'].notes;
      note=/dataiku/i.test(sourceNote??'')?`Bundle source note: ${sourceNote}`:'These are the processing steps. This bundle does not identify a Dataiku flow as its source.';
      action='Last: the passenger’s choice';
    }else{
      title='The cherry on the cake.';
      lead='After the forecast and the vehicle exchange, an optional passenger reward: Khutwa points and short partner surveys. Participation is a choice.';
      note='Proposed reward concept. Partner surveys are not connected. Offers are simulated; a seat is not reserved. Extra walking is optional. Keeping the usual bus remains a choice.';
      person=office;story=office.steps[1];action='Explore the planner’s view';
    }
    copy.innerHTML=`<p class="guide-kicker">${step===2&&swapped?'Proposed change · simulated':step>=3?'From the prototype':bundle['meta.json'].fixture?'An invented service example':'From the supplied service day'}</p><h1 id="guide-title" tabindex="-1">${escape(title)}</h1><p class="guide-lead">${escape(lead)}</p>${stats?`<div class="guide-stats" aria-label="The numbers in this example">${stats}</div>`:''}<p id="guide-note">${escape(note)}</p><div class="guide-actions"><button id="guide-next" class="primary">${escape(action)}</button>${step===2&&swapped?'<button id="guide-undo">Undo the swap</button>':''}${step===3?'<button id="guide-test">Test a forecast yourself</button>':''}${step===5?'<a class="button-link" href="khutwa/">Try the passenger offer</a>':''}</div>`;
    document.getElementById('guide-next').onclick=()=>{if(step===2&&!swapped){swapped=true;render(true);}else if(step<titles.length-1){step++;render(true);}else explore('replay');};
    document.getElementById('guide-undo')?.addEventListener('click',()=>{swapped=false;render(true);});
    document.getElementById('guide-test')?.addEventListener('click',()=>explore('forecast'));
    scene.hidden=step===1||step===4;
    const timetable=document.getElementById('guide-timetable');timetable.hidden=step!==1;
    timetable.innerHTML=step===1&&first&&last?`<table><caption>Departures on the selected trip</caption><thead><tr><th scope="col">Stop</th><th scope="col">Timetable</th><th scope="col">Recorded</th></tr></thead><tbody>${[['First',first],['Last',last]].map(([name,v])=>`<tr><th scope="row">${name}<span>${escape(model.stops.get(v.stop_id)?.name??v.stop_id)}</span></th><td>${clock(v.sched_dep)}</td><td>${clock(v.act_dep)}</td></tr>`).join('')}</tbody></table>`:'';
    const build=document.getElementById('guide-build');build.hidden=step!==4;
    build.innerHTML=step===4?`<ol aria-label="From tables to published results">${pipeline.map(([name,say])=>`<li><h2>${escape(name)}</h2><p>${escape(say)}</p></li>`).join('')}</ol>`:'';
    document.getElementById('guide-scene-note').textContent=step===1?'Times are from the selected trip’s replay records. This comparison does not establish why a delay happened.':step===4?'Process overview. Execution provenance is stated only from the bundle’s source note.':`${step===2&&swapped?'Simulated change. ':''}Fictional people. Illustrative seat layout and movement. ${step===3?'metrics.json + personas.json':step===0?'meta.json + personas.json':step<=2?'decisions.json':'personas.json'} · ${model.meta.service_date}. Standing capacity is unverified.`;
    if(step===1||step===4)clearTwin();else showTwin(scene,person,story,model,decision);
    if(focus){document.getElementById('guide-title').focus({preventScroll:true});host.scrollIntoView({block:'start',behavior:'auto'});}
  }
  document.getElementById('guide-back').onclick=()=>{if(step>0){step--;render(true);}};
  document.getElementById('guide-explore').onclick=()=>explore('replay');
  window.insiyabGuide={get step(){return step;},get swapped(){return swapped;},get pair(){return pair;}};
  return {show:()=>render(true),restart:()=>{step=0;swapped=false;render();}};
}
