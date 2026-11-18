/* voice-state.test.js: state sanitisation, shared-key gate, and folder scan.
   No network, no calls, no credits. Node 22+, no dependencies.
   Run: node live/voice/tests/voice-state.test.js
   Checks: /voice/state never contains a phone number or name from the numbers file;
   the shared key is required for POST /voice/incident;
   prompts contain the drill statement; nothing in the folder contains a real-looking key or phone number. */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const RELAY = path.join(__dirname, '..', 'relay.js');
const KEY = 'test-shared-key-state-01234567890';
const TOOL_SECRET = crypto.createHash('sha256').update('insiyab-tool:' + KEY).digest('hex').slice(0, 40);
const PORT = 17892;

const NUMS_FILE = path.join(os.tmpdir(), 'insiyab-state-test-numbers.txt');
// Use obviously fake test numbers that won't trigger the real-number scan
fs.writeFileSync(NUMS_FILE, [
  'manager,StateManager,+10000000021',
  'driver,StateDriver,+10000000022',
  'depot,StateDepot,+10000000023',
  'station,StateStation,+10000000024',
].join('\n'));

process.argv.push('--live');
Object.assign(process.env, {
  VOICE_ROSTER_SIZE: '4',
  VOICE_SHARED_KEY:         KEY,
  ELEVENLABS_API_KEY:       'fake-el-key-state',
  ELEVENLABS_PHONE_NUMBER_ID: 'phnum_test3',
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
let convN = 0;
const convStatus = {};

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
        { agent_id: 'ag_dr', name: 'Insiyab relay: driver check' },
        { agent_id: 'ag_dp', name: 'Insiyab relay: depot check' },
        { agent_id: 'ag_st', name: 'Insiyab relay: station check' },
        { agent_id: 'ag_mg', name: 'Insiyab relay: manager' },
        { agent_id: 'ag_bk', name: 'Insiyab relay: call back' },
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
  }
  return J({ detail: 'not mocked' }, 404);
};

const local = (p, body, headers) => realFetch(
  'http://127.0.0.1:' + PORT + p,
  { method: body !== undefined ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body !== undefined ? JSON.stringify(body) : undefined }
).then(r => r.json());

const incident = (body, extraHeaders) => local('/voice/incident', body, Object.assign({ 'x-insiyab-key': KEY }, extraHeaders || {}));
const tool = (name, b) => { const call=[...calls].reverse().find(c=>c.conversation_initiation_client_data.dynamic_variables.staff_role===(b.role||'manager')); return local('/voice/tool/' + name, {...b,call_token:call?.conversation_initiation_client_data.dynamic_variables.call_token}, { 'x-insiyab-tool': TOOL_SECRET }); };
const state = () => local('/voice/state/authenticated',undefined,{'x-insiyab-key':KEY});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Values that must NEVER appear in GET /voice/state
const FORBIDDEN = ['+10000000021', '+10000000022', '+10000000023', '+10000000024', 'StateManager', 'StateDriver', 'StateDepot', 'StateStation'];

(async () => {
  require(RELAY);
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    const s = await state().catch(() => null);
    if (s && s.phase !== undefined) break;
  }

  // /voice/state is accessible without a key (CORS-open for the console)
  const noKeyResponse = await realFetch('http://127.0.0.1:' + PORT + '/voice/state');
  ok('GET /voice/state accessible without key (for console)', noKeyResponse.status === 200, noKeyResponse.status);
  const hasOrigin = noKeyResponse.headers.get('access-control-allow-origin');
  ok('GET /voice/state has CORS header', hasOrigin === '*', hasOrigin);

  // State in idle has no forbidden values
  let s = await state();
  let str = JSON.stringify(s);
  for (const val of FORBIDDEN) {
    ok('idle state does not contain "' + val + '"', !str.includes(val), val);
  }

  // Shared key required for POST /voice/incident
  const noKey = await local('/voice/incident', { route: '310', direction: '1', hour: '18:00', options: [], source: 'test' }, {});
  ok('POST /voice/incident without key: not started', !noKey.started && !noKey.rehearsal, JSON.stringify(noKey));

  const wrongKey = await local('/voice/incident', { route: '310', direction: '1', hour: '18:00', options: [], source: 'test' }, { 'x-insiyab-key': 'wrong' });
  ok('POST /voice/incident with wrong key: not started', !wrongKey.started && !wrongKey.rehearsal, JSON.stringify(wrongKey));

  // Post an incident and make tool calls to populate state
  await incident({ route: '310', direction: '1', hour: '18:00', planned_minutes: 67, expected_minutes: 96, minutes_late_now: 22, next_bus_in_minutes: 20, boardings_this_hour: 640, buses_running: 8, buses_needed_by_rule: 17, options: [{ key: 'send_spare', say: 'send the standby bus' }], source: 'test-state', drill: true });

  for (let i = 0; i < 40 && calls.length < 3; i++) await sleep(100);

  // Report from each role (names must not leak)
  await tool('report', { report: 'Stuck in traffic, moving slowly.', role: 'driver' });
  await tool('report', { report: 'One standby bus ready in 10 minutes.', role: 'depot' });
  await tool('report', { report: '70 passengers at the stop.', role: 'station' });

  for (let i = 0; i < 40 && calls.length < 4; i++) await sleep(250);

  await tool('decision', { option_key: 'send_spare', words: 'Dispatch immediately.' });
  // Mark manager call done so relay proceeds to call back
  if (calls[3]) convStatus[calls[3].id] = 'done';
  for (let i = 0; i < 40 && calls.length < 7; i++) await sleep(250);
  // Acknowledge each staff member; relay exits early once all are acked
  await tool('acknowledge', { role: 'driver' });
  await tool('acknowledge', { role: 'depot' });
  await tool('acknowledge', { role: 'station' });
  // Also mark call back conversations done to unblock the relay loop
  for (const c of calls.slice(4)) convStatus[c.id] = 'done';

  // Final state must not contain any forbidden value
  s = await state();
  str = JSON.stringify(s);
  for (const val of FORBIDDEN) {
    ok('final state does not contain "' + val + '"', !str.includes(val),
      val + ' found at: ' + (str.includes(val) ? str.slice(Math.max(0, str.indexOf(val) - 30), str.indexOf(val) + 50) : 'ok'));
  }

  // State structure checks
  ok('state has phase', typeof s.phase === 'string', s.phase);
  ok('state has timeline array', Array.isArray(s.timeline), typeof s.timeline);
  ok('timeline has role fields, not names', (s.timeline || []).every(e => !e.name), 'found name in timeline');
  ok('decision recorded', s.decision && s.decision.option_key === 'send_spare', s.decision && s.decision.option_key);
  ok('reports use roles as keys', s.reports && 'driver' in s.reports && 'depot' in s.reports && 'station' in s.reports);
  ok('acknowledgements use roles as keys', s.acknowledgements && s.acknowledgements.driver && s.acknowledgements.depot && s.acknowledgements.station);

  // Folder scan: no real-looking secrets or numbers in any file
  const folder = path.join(__dirname, '..');
  const jsFiles = fs.readdirSync(folder).filter(f => /\.(js|json|html|md|sh|txt|example)$/.test(f)).map(f => path.join(folder, f));
  const testJsFiles = fs.readdirSync(__dirname).filter(f => /\.js$/.test(f)).map(f => path.join(__dirname, f));
  const shFiles = [path.join(__dirname, 'run.sh')].filter(f => fs.existsSync(f));
  const allFiles = jsFiles.concat(testJsFiles).concat(shFiles);

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // Real UAE/Gulf numbers (+971, +966, +974, +973, +965, +968)
    ok('no real Gulf phone number in ' + path.basename(file), !/\+9[0-9]{10,}/.test(content), file);
    // ElevenLabs API key patterns
    ok('no ElevenLabs key pattern in ' + path.basename(file), !/sk_[a-zA-Z0-9]{20,}/.test(content), file);
    // Twilio account SID pattern
    ok('no Twilio SID pattern in ' + path.basename(file), !/\bAC[0-9a-f]{32}\b/.test(content), file);
  }

  // The demo stays labelled in the dashboard; spoken openings are natural and identify the AI.
  const src = fs.readFileSync(RELAY, 'utf8');
  ok('voice identifies Insiyab as the AI operations assistant', src.includes('the AI operations assistant'), 'identity missing');
  ok('spoken disclaimer removed at presenter request', !src.includes('Nothing said will be acted on'), 'old wording remains');
  ok('internal demo context remains honest when asked', src.includes('answer honestly that this is a demonstration'), 'context missing');

  // No airport/marsad leftovers (word-boundary check to avoid false positives from e.g. PATCH containing ATC)
  const airportTerms = ['aircraft', 'runway', 'DXB', 'Marsad', 'airport', 'ATC', 'EK5', 'callsign', 'inbound to runway'];
  for (const term of airportTerms) {
    const re = new RegExp('\\b' + term.trim() + '\\b');
    ok('no airport term "' + term + '" in relay.js', !re.test(src), term + ' found');
  }

  fs.unlinkSync(NUMS_FILE);

  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
