import {element} from './alerts.mjs';
import {createLifecycle, ackSeconds, ROLES} from './lifecycle.mjs';
export function mountControl(alert, replay) {
  const calls=document.querySelector('#calls'), escalation=document.querySelector('#escalation');
  calls.replaceChildren(element('h2','CALLS'));
  const status=element('p',undefined,'lifecycle-status');status.id='lifecycle-status';status.setAttribute('aria-live','polite');calls.append(status);
  const rows=new Map();
  for (const role of ROLES) {
    const row=element('div',undefined,'role-row'), label=element('span',role[0].toUpperCase()+role.slice(1));
    const icon=element('img');icon.src=`icons/${role}.svg`;icon.alt='';icon.width=24;icon.height=24;
    const value=element('span','Waiting');value.dataset.role=role;
    row.append(icon,label,value);calls.append(row);rows.set(role,value);
  }
  const ring=new Audio('sounds/ring.mp3');ring.preload='auto';
  const audioNote=element('p','Demo audio is ready after pressing Demo mode.','source-note');audioNote.hidden=true;calls.append(audioNote);
  let lastPhase, previousRun;
  const stamp=(at,state)=>state.mode==='demo'?new Date((67980+(at-state.started_at)/1000)*1000).toISOString().slice(11,19):new Date(at).toLocaleTimeString('en-GB',{timeZone:'Asia/Dubai'});
  const names={predicted:'Forecast alert raised',suggested:'Options ready for the controller',unacknowledged:'Awaiting the controller',calling_duty:'Calling the duty controller',calling_supervisor:'Calling the shift supervisor',decided:"Controller's decision",relaying:'Relaying the decision',sent:'Decision sent; awaiting acknowledgements',received:'All four roles received the decision'};
  const controller=createLifecycle({alert,ack:ackSeconds(location.search),changed(state){
    document.documentElement.dataset.mode=state.mode;
    calls.dataset.phase=state.phase;calls.dataset.run=state.run_id;
    const demo=state.mode==='demo';
    document.querySelector('.mode-label').replaceChildren(element('div',demo?'Demo mode':'Live event input'),element('span',demo?'Simulated calls. Nobody is connected.':'No transport connected in this build.'));
    status.textContent=(demo?'Simulated · ':'')+names[state.phase]+(state.complete?' · Demo complete':state.unanswered?' · No answer. Controller action required.':'');
    const band=state.phase==='unacknowledged'||state.unanswered;
    escalation.hidden=!band;
    escalation.textContent=state.unanswered?'Not acknowledged. Neither decision-maker answered. No decision was made.':`Not acknowledged. Insiyab will phone the duty controller in ${state.remaining} s${demo?' (simulated).':'.'}`;
    for (const [role,value] of rows) {
      const record=state.roles[role];
      value.textContent=(record.status==='waiting'?'Waiting':record.status[0].toUpperCase()+record.status.slice(1))+(record.at===null?'':` · ${stamp(record.at,state)}`);
      value.className=record.status==='received'?'received':'';
      value.dataset.status=record.status;
    }
    document.querySelectorAll('[data-option]').forEach(button=>{
      button.setAttribute('aria-pressed',String(state.selected===button.dataset.option));
      button.disabled=!['suggested','unacknowledged','calling_duty','calling_supervisor'].includes(state.phase);
    });
    const confirmation=document.querySelector('#confirmation');
    // Do not replace a focused confirmation on countdown ticks.
    if (state.decision) {
      confirmation.replaceChildren(element('p',`Controller's decision, ${stamp(state.decision_at,state)}`, 'decision-stamp'));
    } else if (state.selected && confirmation.dataset.selection!==state.selected) {
      const chosen=alert.suggestion.options.find(o=>o.id===state.selected);
      const button=element('button',`Confirm decision: ${chosen.label}`);button.id='confirm';button.type='button';
      button.addEventListener('click',e=>{
        if(e.isTrusted && controller.confirm()) {
          const decision=controller.snapshot();
          window.dispatchEvent(new CustomEvent('insiyab:decision',{detail:{...controller.context(),option:decision.decision,at:decision.decision_at}}));
        }
      });
      confirmation.replaceChildren(button,element('p','Nothing is relayed until you confirm.','source-note'));
    } else if (!state.selected) confirmation.replaceChildren(element('p','Choose an option, then confirm the decision.','source-note'));
    confirmation.dataset.selection=state.selected||'';
    if (previousRun!==state.run_id) {ring.pause();ring.currentTime=0;lastPhase=null;previousRun=state.run_id;}
    if (demo && state.phase!==lastPhase && ['calling_duty','calling_supervisor'].includes(state.phase)) {
      ring.currentTime=0;ring.play().then(()=>{audioNote.textContent='Neutral ring played locally. No phone call.';}).catch(()=>{audioNote.hidden=false;audioNote.textContent='Audio unavailable. Simulated calling state remains visible.';});
    }
    if (!demo || state.decision) {ring.pause();ring.currentTime=0;}
    lastPhase=state.phase;
  }});
  document.querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',e=>{if(e.isTrusted)controller.select(button.dataset.option);}));
  const demo=document.querySelector('#demo');demo.disabled=false;
  demo.addEventListener('click',()=>{
    // Unlock audio inside a human gesture; the later ring is timer-driven.
    ring.muted=true;ring.play().then(()=>{ring.pause();ring.currentTime=0;ring.muted=false;}).catch(()=>{ring.muted=false;});
    replay.stop();replay.setTime(67980);controller.startDemo();
  });
  setInterval(()=>controller.tick(),100);
  window.insiyabOps=Object.freeze({
    setMode(mode){replay.stop();return controller.setMode(mode);},
    onEvent(event){return controller.onEvent(event);},
  });
}
