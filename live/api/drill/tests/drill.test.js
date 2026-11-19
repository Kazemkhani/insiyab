'use strict';
// Tests for the Vercel drill function. All ElevenLabs calls are mocked.
// Last line must be: ALL PASS
// CJS module: async tests run inside a top-level IIFE.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Load modules under test.
const handler = require('../start.js');
const { runDrill, parseRoster, toolSecret, extractToolCall } = handler;

// --- Mock response object for handler tests ---
function makeRes() {
  const lines = [];
  const res = { statusCode: 200, body: null, ended: false };
  res.status = s => { res.statusCode = s; return res; };
  res.json = j => { res.body = j; res.ended = true; };
  res.setHeader = () => {};
  res.write = l => lines.push(l);
  res.end = () => { res.ended = true; };
  res.events = () => lines.join('').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return res;
}

function makeReq(opts = {}) {
  return { method: opts.method || 'POST', headers: opts.headers || {}, body: opts.body || {}, query: opts.query || {} };
}

// --- Unit: parseRoster ---
assert.throws(() => parseRoster(''), /not valid JSON/);
assert.throws(() => parseRoster('{}'), /must be a JSON array/);
assert.throws(() => parseRoster(JSON.stringify([
  { role: 'driver', name: 'A', number: '+10000000001' },
])), /missing role: depot/);
assert.throws(() => parseRoster(JSON.stringify([
  { role: 'driver', name: 'A', number: '+10000000001' },
  { role: 'driver', name: 'B', number: '+10000000002' },
  { role: 'depot', name: 'C', number: '+10000000003' },
  { role: 'station', name: 'D', number: '+10000000004' },
  { role: 'planner', name: 'E', number: '+10000000005' },
  { role: 'manager', name: 'F', number: '+10000000006' },
])), /duplicate role/);
const goodRoster = parseRoster(JSON.stringify([
  { role: 'driver', name: 'Alice', number: '+10000000001' },
  { role: 'depot', name: 'Bob', number: '+10000000002' },
  { role: 'station', name: 'Carol', number: '+10000000003' },
  { role: 'planner', name: 'Dan', number: '+10000000004' },
  { role: 'manager', name: 'Eve', number: '+10000000005' },
]));
assert.equal(goodRoster.length, 5);
assert.equal(goodRoster[0].role, 'driver');
console.log('PASS parseRoster validates and returns roles in canonical order');

// --- Unit: toolSecret ---
const tkey = crypto.randomBytes(24).toString('hex');
const tsec = toolSecret(tkey);
assert.equal(tsec.length, 40);
assert.match(tsec, /^[0-9a-f]+$/);
assert.equal(toolSecret(''), '');
console.log('PASS toolSecret produces 40-hex-char secret from key');

// --- Unit: extractToolCall ---
const fakeConv = { tool_calls: [{ tool_name: 'insiyab_report', params_as_json: JSON.stringify({ report: 'All fine', role: 'driver' }) }] };
assert.equal(extractToolCall(fakeConv, 'insiyab_report').report, 'All fine');
assert.equal(extractToolCall(fakeConv, 'insiyab_decision'), null);
assert.equal(extractToolCall(null, 'anything'), null);
console.log('PASS extractToolCall finds named tool call in conversation');

// --- Helpers for runDrill tests ---
function makeRoster() {
  return [
    { role: 'driver', name: 'AliceTest', number: '+10000000001' },
    { role: 'depot', name: 'BobTest', number: '+10000000002' },
    { role: 'station', name: 'CarolTest', number: '+10000000003' },
    { role: 'planner', name: 'DanTest', number: '+10000000004' },
    { role: 'manager', name: 'EveTest', number: '+10000000005' },
  ];
}
function makeIncident() {
  return { drill: true, id: 'test-001', route: '310', direction: '1', hour: '18:00', planned_minutes: 67, expected_minutes: 96, minutes_late_now: 22, next_bus_in_minutes: 20, boardings_this_hour: 640, buses_running: 8, buses_needed_by_rule: 17, source: 'Stand-in drill scenario.', options: [{ key: 'send_spare', say: 'send the standby bus' }] };
}
function makeAgentIds() {
  return { driver: 'a-driver', depot: 'a-depot', station: 'a-station', planner: 'a-planner', manager: 'a-manager', back: 'a-back' };
}
function makeNames() {
  return new Set(['AliceTest', 'BobTest', 'CarolTest', 'DanTest', 'EveTest']);
}

// Mock fetch: each call to /outbound-call creates conv-N; GET conv-N returns configured state.
function makeFetchMock({ convEndDelay = 0, reports = {}, decision = null, acks = {} } = {}) {
  let callCount = 0;
  const convStatuses = {}, convRoles = {}, convPhase = {};
  return async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/v1/convai/twilio/outbound-call')) {
      const body = JSON.parse(init.body || '{}');
      const id = 'conv-' + (++callCount);
      const role = body.conversation_initiation_client_data?.dynamic_variables?.staff_role;
      convRoles[id] = role;
      // Phase: first 4 calls staff, 5th manager, rest back.
      convPhase[id] = callCount <= 4 ? 'staff' : callCount === 5 ? 'manager' : 'back';
      convStatuses[id] = 'in-progress';
      if (convEndDelay === 0) convStatuses[id] = 'done';
      else setTimeout(() => { convStatuses[id] = 'done'; }, convEndDelay);
      return { ok: true, json: async () => ({ success: true, conversation_id: id }) };
    }
    if (/\/v1\/convai\/conversations\/conv-/.test(u)) {
      const id = u.split('/').pop();
      const status = convStatuses[id] || 'unknown';
      const role = convRoles[id], phase = convPhase[id];
      const tool_calls = [];
      if (status === 'done') {
        if (phase === 'staff' && reports[role] !== undefined)
          tool_calls.push({ tool_name: 'insiyab_report', params_as_json: JSON.stringify({ report: reports[role] }) });
        if (phase === 'manager' && decision)
          tool_calls.push({ tool_name: 'insiyab_decision', params_as_json: JSON.stringify({ option_key: decision }) });
        if (phase === 'back' && acks[role])
          tool_calls.push({ tool_name: 'insiyab_acknowledge', params_as_json: JSON.stringify({ role }) });
      }
      return { ok: true, json: async () => ({ status, tool_calls }) };
    }
    return { ok: false, status: 503, json: async () => ({}) };
  };
}

(async () => {
// --- Test 1: no key → 401, zero EL calls ---
await (async () => {
  const sharedKey = crypto.randomBytes(24).toString('hex');
  const savedKey = process.env.VOICE_SHARED_KEY, savedCalls = process.env.INSIYAB_CALLS, savedRoster = process.env.VOICE_ROSTER;
  process.env.VOICE_SHARED_KEY = sharedKey;
  process.env.INSIYAB_CALLS = 'armed';
  process.env.VOICE_ROSTER = JSON.stringify(makeRoster());
  let elCalls = 0;
  const origFetch = global.fetch;
  global.fetch = () => { elCalls++; return Promise.resolve({ ok: true, json: async () => ({ agents: [] }) }); };
  const req = makeReq({ headers: {} }); // no key
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(elCalls, 0);
  global.fetch = origFetch;
  if (savedKey !== undefined) process.env.VOICE_SHARED_KEY = savedKey; else delete process.env.VOICE_SHARED_KEY;
  if (savedCalls !== undefined) process.env.INSIYAB_CALLS = savedCalls; else delete process.env.INSIYAB_CALLS;
  if (savedRoster !== undefined) process.env.VOICE_ROSTER = savedRoster; else delete process.env.VOICE_ROSTER;
  console.log('PASS no key → 401 and zero outbound calls');
})();

// --- Test 2: not armed → 403, zero EL calls ---
await (async () => {
  const sharedKey = crypto.randomBytes(24).toString('hex');
  process.env.VOICE_SHARED_KEY = sharedKey;
  delete process.env.INSIYAB_CALLS;
  let elCalls = 0;
  const origFetch = global.fetch;
  global.fetch = () => { elCalls++; return Promise.resolve({ ok: true, json: async () => ({}) }); };
  const req = makeReq({ headers: { 'x-insiyab-key': sharedKey } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'not armed');
  assert.equal(elCalls, 0);
  global.fetch = origFetch;
  delete process.env.VOICE_SHARED_KEY;
  console.log('PASS not armed → 403 and zero outbound calls');
})();

// --- Test 3: bad roster → 403, zero EL calls ---
await (async () => {
  const sharedKey = crypto.randomBytes(24).toString('hex');
  process.env.VOICE_SHARED_KEY = sharedKey;
  process.env.INSIYAB_CALLS = 'armed';
  process.env.VOICE_ROSTER = 'not-valid-json';
  let elCalls = 0;
  const origFetch = global.fetch;
  global.fetch = () => { elCalls++; return Promise.resolve({ ok: true, json: async () => ({}) }); };
  const req = makeReq({ headers: { 'x-insiyab-key': sharedKey } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(elCalls, 0);
  global.fetch = origFetch;
  delete process.env.VOICE_SHARED_KEY;
  delete process.env.INSIYAB_CALLS;
  delete process.env.VOICE_ROSTER;
  console.log('PASS bad roster → 403 and zero outbound calls');
})();

// --- Test 4: full mocked run → events in right order, scrubbed ---
await (async () => {
  const events = [];
  const roster = makeRoster();
  const names = makeNames();
  await runDrill({
    roster, incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names,
    elKey: 'fake', phoneId: 'fake-phone',
    fetchFn: makeFetchMock({ reports: { driver: 'On time', depot: 'All clear', station: 'Normal', planner: 'No issues' }, decision: 'send_spare', acks: { driver: true, depot: true, station: true, planner: true } }),
    staffCap: 10000, managerCap: 10000, calloutCap: 10000, pollMs: 50,
  });
  const phases = events.filter(e => e.type === 'phase').map(e => e.phase);
  assert.deepEqual(phases, ['check', 'manager', 'callout', 'done'], 'phase sequence');
  assert.equal(events.filter(e => e.type === 'status' && e.status === 'calling' && e.role !== 'manager').length, 4, 'four staff calling events');
  assert.equal(events.filter(e => e.type === 'status' && e.status === 'reported').length, 4, 'four reports');
  const mgr = events.find(e => e.type === 'status' && e.role === 'manager' && e.status === 'decided');
  assert.ok(mgr, 'manager decided event');
  assert.equal(mgr.option_key, 'send_spare');
  assert.equal(events.filter(e => e.type === 'status' && e.status === 'received').length, 4, 'four received');
  assert.equal(events.find(e => e.type === 'phase' && e.phase === 'done')?.outcome, 'complete');
  // Scrub: no event must contain 7+ consecutive digits or a roster name.
  for (const e of events) {
    const str = JSON.stringify(e);
    assert.ok(!/\d{7,}/.test(str), 'event contains 7+ digit run: ' + str.slice(0, 120));
    for (const n of names) assert.ok(!str.includes(n), 'event contains roster name ' + n + ': ' + str.slice(0, 120));
  }
  console.log('PASS full mocked run: events in right order, scrubbed of digits and names');
})();

// --- Test 5: staff call ends without report → continues ---
await (async () => {
  const events = [];
  await runDrill({
    roster: makeRoster(), incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names: new Set(),
    elKey: 'fake', phoneId: 'fake-phone',
    fetchFn: makeFetchMock({ reports: { depot: 'All clear', station: 'Normal', planner: 'No issues' }, decision: 'send_spare', acks: {} }),
    staffCap: 10000, managerCap: 10000, calloutCap: 10000, pollMs: 50,
  });
  assert.ok(events.find(e => e.type === 'status' && e.role === 'driver' && e.status === 'no_report'), 'no_report event for driver');
  assert.ok(events.find(e => e.type === 'status' && e.role === 'manager' && e.status === 'calling'), 'manager still called');
  assert.ok(events.find(e => e.type === 'phase' && e.phase === 'done'), 'drill completes');
  console.log('PASS staff call without report: no_report event emitted, drill continues to completion');
})();

// --- Test 6: ElevenLabs error responses → error events, drill completes ---
await (async () => {
  const events = [];
  const errorFetch = async () => ({ ok: false, status: 503, json: async () => ({ message: 'timeout' }) });
  await runDrill({
    roster: makeRoster(), incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names: new Set(),
    elKey: 'fake', phoneId: 'fake-phone', fetchFn: errorFetch,
    staffCap: 500, managerCap: 500, calloutCap: 500, pollMs: 50,
  });
  assert.ok(events.filter(e => e.type === 'error').length > 0, 'error events emitted');
  assert.ok(events.find(e => e.type === 'phase' && e.phase === 'done'), 'drill completes without hanging');
  console.log('PASS ElevenLabs error responses: error events emitted, drill completes without hanging');
})();

// --- Test 7: staff cap → cap event streamed ---
await (async () => {
  const events = [];
  await runDrill({
    roster: makeRoster(), incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names: new Set(),
    elKey: 'fake', phoneId: 'fake-phone',
    fetchFn: makeFetchMock({ convEndDelay: 5000, reports: {}, decision: 'send_spare', acks: {} }),
    staffCap: 100, managerCap: 10000, calloutCap: 10000, pollMs: 50,
  });
  assert.ok(events.find(e => e.type === 'cap' && e.phase === 'check'), 'staff cap event emitted');
  console.log('PASS staff phase cap (DRILL_STAFF_TIMEOUT_S default 75s) → cap event streamed, drill continues');
})();

// --- Test 8: manager cap → cap event streamed ---
await (async () => {
  const events = [];
  await runDrill({
    roster: makeRoster(), incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names: new Set(),
    elKey: 'fake', phoneId: 'fake-phone',
    fetchFn: makeFetchMock({ convEndDelay: 5000, reports: { driver: 'x', depot: 'x', station: 'x', planner: 'x' }, decision: null, acks: {} }),
    staffCap: 10000, managerCap: 100, calloutCap: 10000, pollMs: 50,
  });
  assert.ok(events.find(e => e.type === 'cap' && e.phase === 'manager'), 'manager cap event emitted');
  console.log('PASS manager phase cap (DRILL_MANAGER_TIMEOUT_S default 100s) → cap event streamed');
})();

// --- Test 9: callout cap → cap event streamed ---
await (async () => {
  const events = [];
  await runDrill({
    roster: makeRoster(), incident: makeIncident(), agentIds: makeAgentIds(), write: e => events.push(e), names: new Set(),
    elKey: 'fake', phoneId: 'fake-phone',
    fetchFn: makeFetchMock({ convEndDelay: 5000, reports: { driver: 'x', depot: 'x', station: 'x', planner: 'x' }, decision: 'send_spare', acks: {} }),
    staffCap: 10000, managerCap: 10000, calloutCap: 100, pollMs: 50,
  });
  assert.ok(events.find(e => e.type === 'cap' && e.phase === 'callout'), 'callout cap event emitted');
  console.log('PASS callout phase cap (DRILL_CALLOUT_TIMEOUT_S default 40s) → cap event streamed');
})();

  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
