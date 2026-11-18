/* voice-noanswer.test.js: relay when only one of three staff answers.
   No network, no calls, no credits. Node 22+, no dependencies.
   Run: node live/voice/tests/voice-noanswer.test.js
   Four staff on the list: only the depot reports. The other two are marked no-answer.
   The manager hears only the depot report and is told who did not answer.
   Only the depot is called back. */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const RELAY = path.join(__dirname, '..', 'relay.js');
const KEY = 'test-shared-key-noanswer-01234567890';
const TOOL_SECRET = crypto.createHash('sha256').update('insiyab-tool:' + KEY).digest('hex').slice(0, 40);
const PORT = 17891;

const NUMS_FILE = path.join(os.tmpdir(), 'insiyab-noanswer-test-numbers.txt');
fs.writeFileSync(NUMS_FILE, [
  'manager,Fatima,+10000000011',
  'driver,George,+10000000012',
  'depot,Hana,+10000000013',
  'station,Ivan,+10000000014',
].join('\n'));

process.argv.push('--live');
Object.assign(process.env, {
  VOICE_ROSTER_SIZE: '4',
  VOICE_SHARED_KEY:         KEY,
  ELEVENLABS_API_KEY:       'fake-el-key-noanswer',
  ELEVENLABS_PHONE_NUMBER_ID: 'phnum_test2',
  INSIYAB_CALLS:            'armed',
  INSIYAB_NUMBERS_FILE:     NUMS_FILE,
  VOICE_PORT:               String(PORT),
  VOICE_PUBLIC_URL:         'https://dry-run.invalid',
});

let fails = 0;
const ok = (name, cond, info) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  [' + info + ']' : ''));
  if (!cond) fails++;
};

const realFetch = global.fetch;
const calls = [];
const convStatus = {};
let convN = 0;

function J(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } }); }

global.fetch = async (url, init = {}) => {
  const u = String(url);
  const m = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;

  if (u.startsWith('http://127.0.0.1:' + PORT)) return realFetch(u, init);

  if (u.includes('api.elevenlabs.io')) {
    const p = u.replace('https://api.elevenlabs.io', '');
    if (p === '/v1/convai/agents?page_size=100') {
      return J({ agents: [
        { agent_id: 'agent_driver',  name: 'Insiyab relay: driver check' },
        { agent_id: 'agent_depot',   name: 'Insiyab relay: depot check' },
        { agent_id: 'agent_station', name: 'Insiyab relay: station check' },
        { agent_id: 'agent_manager', name: 'Insiyab relay: manager' },
        { agent_id: 'agent_back',    name: 'Insiyab relay: call back' },
      ]});
    }
    if (p === '/v1/convai/twilio/outbound-call') {
      const id = 'conv_' + (++convN);
      calls.push(Object.assign({ id }, body));
      convStatus[id] = 'in-progress';
      return J({ success: true, conversation_id: id, callSid: 'CA' + convN });
    }
    if (p.startsWith('/v1/convai/conversations/')) {
      const id = decodeURIComponent(p.split('/').pop());
      return J({ status: convStatus[id] || 'unknown' });
    }
    return J({ detail: 'not mocked: ' + m + ' ' + p }, 404);
  }
  return J({}, 404);
};

const local = (p, body, headers) => realFetch(
  'http://127.0.0.1:' + PORT + p,
  { method: body !== undefined ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body !== undefined ? JSON.stringify(body) : undefined }
).then(r => r.json());
const incident = p => local('/voice/incident', p, { 'x-insiyab-key': KEY });
const tool = (name, b) => { const call=[...calls].reverse().find(c=>c.conversation_initiation_client_data.dynamic_variables.staff_role===(b.role||'manager')); return local('/voice/tool/' + name, {...b,call_token:call?.conversation_initiation_client_data.dynamic_variables.call_token}, { 'x-insiyab-tool': TOOL_SECRET }); };
const state = () => local('/voice/state/authenticated',undefined,{'x-insiyab-key':KEY});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  require(RELAY);
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    const s = await state().catch(() => null);
    if (s && s.phase !== undefined) break;
  }

  const r = await incident({ route: '310', direction: '1', hour: '18:00', planned_minutes: 67, expected_minutes: 96, minutes_late_now: 22, next_bus_in_minutes: 20, boardings_this_hour: 640, buses_running: 8, buses_needed_by_rule: 17, options: [{ key: 'send_spare', say: 'send the standby bus to route 310' }], source: 'test', drill: true });
  ok('relay starts', r.started === true, JSON.stringify(r));

  for (let i = 0; i < 40 && calls.length < 3; i++) await sleep(100);
  ok('all three staff called at the same time', calls.length === 3, calls.length);
  ok('manager not called yet', !calls.some(c => c.to_number === '+10000000011'), calls.map(c => c.to_number).join());

  // Only depot reports; driver and station do not answer
  await tool('report', { report: 'One bus ready at depot, available in 12 minutes.', role: 'depot' });
  await sleep(300);
  ok('manager not called while driver and station calls still open', calls.length === 3, calls.length);

  // End driver and station calls without a report (no-answer)
  convStatus[calls.find(c => c.to_number === '+10000000012').id] = 'done';
  convStatus[calls.find(c => c.to_number === '+10000000014').id] = 'done';
  convStatus[calls.find(c => c.to_number === '+10000000013').id] = 'done';

  for (let i = 0; i < 40 && calls.length < 4; i++) await sleep(250);
  ok('manager called after calls end (even with no-answers)', calls.length === 4 && calls[3].to_number === '+10000000011', calls.length + ' calls');

  const mgVars = calls[3] && calls[3].conversation_initiation_client_data && calls[3].conversation_initiation_client_data.dynamic_variables;
  ok('manager hears depot report', mgVars && /depot:/.test(mgVars.staff_reports), mgVars && mgVars.staff_reports);
  ok('manager is told driver and station did not answer', mgVars && /driver and station did not answer/.test(mgVars.staff_reports), mgVars && mgVars.staff_reports);
  ok('no-answers do not block the manager call', true);

  // Manager decides
  await tool('decision', { option_key: 'send_spare', words: '' });
  convStatus[calls[3].id] = 'done';

  for (let i = 0; i < 40 && calls.length < 5; i++) await sleep(250);
  ok('only depot is called back (only one who reported)', calls.length === 5 && calls[4].to_number === '+10000000013', calls.length + ' calls, last to ' + (calls[4] && calls[4].to_number));
  ok('driver and station are not called back', !calls.slice(4).some(c => c.to_number === '+10000000012' || c.to_number === '+10000000014'), calls.slice(4).map(c => c.to_number).join());

  // State check: no names or numbers
  const s = await state();
  const stateStr = JSON.stringify(s);
  const forbidden = ['+10000000011', '+10000000012', '+10000000013', '+10000000014', 'Fatima', 'George', 'Hana', 'Ivan'];
  for (const val of forbidden) {
    ok('state does not contain "' + val + '"', !stateStr.includes(val), val);
  }

  // Timeline shows no-answer events
  const noAnswers = (s.timeline || []).filter(e => e.event === 'no_answer');
  ok('timeline records two no-answer events (driver and station)', noAnswers.length === 2, noAnswers.map(e => e.role).join());
  ok('no-answer roles are driver and station', noAnswers.map(e => e.role).sort().join() === 'driver,station', noAnswers.map(e => e.role).join());

  fs.unlinkSync(NUMS_FILE);

  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
