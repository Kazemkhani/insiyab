import {element} from './alerts.mjs';
import {createLifecycle, ackSeconds, ROLES} from './lifecycle.mjs';

const KEY_STORE = 'insiyab.ops.presenter.key.v1'; // gitleaks:allow
function getPresenterKey() { try { return sessionStorage.getItem(KEY_STORE) || ''; } catch { return ''; } }
function setPresenterKey(k) { try { if (k) sessionStorage.setItem(KEY_STORE, k); else sessionStorage.removeItem(KEY_STORE); } catch {} }

export function mountControl(alert, replay, theatre, briefing) {
  const _theatre = theatre || {onState(){}, reset(){}, showCallingAll(){}, showReported(){}};
  const _briefing = briefing || {onState(){}, reset(){}, addRoleReport(){}};

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

  // Source label: shown during live drills.
  const sourceNote=element('p','Calls: real. Incident: simulated.','source-note drill-source-note');sourceNote.hidden=true;calls.append(sourceNote);

  let lastPhase, previousRun;
  const stamp=(at,state)=>state.mode==='demo'?new Date((67980+(at-state.started_at)/1000)*1000).toISOString().slice(11,19):new Date(at).toLocaleTimeString('en-GB',{timeZone:'Asia/Dubai'});
  const names={predicted:'Forecast alert raised',suggested:'Options ready for the controller',unacknowledged:'Awaiting the controller',calling_duty:'Calling the duty controller',calling_supervisor:'Calling the shift supervisor',decided:"Controller's decision",relaying:'Relaying the decision',sent:'Decision sent; awaiting acknowledgements',received:'All four roles received the decision'};
  const roleNames={driver:'Driver',depot:'Depot controller',station:'Station supervisor',planning:'Planning analyst'};

  // Live drill state accumulated from the NDJSON stream.
  let liveReports = {}, liveDecision = null, liveIncidentAt = null;

  const controller=createLifecycle({alert,ack:ackSeconds(location.search),changed(state){
    document.documentElement.dataset.mode=state.mode;
    calls.dataset.phase=state.phase;calls.dataset.run=state.run_id;
    const demo=state.mode==='demo';
    document.querySelector('.mode-label').replaceChildren(element('div',demo?'Demo mode':'Live run'),element('span',demo?'Simulated calls. Nobody is connected.':'Real calls to the team\'s phones. The incident is simulated.'));
    sourceNote.hidden=demo;
    const kr=document.querySelector('#drill-key-row');if(kr)kr.hidden=demo; // key row only needed in live mode
    status.textContent=(demo?'Simulated · ':'')+( names[state.phase]||state.phase)+(state.complete?' · Complete':state.unanswered?' · No answer. Controller action required.':'');
    const band=state.phase==='unacknowledged'||state.unanswered;
    escalation.hidden=!band;
    escalation.textContent=state.unanswered?'Not acknowledged. Neither decision-maker answered. No decision was made.':`Not acknowledged. Insiyab will phone the duty controller in ${state.remaining} s${demo?' (simulated).':'.'}`;
    for (const [role,value] of rows) {
      const record=state.roles[role];
      if(['predicted','suggested'].includes(state.phase)) delete value.dataset.reported; // a new run starts clean
      // Before the decision is relayed, a role that has already reported to the briefing says so (set by theatre.mjs).
      // In live mode, use the actual status from the NDJSON stream.
      const waiting=record.status==='waiting'?(value.dataset.reported?'Reported':'Waiting'):null;
      let displayText;
      if (waiting!==null) displayText=waiting;
      else if (record.status==='reported'&&record.report) displayText='Reported · '+record.report.slice(0,40)+(record.report.length>40?'…':'');
      else displayText=record.status[0].toUpperCase()+record.status.slice(1);
      value.textContent=displayText+(record.at===null?'':` · ${stamp(record.at,state)}`);
      value.className=record.status==='received'?'received':'';
      value.dataset.status=record.status;
    }
    document.querySelectorAll('[data-option]').forEach(button=>{
      button.setAttribute('aria-pressed',String(state.selected===button.dataset.option));
      button.disabled=!['suggested','unacknowledged','calling_duty','calling_supervisor'].includes(state.phase);
    });
    const confirmation=document.querySelector('#confirmation');
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
    if (previousRun!==state.run_id) {ring.pause();ring.currentTime=0;lastPhase=null;previousRun=state.run_id;liveReports={};liveDecision=null;}
    if (demo && state.phase!==lastPhase && ['calling_duty','calling_supervisor'].includes(state.phase)) {
      ring.currentTime=0;ring.play().then(()=>{audioNote.textContent='Neutral ring played locally. No phone call.';}).catch(()=>{audioNote.hidden=false;audioNote.textContent='Audio unavailable. Simulated calling state remains visible.';});
    }
    if (!demo || state.decision) {ring.pause();ring.currentTime=0;}
    lastPhase=state.phase;
    // Drive theatre and briefing in both demo and live mode (live mode: NDJSON events update
    // lifecycle state, which fires changed(state) here, which drives the visual theatre).
    _theatre.onState(state); _briefing.onState(state);

    // After drill/demo completes, populate and reveal the report section, glow the PDF button.
    if (state.complete) {
      const report=document.querySelector('#report');
      const saveBtn=document.querySelector('#save-pdf');
      if (report) {
        const body=document.querySelector('#report-body');
        if (body) {
          const rows=[];
          rows.push(`<h3>Incident: Route ${alert.route||''}, ${alert.severity||''}</h3>`);
          rows.push(`<p class="source-note">${demo?'Stand-in data':'Calls real, incident simulated.'} Completed: ${new Date().toLocaleTimeString('en-GB',{timeZone:'Asia/Dubai'})}</p>`);
          for (const role of ROLES) {
            const r=state.roles[role];
            const rpt=liveReports[role]||r.report||'';
            rows.push(`<div class="report-row"><strong>${roleNames[role]||role}</strong>: ${rpt?String(rpt).slice(0,200):'No report received.'}</div>`);
          }
          if (liveDecision) rows.push(`<div class="report-decision"><strong>Decision:</strong> ${liveDecision.say||''}${liveDecision.words?'. In their words: '+liveDecision.words:''}</div>`);
          else if (state.decision) rows.push(`<div class="report-decision"><strong>Decision:</strong> ${state.decision}</div>`);
          body.innerHTML=rows.join('\n');
        }
        report.hidden=false;
        report.scrollIntoView({behavior:'smooth',block:'start'});
        if (saveBtn) {
          saveBtn.classList.remove('pdf-glow');
          void saveBtn.offsetWidth; // force reflow so animation restarts
          saveBtn.classList.add('pdf-glow');
          saveBtn.onclick=()=>window.print();
        }
      }
    }
  }});
  document.querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',e=>{if(e.isTrusted)controller.select(button.dataset.option);}));
  const demo=document.querySelector('#demo');demo.disabled=false;
  demo.addEventListener('click',()=>{
    ring.muted=true;ring.play().then(()=>{ring.pause();ring.currentTime=0;ring.muted=false;}).catch(()=>{ring.muted=false;});
    _theatre.reset(); _briefing.reset();
    replay.stop();replay.setTime(67980);controller.startDemo();
  });

  // --- Presenter key (sessionStorage only) ---
  const keyInput=document.querySelector('#drill-key-input');
  const keyClear=document.querySelector('#drill-key-clear');
  const keyRow=document.querySelector('#drill-key-row');
  if (keyInput) {
    const saved=getPresenterKey();
    if (saved) { keyInput.value=saved; if(keyClear)keyClear.hidden=false; }
    keyInput.addEventListener('input',()=>{
      setPresenterKey(keyInput.value.trim());
      if(keyClear) keyClear.hidden=!keyInput.value;
    });
    if (keyClear) keyClear.addEventListener('click',()=>{keyInput.value='';setPresenterKey('');keyClear.hidden=true;});
  }

  // --- Stage: /ops/?stage=1 opens in live mode with the presenter-key box showing. Nothing is called until
  // the key is entered and Start incident is pressed; without the parameter the console opens as before.
  if (new URLSearchParams(location.search).get('stage') === '1') {
    controller.setMode('live');
    // After the run, the presenter scrolls straight on to the two closing slides, taken from the deck itself.
    const close=document.createElement('section'); close.id='stage-close'; close.setAttribute('aria-label','Closing slides');
    for (const n of [17, 15]) {
      const f=document.createElement('iframe'); f.src='../pitch/deck/?s='+n+'&all=1'; f.title='Slide '+n; f.loading='lazy';
      f.className='stage-slide'; close.append(f);
    }
    document.body.append(close);
  }

  // --- Start Incident button ---
  const incidentBtn=document.querySelector('#incident');
  if (incidentBtn) {
    incidentBtn.disabled=false;
    incidentBtn.addEventListener('click',()=>{
      replay.stop();
      // Stall the bus on the map at the alert's coordinates.
      if (typeof replay.stallBus === 'function') replay.stallBus(alert.lon, alert.lat, alert.route);
      const mode=controller.snapshot().mode;
      if (mode==='live') {
        // Live mode: start the drill after the ack window expires.
        controller.startIncident(startLiveDrill);
      } else {
        // Demo mode: scripted simulation, zero network calls.
        ring.muted=true;ring.play().then(()=>{ring.pause();ring.currentTime=0;ring.muted=false;}).catch(()=>{ring.muted=false;});
        controller.startIncident();
      }
    });
  }

  async function startLiveDrill() {
    const key=getPresenterKey();
    if (!key || key.length<24) return; // no key: silently skip (button handles mode guard)
    let reader, decoder;
    try {
      const r=await fetch('/api/drill/start',{method:'POST',headers:{'Content-Type':'application/json','x-insiyab-key':key},signal:AbortSignal.timeout(300000)});
      if (!r.ok) { console.warn('Drill API refused:', r.status); return; }
      reader=r.body.getReader(); decoder=new TextDecoder();
    } catch(e) { console.warn('Drill API unavailable:', e.message); return; }
    let buf='';
    try {
      while (true) {
        const {done,value}=await reader.read();
        if (done) break;
        buf+=decoder.decode(value,{stream:true});
        const lines=buf.split('\n'); buf=lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt=JSON.parse(line);
            // Stash report/decision text for the PDF report section.
            if (evt.type==='status' && evt.status==='reported' && evt.role && evt.report) liveReports[evt.role]=evt.report;
            if (evt.type==='status' && evt.role==='manager' && evt.status==='decided') liveDecision={say:evt.say,words:evt.words};
            controller.drillEvent(evt);
          } catch {}
        }
      }
    } catch(e) { console.warn('Drill stream ended:', e.message); }
  }

  setInterval(()=>controller.tick(),100);
  window.insiyabOps=Object.freeze({
    setMode(mode){replay.stop();return controller.setMode(mode);},
    onEvent(event){return controller.onEvent(event);},
    drillEvent(event){return controller.drillEvent(event);},
  });
}
