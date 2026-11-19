/** Lifecycle drill tests: startIncident, drillEvent, demo/live mode distinction. */
import assert from 'node:assert/strict';
import {createLifecycle, ROLES} from '../src/lifecycle.mjs';

function makeAlert({severity='critical'}={}) {
  return {id:'a1',route:'310',lon:55.3,lat:25.2,severity,watcher:'running_late',
    suggestion:{options:[{id:'send_spare',label:'Send spare bus'}]}};
}
function makeCtrl(opts={}) {
  const events=[];
  const c=createLifecycle({alert:makeAlert(opts.alertOpts),ack:opts.ack??5,now:opts.now??Date.now,changed(s){events.push(structuredClone(s));}});
  return {c,events};
}

// --- Test 1: startIncident resets run_id and starts countdown in demo mode ---
{
  let t=0; const {c,events}=makeCtrl({now:()=>t});
  c.setMode('demo');
  const ctx1=c.context();
  t=1000; c.startIncident();
  const ctx2=c.context();
  assert.notEqual(ctx2.run_id,ctx1.run_id,'new run_id after startIncident');
  assert.equal(c.snapshot().phase,'predicted','phase is predicted');
  console.log('PASS startIncident resets run_id');
}

// --- Test 2: drillEvent phase:check sets all roles to calling ---
{
  let t=100; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  const s=c.snapshot();
  for (const role of ROLES) assert.equal(s.roles[role].status,'calling',`${role} calling`);
  console.log('PASS drillEvent phase:check sets all roles to calling');
}

// --- Test 3: drillEvent status:reported updates role and stores report ---
{
  let t=200; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  c.drillEvent({type:'status',role:'driver',status:'reported',report:'Bus is running.'});
  const s=c.snapshot();
  assert.equal(s.roles.driver.status,'reported');
  assert.equal(s.roles.driver.report,'Bus is running.');
  console.log('PASS drillEvent status:reported stores report text');
}

// --- Test 4: drillEvent status:no_report sets no_report status ---
{
  let t=300; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  c.drillEvent({type:'status',role:'planner',status:'no_report'});
  assert.equal(c.snapshot().roles.planning.status,'no_report','planner maps to planning');
  console.log('PASS drillEvent status:no_report and planner→planning mapping');
}

// --- Test 5: drillEvent status:decided sets decision and phase ---
{
  let t=400; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  c.drillEvent({type:'status',role:'manager',status:'decided',option_key:'send_spare',at:new Date(500).toISOString()});
  const s=c.snapshot();
  assert.equal(s.decision,'send_spare');
  assert.equal(s.phase,'decided');
  console.log('PASS drillEvent manager decided: decision set, phase decided');
}

// --- Test 6: drillEvent phase:callout sets phase to relaying ---
{
  let t=500; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  c.drillEvent({type:'status',role:'manager',status:'decided',option_key:'send_spare'});
  c.drillEvent({type:'phase',phase:'callout'});
  assert.equal(c.snapshot().phase,'relaying');
  console.log('PASS drillEvent phase:callout → phase relaying');
}

// --- Test 7: drillEvent status:received for all 4 roles → complete ---
{
  let t=600; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'check'});
  c.drillEvent({type:'status',role:'manager',status:'decided',option_key:'send_spare'});
  c.drillEvent({type:'phase',phase:'callout'});
  for (const role of ['driver','depot','station','planner']) {
    c.drillEvent({type:'status',role,status:'received'});
  }
  const s=c.snapshot();
  assert.equal(s.phase,'received');
  assert.equal(s.complete,true,'drill complete after all received');
  console.log('PASS all 4 roles received → complete');
}

// --- Test 8: drillEvent phase:done sets complete ---
{
  let t=700; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  c.drillEvent({type:'phase',phase:'done'});
  assert.equal(c.snapshot().complete,true);
  console.log('PASS drillEvent phase:done → complete');
}

// --- Test 9: startIncident in live mode fires callback when ack expires ---
{
  let t=0; let callbackFired=false; const {c}=makeCtrl({now:()=>t,ack:5});
  c.setMode('live');
  c.startIncident(()=>{callbackFired=true;});
  // Advance through predicted → suggested → unacknowledged → ack expires
  t=1100; c.tick(); // predicted → suggested
  t=2100; c.tick(); // suggested → unacknowledged (critical alert)
  // Advance beyond ack window (2000ms + 5*1000ms = 7000ms)
  t=7100; c.tick(); // should fire callback
  assert.equal(callbackFired,true,'live callback fired after ack expires');
  console.log('PASS live mode: startIncident fires callback when ack expires');
}

// --- Test 10: demo mode startIncident doesn't fire callback but runs simulation ---
{
  let t=0; let callbackFired=false; const {c}=makeCtrl({now:()=>t,ack:5});
  c.setMode('demo');
  c.startIncident(()=>{callbackFired=true;});
  t=1100; c.tick();
  t=2100; c.tick();
  t=7100; c.tick(); // ack expired in demo → calling_duty (scripted, no callback)
  assert.equal(callbackFired,false,'demo mode: no callback fired');
  assert.equal(c.snapshot().phase,'calling_duty','demo simulation advances normally');
  console.log('PASS demo mode startIncident: no callback, scripted simulation advances');
}

// --- Test 11: cap and error events don't throw ---
{
  let t=800; const {c}=makeCtrl({now:()=>t});
  c.startIncident();
  assert.ok(c.drillEvent({type:'cap',phase:'check',message:'Timed out'})!==undefined);
  assert.ok(c.drillEvent({type:'error',role:'driver',message:'Call failed'})!==undefined);
  console.log('PASS cap and error events accepted without throw');
}

// --- Test 12: unknown drillEvent type returns false ---
{
  const {c}=makeCtrl();
  c.startIncident();
  assert.equal(c.drillEvent({type:'unknown',data:'x'}),false);
  console.log('PASS unknown drillEvent type returns false');
}

console.log('ALL PASS');
