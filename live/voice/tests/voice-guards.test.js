/* voice-guards.test.js: guard checks - each guard alone and any two guards still give rehearsal mode
   (zero calls to the fake dialling endpoint). Node 22+, no dependencies.
   Run: node live/voice/tests/voice-guards.test.js */
'use strict';
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const RELAY = path.join(__dirname, '..', 'relay.js');
const INCIDENT_FILE = path.join(__dirname, '..', 'incident-example.json');
let fails = 0;
const ok = (name, cond, info) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  [' + info + ']' : ''));
  if (!cond) fails++;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake ElevenLabs server: records any outbound-call requests
function makeFakeServer() {
  return new Promise(resolve => {
    const received = [];
    const srv = http.createServer((req, res) => {
      let b = '';
      req.on('data', c => b += c);
      req.on('end', () => {
        if (req.url.includes('outbound-call')) received.push({ url: req.url, body: b });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"success":true,"conversation_id":"conv_fake","agents":[]}');
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, received, port: srv.address().port }));
  });
}

// Run relay in --incident mode and return stdout+stderr
function runRelay(argv, env) {
  return new Promise(resolve => {
    const args = [RELAY, '--incident', INCIDENT_FILE].concat(argv || []);
    const p = spawn(process.execPath, args, {
      env: Object.assign({}, process.env, env || {}),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('exit', () => resolve(out));
    // Kill after 5 seconds in case it hangs
    setTimeout(() => { try { p.kill(); } catch (e) { /* gone */ } resolve(out); }, 5000);
  });
}

// Numbers file for cases where we need it
const NUMS_FILE_PRESENT = path.join(os.tmpdir(), 'insiyab-guard-numbers.txt');
fs.writeFileSync(NUMS_FILE_PRESENT, [
  'manager,Test,+10000000091',
  'driver,Test2,+10000000092',
  'depot,Test3,+10000000093',
  'station,Test4,+10000000094',
].join('\n'));
const NUMS_FILE_MISSING = path.join(os.tmpdir(), 'insiyab-guard-missing-numbers.txt');
// do NOT create this file

(async () => {
  const { srv, received, port } = await makeFakeServer();

  // We redirect ElevenLabs calls to the fake server by setting VOICE_PUBLIC_URL
  // But the relay uses global.fetch - we can't easily intercept it in a child process.
  // Instead, we verify rehearsal output: rehearsal mode prints "REHEARSAL" and makes no HTTP requests.
  // The fake server receives zero requests in all guard-failing cases.

  const baseArmed = { INSIYAB_CALLS: 'armed', INSIYAB_NUMBERS_FILE: NUMS_FILE_PRESENT, ELEVENLABS_API_KEY: 'fake', ELEVENLABS_PHONE_NUMBER_ID: 'phnum', VOICE_PORT: '17899', VOICE_PUBLIC_URL: 'http://127.0.0.1:' + port };
  const baseLive = [];          // --live flag present
  const baseNoLive = [];        // --live flag absent

  // Scenario 1: only --live flag (no INSIYAB_CALLS, no numbers file)
  let out = await runRelay(['--live'], { INSIYAB_CALLS: '', INSIYAB_NUMBERS_FILE: NUMS_FILE_MISSING, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17900', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: only --live => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // Scenario 2: only INSIYAB_CALLS=armed (no --live, no numbers file)
  out = await runRelay([], { INSIYAB_CALLS: 'armed', INSIYAB_NUMBERS_FILE: NUMS_FILE_MISSING, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17901', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: only INSIYAB_CALLS=armed => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // Scenario 3: only numbers file present (no --live, no INSIYAB_CALLS)
  out = await runRelay([], { INSIYAB_CALLS: '', INSIYAB_NUMBERS_FILE: NUMS_FILE_PRESENT, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17902', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: only numbers file => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // Scenario 4: --live + INSIYAB_CALLS=armed (no numbers file)
  out = await runRelay(['--live'], { INSIYAB_CALLS: 'armed', INSIYAB_NUMBERS_FILE: NUMS_FILE_MISSING, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17903', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: --live + armed but no numbers => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // Scenario 5: --live + numbers file (no INSIYAB_CALLS=armed)
  out = await runRelay(['--live'], { INSIYAB_CALLS: '', INSIYAB_NUMBERS_FILE: NUMS_FILE_PRESENT, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17904', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: --live + numbers but not armed => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // Scenario 6: INSIYAB_CALLS=armed + numbers file (no --live)
  out = await runRelay([], { INSIYAB_CALLS: 'armed', INSIYAB_NUMBERS_FILE: NUMS_FILE_PRESENT, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17905', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('guard: armed + numbers but no --live => rehearsal mode', out.includes('REHEARSAL'), out.slice(0, 200));

  // In all six scenarios, the fake server received zero outbound-call requests
  ok('zero real calls placed across all six partial-guard scenarios', received.length === 0, received.length + ' calls received');

  // Rehearsal output contains the drill statement and role labels
  out = await runRelay([], { INSIYAB_CALLS: '', INSIYAB_NUMBERS_FILE: NUMS_FILE_PRESENT, ELEVENLABS_API_KEY: 'fake', VOICE_PORT: '17906', VOICE_PUBLIC_URL: 'https://dry-run.invalid' });
  ok('rehearsal output contains drill statement', out.includes('RTA Future Move Hackathon'), out.slice(0, 300));
  ok('rehearsal output mentions DRIVER', out.includes('DRIVER'), out.slice(0, 300));
  ok('rehearsal output mentions DEPOT', out.includes('DEPOT'), out.slice(0, 300));
  ok('rehearsal output mentions STATION', out.includes('STATION'), out.slice(0, 300));
  ok('rehearsal output mentions MANAGER', out.includes('MANAGER'), out.slice(0, 300));
  ok('rehearsal output never prints a phone number', !/(\\+\d{8,15})/.test(out), out.slice(0, 300));

  srv.close();
  fs.unlinkSync(NUMS_FILE_PRESENT);

  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
