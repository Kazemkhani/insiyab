/** Demo lifecycle. No transport, credentials, dispatch or phone capability. */
export const ROLES = ['driver','depot','station','planning'];
const OPEN = new Set(['suggested','unacknowledged','calling_duty','calling_supervisor']);
export function ackSeconds(search) {
  const params = new URLSearchParams(search), raw = params.get('ack');
  const fallback = params.get('stage') === '1' ? 5 : 10;   // the stage flow: 5 seconds with no acknowledgement, then Insiyab calls
  const value = raw === null ? fallback : Number(raw);
  return Number.isFinite(value) && value >= 1 && value <= 300 ? value : fallback;
}
// Drill API role name → lifecycle ROLES name.
const DRILL_ROLE = { driver:'driver', depot:'depot', station:'station', planner:'planning' };
export function createLifecycle({alert, ack = 10, now = Date.now, changed = () => {}}) {
  let state, sequence = 0, demoRunning = false, liveCallsDue = null;
  const publish = () => changed(structuredClone(state));
  function reset(mode = 'demo') {
    if (!['demo','live'].includes(mode)) throw Error('Mode must be demo or live');
    const start = now();
    demoRunning = false; liveCallsDue = null;
    state = {mode, run_id: `${start}-${++sequence}`, alert_id:alert.id, phase:'predicted', started_at:start, phase_at:start,
      selected:null, decision:null, decision_at:null, remaining:ack, unanswered:false, complete:false,
      roles:Object.fromEntries(ROLES.map(role=>[role,{status:'waiting',at:null,report:null}]))};
    publish();return context();
  }
  function context() {return {mode:state.mode,run_id:state.run_id,alert_id:state.alert_id};}
  function phase(value, at = now()) {state.phase=value;state.phase_at=at;publish();}
  function select(id) {
    if (!OPEN.has(state.phase) || !alert.suggestion.options.some(option=>option.id===id)) return false;
    state.selected=id;publish();return true;
  }
  function confirm() {
    if (!OPEN.has(state.phase) || !state.selected || state.decision) return false;
    state.decision=state.selected;state.decision_at=now();state.unanswered=false;phase('decided');return true;
  }
  // In live mode lane 1 supplies authenticated events. This UI cannot authenticate
  // a provider or initiate a call. An event can never substitute for two clicks.
  function accept(event, source) {
    if (!event || event.run_id!==state.run_id || event.alert_id!==state.alert_id || source!==state.mode) return false;
    if (!Number.isFinite(event.at) || event.at<state.started_at || event.at>now()) return false;
    if (ROLES.includes(event.role)) {
      if (!state.decision || !['relaying','sent','received'].includes(state.phase)) return false;
      const role=state.roles[event.role];
      if (role.at!==null && event.at<role.at) return false;
      if (event.type==='sent' && role.status==='calling') role.status='sent';
      else if (event.type==='received' && role.status==='sent') role.status='received';
      else return false;
      role.at=event.at;
      if (ROLES.every(r=>state.roles[r].status==='received')) state.phase='received';
      else if (ROLES.every(r=>['sent','received'].includes(state.roles[r].status))) state.phase='sent';
      publish();return true;
    }
    if (event.at<state.phase_at) return false;
    const allowed = {predicted:['suggested'],suggested:alert.severity==='critical'?['unacknowledged']:[],unacknowledged:['calling_duty'],calling_duty:['calling_supervisor'],decided:['relaying']};
    if (event.type==='unanswered' && ['calling_duty','calling_supervisor'].includes(state.phase)) {
      state.unanswered=true;publish();return true;
    }
    if (!allowed[state.phase]?.includes(event.type)) return false;
    if (event.type==='relaying') for (const role of ROLES) state.roles[role]={status:'calling',at:event.at,report:null};
    phase(event.type,event.at);return true;
  }
  // event() uses state.mode so both demo and live sources validate correctly in accept().
  const event = (type, at, role) => accept({...context(),type,at,role},state.mode);
  function tick() {
    if (!demoRunning) return;
    const t=now(), elapsed=t-state.started_at;
    if (!state.decision) {
      if (state.phase==='predicted' && elapsed>=1000) event('suggested',state.started_at+1000);
      if (state.phase==='suggested' && alert.severity==='critical' && elapsed>=2000) event('unacknowledged',state.started_at+2000);
      if (state.phase==='unacknowledged') {
        const remaining=Math.max(0,Math.ceil((state.started_at+2000+ack*1000-t)/1000));
        if (remaining!==state.remaining) {state.remaining=remaining;publish();}
        if (!remaining) {
          event('calling_duty',state.started_at+2000+ack*1000);
          // In live mode: fire the callback (which starts the drill API stream) then stop ticking.
          if (liveCallsDue) { const cb=liveCallsDue; liveCallsDue=null; demoRunning=false; cb(); }
        }
      }
      // Demo-only: simulate escalation to calling_supervisor.
      if (state.mode==='demo') {
        if (state.phase==='calling_duty' && t-state.phase_at>=60000) event('calling_supervisor',state.phase_at+60000);
        if (state.phase==='calling_supervisor' && t-state.phase_at>=60000 && !state.unanswered) event('unanswered',state.phase_at+60000);
      }
    } else if (state.mode==='demo') {
      // Demo-only: simulate relaying, sent, received.
      const since=t-state.decision_at;
      if (state.phase==='decided' && since>=800) event('relaying',state.decision_at+800);
      ROLES.forEach((role,i)=>{
        if (since>=1600 && state.roles[role].status==='calling') event('sent',state.decision_at+1600,role);
        if (since>=4000+i*2600 && state.roles[role].status==='sent') event('received',state.decision_at+4000+i*2600,role);
      });
      if (state.phase==='received' && elapsed>=90000 && !state.complete) {state.complete=true;demoRunning=false;publish();}
    }
  }
  // Start an incident: runs the ack countdown, then in live mode fires onCallsDue.
  // In demo mode the scripted simulation continues from tick() as before.
  function startIncident(onCallsDue) {
    reset(state.mode);
    demoRunning = true;
    if (state.mode === 'live') liveCallsDue = onCallsDue || null;
  }
  // Consume a streaming NDJSON event from the drill API and update lifecycle state.
  // Maps drill roles: planner → planning. Returns true if state was updated.
  function drillEvent(evt) {
    if (!evt) return false;
    if (evt.type === 'phase') {
      if (evt.phase === 'check') {
        for (const role of ROLES) state.roles[role] = {status:'calling', at:null, report:null};
        publish(); return true;
      }
      if (evt.phase === 'callout') {
        const at = evt.at ? new Date(evt.at).getTime() : now();
        state.phase = 'relaying'; state.phase_at = at;
        for (const role of ROLES) if (state.roles[role].status !== 'received') state.roles[role].status = 'sent';
        publish(); return true;
      }
      if (evt.phase === 'done') {
        state.complete = true; demoRunning = false; publish(); return true;
      }
      return false;
    }
    if (evt.type === 'status') {
      if (evt.role === 'manager') {
        if (evt.status === 'decided' && evt.option_key) {
          const at = evt.at ? new Date(evt.at).getTime() : now();
          state.decision = evt.option_key;
          state.decision_at = at;
          state.phase = 'decided'; state.phase_at = at;
          publish(); return true;
        }
        return false;
      }
      const role = DRILL_ROLE[evt.role];
      if (role && ROLES.includes(role)) {
        const r = state.roles[role];
        const at = evt.at ? new Date(evt.at).getTime() : now();
        if (evt.status === 'calling') { r.status = 'calling'; r.at = at; }
        else if (evt.status === 'reported') { r.status = 'reported'; r.report = evt.report || null; r.at = at; }
        else if (evt.status === 'no_report') { r.status = 'no_report'; r.at = at; }
        else if (evt.status === 'sent') { r.status = 'sent'; r.at = at; }
        else if (evt.status === 'received') { r.status = 'received'; r.at = at; }
        else return false;
        if (ROLES.every(r2 => state.roles[r2].status === 'received')) { state.phase = 'received'; state.complete = true; }
        publish(); return true;
      }
      return false;
    }
    if (evt.type === 'cap' || evt.type === 'error') { publish(); return true; }
    return false;
  }
  reset();
  return {select,confirm,tick,context,
    snapshot:()=>structuredClone(state),
    startDemo:()=>{reset('demo');demoRunning=true;return context();},
    setMode:reset,
    onEvent:event=>accept(event,'live'),
    startIncident,
    drillEvent,
  };
}
