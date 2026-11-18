/** Demo lifecycle. No transport, credentials, dispatch or phone capability. */
export const ROLES = ['driver','depot','station','planning'];
const OPEN = new Set(['suggested','unacknowledged','calling_duty','calling_supervisor']);
export function ackSeconds(search) {
  const raw = new URLSearchParams(search).get('ack');
  const value = raw === null ? 10 : Number(raw);
  return Number.isFinite(value) && value >= 1 && value <= 300 ? value : 10;
}
export function createLifecycle({alert, ack = 10, now = Date.now, changed = () => {}}) {
  let state, sequence = 0, demoRunning = false;
  const publish = () => changed(structuredClone(state));
  function reset(mode = 'demo') {
    if (!['demo','live'].includes(mode)) throw Error('Mode must be demo or live');
    const start = now();
    demoRunning = false;
    state = {mode, run_id: `${start}-${++sequence}`, alert_id:alert.id, phase:'predicted', started_at:start, phase_at:start,
      selected:null, decision:null, decision_at:null, remaining:ack, unanswered:false, complete:false,
      roles:Object.fromEntries(ROLES.map(role=>[role,{status:'waiting',at:null}]))};
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
    if (event.type==='relaying') for (const role of ROLES) state.roles[role]={status:'calling',at:event.at};
    phase(event.type,event.at);return true;
  }
  const event = (type, at, role) => accept({...context(),type,at,role},'demo');
  function tick() {
    if (state.mode!=='demo' || !demoRunning) return;
    const t=now(), elapsed=t-state.started_at;
    if (!state.decision) {
      if (state.phase==='predicted' && elapsed>=1000) event('suggested',state.started_at+1000);
      if (state.phase==='suggested' && alert.severity==='critical' && elapsed>=2000) event('unacknowledged',state.started_at+2000);
      if (state.phase==='unacknowledged') {
        const remaining=Math.max(0,Math.ceil((state.started_at+2000+ack*1000-t)/1000));
        if (remaining!==state.remaining) {state.remaining=remaining;publish();}
        if (!remaining) event('calling_duty',state.started_at+2000+ack*1000);
      }
      if (state.phase==='calling_duty' && t-state.phase_at>=60000) event('calling_supervisor',state.phase_at+60000);
      if (state.phase==='calling_supervisor' && t-state.phase_at>=60000 && !state.unanswered) event('unanswered',state.phase_at+60000);
    } else {
      const since=t-state.decision_at;
      if (state.phase==='decided' && since>=800) event('relaying',state.decision_at+800);
      ROLES.forEach((role,i)=>{
        if (since>=1600 && state.roles[role].status==='calling') event('sent',state.decision_at+1600,role);
        if (since>=4000+i*2600 && state.roles[role].status==='sent') event('received',state.decision_at+4000+i*2600,role);
      });
      if (state.phase==='received' && elapsed>=90000 && !state.complete) {state.complete=true;demoRunning=false;publish();}
    }
  }
  reset();
  return {select,confirm,tick,context,
    snapshot:()=>structuredClone(state),
    startDemo:()=>{reset('demo');demoRunning=true;return context();},
    setMode:reset,
    onEvent:event=>accept(event,'live'),
  };
}
