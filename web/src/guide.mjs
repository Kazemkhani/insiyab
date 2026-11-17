import {showTwin} from './twin-scene.mjs';
import {number,clock} from './model.mjs';

export function createGuide(bundle,model,explore){
  const host=document.getElementById('guide'),copy=document.getElementById('guide-copy'),scene=document.getElementById('guide-scene');
  const decision=bundle['decisions.json'].decisions.find(d=>d.lever==='right_bus'),pair=decision?.swaps?.[0];
  const people=bundle['personas.json'].personas,worker=people.find(p=>p.id==='site_worker'),planner=people.find(p=>p.id==='planner'),office=people.find(p=>p.id==='office_worker');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const target=bundle['metrics.json'].targets.find(t=>t.target==='boardings'&&t.level==='route');
  const score=target?.pooled?.find(r=>r.model===target.chosen),naive=target?.pooled?.find(r=>r.model===(score?.skill_vs??target.best_naive));
  let step=0,swapped=false;
  const titles=['The passenger','The opportunity','Try a change','Check the evidence','The passenger’s choice'];
  const stat=(value,label,colour='ink')=>`<div><strong style="color:var(--${colour})">${number(value)}</strong><span>${label}</span></div>`;
  function render(focus=false){
    host.dataset.step=step;host.dataset.swapped=String(swapped);
    document.getElementById('guide-progress').textContent=`${step+1} of ${titles.length} · ${titles[step]}`;
    document.getElementById('guide-back').hidden=step===0;
    document.getElementById('guide-steps').innerHTML=titles.map((title,i)=>`<li ${i===step?'aria-current="step"':''}><span>${i+1}</span>${escape(title)}</li>`).join('');
    if(!pair||!worker||!office||!planner){copy.innerHTML='<h1 id="guide-title" tabindex="-1">Understand the day. Inspect a decision.</h1><p class="guide-lead">Explore the supplied routes, test a forecast and inspect the planner’s proposals.</p>';scene.hidden=true;return;}
    const busy=pair.from,spare=pair.to,above=Math.max(0,busy.largest_load-busy.seats);
    const before={...worker.steps[0],before:{load:busy.largest_load,seats:busy.seats}};
    let title,lead,stats='',note='',action,person=worker,story=before;
    if(step===0){
      title='The bus arrives. Not enough seats.';
      lead='Insiyab forecasts how many people will board and how late buses will be. Start with one fictional journey to work.';
      stats=stat(busy.largest_load,'passengers')+stat(busy.seats,'seats')+stat(above,'without a seat','over');
      note=`Route ${busy.route_id} · highest load on this trip. ${model.stops.get(worker.anchor.stop_id)?.name??''}.`;
      action='Find a bus with room';
    }else if(step===1){
      title='Room on another trip.';
      lead='The planner has a choice: could these two trips exchange vehicles?';
      stats=stat(spare.largest_load,'peak passengers')+stat(spare.seats,'seats')+stat(Math.max(0,spare.seats-spare.largest_load),'seats free','flow');
      note=`Route ${spare.route_id} · trip starts ${clock(spare.start)}. These are separate trip peaks, not simultaneous loads.`;
      person={...worker,id:'passenger',title:'The trip with room',anchor:{route_id:spare.route_id}};
      story={kind:'measured',scene:'stop',before:{load:spare.largest_load,seats:spare.seats}};
      action='Try the vehicle swap';
    }else if(step===2){
      title=swapped?'Same people. More seats.':'Try a bigger bus.';
      lead=swapped?'The vehicles exchange trips. Nobody has to travel at a different time. This is a simulated proposal.':'Try it. Keep the passenger demand the same, and exchange the two vehicles.';
      const seats=swapped?spare.seats:busy.seats,excess=Math.max(0,busy.largest_load-seats);
      stats=stat(busy.largest_load,'passengers')+stat(seats,'seats',swapped?'simulated':'ink')+stat(excess?excess:seats-busy.largest_load,excess?'without a seat':'seats free',excess?'over':'flow');
      note=`${swapped?'Simulated. ':''}${number(pair.empty_km)} km of empty running estimated for this pair. Vehicle access and driver duties still need checking.`;
      story=swapped?{...worker.steps[1],kind:'simulated',motion:'capacity-change',previousSeats:busy.seats,after:{load:busy.largest_load,seats:spare.seats}}:before;
      action=swapped?'How do we test the forecast?':'Swap the buses';
    }else if(step===3){
      title='Test the forecast. Then decide.';
      lead='How many people will board? We test the model against the day’s records and a simple forecast. A smaller miss is better.';
      stats=score&&naive?stat(score.mae,'model: average miss')+stat(naive.mae,'simple forecast: average miss'):'';
      note=`${target?.unit??'Supplied route forecast errors'}. ${target?.tested_on??'Tested on one service day only.'} ${score?.skill_lo<=0&&score?.skill_hi>=0?'The gain range includes zero. An improvement is not established.':''}`;
      person=planner;story=planner.steps[0];action='What can the passenger choose?';
    }else{
      title='An offer, not an obligation.';
      lead='A passenger can choose another departure with room and earn points. Extra walking is optional. The planner still has to protect the original service.';
      note='Khutwa is the passenger side of the prototype. Offers are simulated; a seat is not reserved. No timetable or RTA system is changed.';
      person=office;story=office.steps[1];action='Explore the planner’s view';
    }
    copy.innerHTML=`<p class="guide-kicker">${step===2&&swapped?'Proposed change · simulated':step>=3?'From the prototype':bundle['meta.json'].fixture?'An invented service example':'From the supplied service day'}</p><h1 id="guide-title" tabindex="-1">${escape(title)}</h1><p class="guide-lead">${escape(lead)}</p>${stats?`<div class="guide-stats" aria-label="The numbers in this example">${stats}</div>`:''}<p id="guide-note">${escape(note)}</p><div class="guide-actions"><button id="guide-next" class="primary">${escape(action)}</button>${step===2&&swapped?'<button id="guide-undo">Undo the swap</button>':''}${step===3?'<button id="guide-test">Test a forecast yourself</button>':''}${step===4?'<a class="button-link" href="khutwa/">Try the passenger offer</a>':''}</div>`;
    document.getElementById('guide-next').onclick=()=>{if(step===2&&!swapped){swapped=true;render(true);}else if(step<4){step++;render(true);}else explore('replay');};
    document.getElementById('guide-undo')?.addEventListener('click',()=>{swapped=false;render(true);});
    document.getElementById('guide-test')?.addEventListener('click',()=>explore('forecast'));
    document.getElementById('guide-scene-note').textContent=`${step===2&&swapped?'Simulated change. ':''}Fictional people. Illustrative seat layout and movement. ${step===3?'metrics.json + personas.json':step<=2?'decisions.json':'personas.json'} · ${model.meta.service_date}. Standing capacity is unverified.`;
    showTwin(scene,person,story,model,decision);
    if(focus){document.getElementById('guide-title').focus({preventScroll:true});host.scrollIntoView({block:'start',behavior:'auto'});}
  }
  document.getElementById('guide-back').onclick=()=>{if(step>0){step--;render(true);}};
  document.getElementById('guide-explore').onclick=()=>explore('replay');
  window.insiyabGuide={get step(){return step;},get swapped(){return swapped;},get pair(){return pair;}};
  return {show:()=>render(true),restart:()=>{step=0;swapped=false;render();}};
}
