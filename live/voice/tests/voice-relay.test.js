/* voice-relay.test.js: full relay end to end with a fake ElevenLabs server.
   No network, no calls, no credits. Node 22+, no dependencies.
   Run: node live/voice/tests/voice-relay.test.js
   Checks: staff called at the same time first; manager called after the last report; call back placed
   with the decision word for word; relay finishes with decision and acknowledgements. */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const RELAY = path.join(__dirname, '..', 'relay.js');
const KEY = 'test-shared-key-for-relay-01234567890';
const TOOL_SECRET = crypto.createHash('sha256').update('insiyab-tool:' + KEY).digest('hex').slice(0, 40);
const PORT = 17890;

// Temp numbers file
const NUMS_FILE = path.join(os.tmpdir(), 'insiyab-relay-test-numbers.txt');
fs.writeFileSync(NUMS_FILE, [
  'manager,Alex,+10000000001',
  'driver,Beth,+10000000002',
  'depot,Chris,+10000000003',
  'station,Dana,+10000000004',
].join('\n'));

// Inject env and argv before requiring relay.js
process.argv.push('--live');
Object.assign(process.env, {
  VOICE_ROSTER_SIZE: '4',
  VOICE_SHARED_KEY:        KEY,
  ELEVENLABS_API_KEY:      'fake-el-key',
  ELEVENLABS_PHONE_NUMBER_ID: 'phnum_test',
  ELEVENLABS_VOICE_ID:     'voice_test',
  INSIYAB_CALLS:           'armed',
  INSIYAB_NUMBERS_FILE:    NUMS_FILE,
  VOICE_PORT:              String(PORT),
  VOICE_PUBLIC_URL:        'https://dry-run.invalid',
});

let fails = 0;
const ok = (name, cond, info) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  [' + info + ']' : ''));
  if (!cond) fails++;
};

// Fake ElevenLabs server
const realFetch = global.fetch;
const calls = [];        // outbound-call requests
const convStatus = {};   // conv_id -> status
let convN = 0;

global.fetch = async (url, init = {}) => {
  const u = String(url);
  const m = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;

  // Let requests back to the relay server through
  if (u.startsWith('http://127.0.0.1:' + PORT)) return realFetch(u, init);

  // Block any attempt to reach real ElevenLabs or Twilio
  if (u.includes('api.elevenlabs.io') || u.includes('api.twilio.com')) {
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

function J(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } }); }

const local = (p, body, headers) => realFetch(
  'http://127.0.0.1:' + PORT + p,
  { method: body !== undefined ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body !== undefined ? JSON.stringify(body) : undefined }
).then(r => r.json());

const incident = (p, headers) => local('/voice/incident', p, Object.assign({ 'x-insiyab-key': KEY }, headers || {}));
const tool = (name, b) => { const call=[...calls].reverse().find(c=>c.conversation_initiation_client_data.dynamic_variables.staff_role===(b.role||'manager')); return local('/voice/tool/' + name, {...b,call_token:call?.conversation_initiation_client_data.dynamic_variables.call_token}, { 'x-insiyab-tool': TOOL_SECRET }); };
const state = () => local('/voice/state/authenticated',undefined,{'x-insiyab-key':KEY});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  require(RELAY);
  // Wait for server and agents to load
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    const s = await state().catch(() => null);
    if (s && s.phase !== undefined) break;
  }

  // Shared key required
  let r = await incident({ route: '310', direction: '1', hour: '18:00' }, { 'x-insiyab-key': 'wrong-key' });
  ok('incident endpoint: wrong key returns error', !r.started && !r.rehearsal, JSON.stringify(r));

  r = await incident({ route: '310', direction: '1', hour: '18:00', planned_minutes: 67, expected_minutes: 96, minutes_late_now: 22, next_bus_in_minutes: 20, boardings_this_hour: 640, buses_running: 8, buses_needed_by_rule: 17, options: [{ key: 'send_spare', say: 'send the standby bus to route 310' }, { key: 'hold', say: 'hold the next departure two minutes' }], source: 'test', drill: true });
  ok('incident with correct key: relay starts', r.started === true, JSON.stringify(r));

  // Wait for staff calls to be placed
  for (let i = 0; i < 40 && calls.length < 3; i++) await sleep(100);
  ok('staff called first: exactly three calls for driver, depot, station', calls.length === 3, calls.length);
  const staffRoles = calls.map(c => {
    const nums = { '+10000000002': 'driver', '+10000000003': 'depot', '+10000000004': 'station', '+10000000001': 'manager' };
    return nums[c.to_number] || 'unknown';
  }).sort();
  ok('staff calls go to driver, depot, station (not manager yet)', JSON.stringify(staffRoles) === '["depot","driver","station"]', staffRoles.join());
  ok('no call placed to manager yet', !calls.some(c => c.to_number === '+10000000001'), calls.map(c => c.to_number).join());

  // Staff check: each uses the right agent
  const agentOf = c => c.agent_id;
  ok('driver call uses driver-check agent', calls.find(c => c.to_number === '+10000000002') && agentOf(calls.find(c => c.to_number === '+10000000002')) === 'agent_driver');
  ok('depot call uses depot-check agent', calls.find(c => c.to_number === '+10000000003') && agentOf(calls.find(c => c.to_number === '+10000000003')) === 'agent_depot');
  ok('station call uses station-check agent', calls.find(c => c.to_number === '+10000000004') && agentOf(calls.find(c => c.to_number === '+10000000004')) === 'agent_station');

  // Incident variables reach each agent
  const driverVars = (calls.find(c => c.to_number === '+10000000002') || {}).conversation_initiation_client_data && calls.find(c => c.to_number === '+10000000002').conversation_initiation_client_data.dynamic_variables;
  ok('incident variables include route and hour', driverVars && driverVars.route === '310' && driverVars.hour === '18:00', driverVars && JSON.stringify(driverVars));

  // A second incident while relay is running should be skipped
  const r2 = await incident({ route: '310', direction: '1', hour: '18:00',drill:true,options:[{key:'none',say:'observe'}] });
  ok('second incident while relay runs is skipped', r2.skipped, JSON.stringify(r2));

  const wrongToken=await local('/voice/tool/report',{role:'driver',report:'untrusted',call_token:'wrong'},{'x-insiyab-tool':TOOL_SECRET});
  ok('wrong token cannot inject a report', !(await state()).reports.driver,wrongToken.result);
  const swappedRole=await local('/voice/tool/report',{role:'station',report:'wrong role',call_token:driverVars.call_token},{'x-insiyab-tool':TOOL_SECRET});
  ok('a driver call cannot report as station', !(await state()).reports.station,swappedRole.result);
  const earlyDecision=await tool('decision',{option_key:'send_spare'});
  ok('no decision can be recorded during staff calls',!(await state()).decision,earlyDecision.result);
  // Reports come in via tool calls
  const rep1 = await tool('report', { report: 'Traffic blocked at the main junction, barely moving.', role: 'driver' });
  ok('driver report logged, agent told to end call', /end_call/.test(rep1.result), rep1.result);

  const rep2 = await tool('report', { report: 'One standby bus free at depot, can be ready in 15 minutes.', role: 'depot' });
  ok('depot report logged', rep2.result.includes('Logged'), rep2.result);

  // After two reports, manager should still not be called (waiting for all or timeout)
  await sleep(300);
  ok('manager not called while station call still running', calls.length === 3, calls.length);

  const rep3 = await tool('report', { report: 'About 80 passengers waiting, platform is crowded.', role: 'station' });
  ok('station report logged', rep3.result.includes('Logged'), rep3.result);

  // All reports in - manager should be called
  for (let i = 0; i < 40 && calls.length < 4; i++) await sleep(250);
  ok('manager called after all three reports received', calls.length === 4 && calls[3].to_number === '+10000000001', calls.length + ' calls, last to ' + (calls[3] && calls[3].to_number));
  ok('manager call uses manager agent', calls[3] && calls[3].agent_id === 'agent_manager');

  const mgVars = calls[3] && calls[3].conversation_initiation_client_data && calls[3].conversation_initiation_client_data.dynamic_variables;
  ok('manager hears staff reports', mgVars && /driver:/.test(mgVars.staff_reports) && /depot:/.test(mgVars.staff_reports) && /station:/.test(mgVars.staff_reports), mgVars && mgVars.staff_reports);
  ok('manager hears options text', mgVars && /send_spare/.test(mgVars.options_text), mgVars && mgVars.options_text);

  const invalid=await tool('decision',{option_key:'unlisted'});
  ok('manager must choose an offered option', !(await state()).decision,invalid.result);
  const lateReport=await local('/voice/tool/report',{role:'driver',report:'stale overwrite',call_token:driverVars.call_token},{'x-insiyab-tool':TOOL_SECRET});
  ok('late report cannot overwrite briefing',!(await state()).reports.driver.report.includes('stale'),lateReport.result);
  // Manager decides
  const dec = await tool('decision', { option_key: 'send_spare', words: 'Get the bus to route 310 junction stop.' });
  ok('decision logged', /Recorded/.test(dec.result) && /send the standby bus/.test(dec.result), dec.result);

  // No call back while manager is still on the line
  ok('call back not placed while manager call still open', calls.length === 4, calls.length);
  convStatus[calls[3].id] = 'done';

  for (let i = 0; i < 40 && calls.length < 7; i++) await sleep(250);
  const backCalls = calls.slice(4);
  ok('after manager hangs up, all three staff are called back', backCalls.length === 3, backCalls.length);
  const backRoles = backCalls.map(c => {
    const nums = { '+10000000002': 'driver', '+10000000003': 'depot', '+10000000004': 'station' };
    return nums[c.to_number] || 'unknown';
  }).sort();
  ok('call back goes to driver, depot and station', JSON.stringify(backRoles) === '["depot","driver","station"]', backRoles.join());
  ok('call back uses call-back agent', backCalls.every(c => c.agent_id === 'agent_back'));
  const backVars = backCalls[0] && backCalls[0].conversation_initiation_client_data && backCalls[0].conversation_initiation_client_data.dynamic_variables;
  ok('call back carries the decision word for word', backVars && /send the standby bus to route 310/.test(backVars.decision_text), backVars && backVars.decision_text);
  ok('call back carries the manager\'s extra words', backVars && /Get the bus to route 310 junction stop/.test(backVars.decision_text), backVars && backVars.decision_text);

  // Acknowledge
  await tool('acknowledge', { role: 'driver' });
  await tool('acknowledge', { role: 'depot' });
  await tool('acknowledge', { role: 'station' });

  // Final state
  const s = await state();
  ok('state has decision', s.decision && s.decision.option_key === 'send_spare', s.decision && s.decision.option_key);
  ok('state has three reports', s.reports && s.reports.driver && s.reports.depot && s.reports.station, JSON.stringify(s.reports && Object.keys(s.reports)));
  ok('state has three acknowledgements', s.acknowledgements && s.acknowledgements.driver && s.acknowledgements.depot && s.acknowledgements.station, JSON.stringify(s.acknowledgements && Object.keys(s.acknowledgements)));

  // /voice/state must not contain any phone number or name from the numbers file
  const stateStr = JSON.stringify(s);
  const forbidden = ['+10000000001', '+10000000002', '+10000000003', '+10000000004', 'Alex', 'Beth', 'Chris', 'Dana'];
  for (const val of forbidden) {
    ok('state does not contain "' + val + '"', !stateStr.includes(val), 'found in: ' + (stateStr.includes(val) ? stateStr.slice(stateStr.indexOf(val) - 20, stateStr.indexOf(val) + 40) : 'ok'));
  }

  // The demo stays labelled in the dashboard; spoken openings are natural and identify the AI.
  const src = fs.readFileSync(RELAY, 'utf8');
  ok('voice identifies Insiyab as the AI operations assistant', src.includes('the AI operations assistant'), 'identity missing');
  ok('spoken disclaimer removed at presenter request', !src.includes('Nothing said will be acted on'), 'old wording remains');
  ok('internal demo context remains honest when asked', src.includes('answer honestly that this is a demonstration'), 'context missing');

  // No real-looking secrets in folder
  const folder = path.join(__dirname, '..');
  const files = fs.readdirSync(folder).filter(f => /\.(js|json|html|md|txt|sh|example)$/.test(f)).map(f => path.join(folder, f));
  const testFiles = fs.readdirSync(__dirname).filter(f => /\.js$/.test(f)).map(f => path.join(__dirname, f));
  const allFiles = files.concat(testFiles);
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    ok('no real phone number (+971, +966) in ' + path.basename(file), !/\+9[0-9]{10,}/.test(content), file);
    ok('no real ElevenLabs key pattern in ' + path.basename(file), !/sk_[a-zA-Z0-9]{20,}/.test(content), file);
  }

  fs.unlinkSync(NUMS_FILE);

  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
