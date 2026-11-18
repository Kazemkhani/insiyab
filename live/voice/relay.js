#!/usr/bin/env node
/* Insiyab voice relay. Node 22+, no dependencies.

   This runs the control-centre drill for one bus incident. The team acts it out on their own phones.
   Roles: driver, depot, station (staff) and manager (duty manager).

   Flow:
     1. Incident posted: POST /voice/incident (shared key) or --incident <file.json>
     2. Staff check: driver, depot and station called at the same time; each gives a one-sentence update
        through the insiyab_report tool
     3. Manager call: called with the incident, the staff reports, RTA's dispatch test and the options;
        chooses one through the insiyab_decision tool
     4. Call back: staff called again with the decision; each acknowledges through insiyab_acknowledge

   Three guards must ALL be true for a real call to be placed:
     - ~/.config/insiyab/voice-numbers.txt exists and contains numbers
     - INSIYAB_CALLS=armed in the environment
     - The process was started with --live

   Without all three: rehearsal mode. The relay runs the full flow and prints what it WOULD have said
   to each role. No network call to ElevenLabs or Twilio is made. Numbers are never printed.

   Commands (run from the repo root):
     node live/voice/relay.js                            start the HTTP server (rehearsal unless all guards met)
     node live/voice/relay.js --incident <file.json>     one-shot: post an incident and run the relay, then exit
     node live/voice/relay.js --setup-agents             print and (if armed+live) create the ElevenLabs agents
     node live/voice/relay.js --import-number            check and (if armed+live) import the Twilio number

   GET /voice/state returns event status by role only; no free-text reports or incident details.
   GET /voice/state/authenticated requires the private viewing key for rehearsal details.
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/* ---------- configuration ---------- */

const NUMBERS_FILE = process.env.INSIYAB_NUMBERS_FILE
  || path.join(os.homedir(), '.config', 'insiyab', 'voice-numbers.txt');
const ENV_FILE = process.env.INSIYAB_ENV_FILE
  || path.join(os.homedir(), '.config', 'insiyab', 'voice.env');

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}
const FENV = readEnvFile(ENV_FILE);
const cfg = k => process.env[k] || FENV[k] || '';

const PORT = Number(cfg('VOICE_PORT') || 7890);
const EL_KEY = cfg('ELEVENLABS_API_KEY');
const PHONE_ID = cfg('ELEVENLABS_PHONE_NUMBER_ID');
const VOICE_ID = cfg('ELEVENLABS_VOICE_ID');
const VOICE_MODEL = cfg('ELEVENLABS_VOICE_MODEL') || 'eleven_v4_turbo';
const SHARED_KEY = cfg('VOICE_SHARED_KEY');
const VIEW_KEY = cfg('VOICE_VIEW_KEY');
let PUBLIC_URL = cfg('VOICE_PUBLIC_URL').replace(/\/+$/, '');

/* ---------- guards ---------- */

const guardLive = () => process.argv.includes('--live');
const guardArmed = () => (process.env.INSIYAB_CALLS || FENV.INSIYAB_CALLS || '') === 'armed';
const guardNumbers = () => {
  if (!fs.existsSync(NUMBERS_FILE)) return false;
  return numbers().length > 0;
};
const allGuards = () => guardLive() && guardArmed() && guardNumbers();

/* ---------- numbers file ---------- */

function numbers() {
  if (!fs.existsSync(NUMBERS_FILE)) return [];
  return fs.readFileSync(NUMBERS_FILE, 'utf8').split(/\r?\n/).map(line => {
    const parts = line.trim().split(',');
    if (parts.length < 3) return null;
    const role = parts[0].trim().toLowerCase();
    const name = parts[1].trim();
    const number = parts[2].trim();
    if (!['driver', 'depot', 'station', 'planner', 'manager'].includes(role)) return null;
    if (!/^\+\d{8,15}$/.test(number)) return null;
    return { role, name, number };
  }).filter(Boolean);
}

/* ---------- secrets and logging ---------- */

function liveSecrets() {
  return [EL_KEY, SHARED_KEY, VIEW_KEY, cfg('TWILIO_LIVE_AUTH_TOKEN'), cfg('TWILIO_LIVE_ACCOUNT_SID')].filter(Boolean);
}
const scrub = s => [...liveSecrets(), ...numbers().flatMap(n => [n.name,n.number])].filter(Boolean).reduce((x, k) => x.split(k).join('[redacted]'), String(s)).replace(/\+\d[\d ()-]{7,}\d/g,'[phone redacted]');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), scrub(a.join(' ')));

/* ---------- ElevenLabs API ---------- */

const EL = (p, init = {}) => fetch('https://api.elevenlabs.io' + p, {
  ...init,
  headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
});

/* ---------- state (no numbers, no names) ---------- */

let state = {
  since: null,
  incident: null,
  phase: 'idle',
  reports: {},          // role -> { report, at } or null (null means no answer)
  decision: null,       // { option_key, say, words, at }
  acknowledgements: {}, // role -> { at }
  timeline: [],         // ordered events
};

function resetState(incident) {
  state = {
    since: new Date().toISOString(),
    incident,
    phase: 'idle',
    reports: {},
    decision: null,
    acknowledgements: {},
    timeline: [{ event: 'incident_posted', id: incident.id, route: incident.route, at: new Date().toISOString() }],
  };
}

function addTimeline(event) {
  state.timeline.push(Object.assign({ at: new Date().toISOString() }, event));
}

// Return state stripped of any name or number from the numbers file.
function privateState() {
  const nums = numbers();
  const toRemove = new Set(nums.flatMap(n => [n.name, n.number]).filter(Boolean));
  if (!toRemove.size) return JSON.parse(scrub(JSON.stringify(state)));
  let str = JSON.stringify(state);
  for (const val of toRemove) str = str.split(val).join('[redacted]');
  return JSON.parse(scrub(str));
}

// Public status deliberately contains no free text from people or posted incidents.
function publicState() {
  return {since:state.since,phase:state.phase,outcome:state.outcome||null,
    reports:Object.fromEntries(Object.entries(state.reports).map(([role,r])=>[role,r?{received:true,at:r.at}:null])),
    decision:state.decision?{recorded:true,at:state.decision.at}:null,
    acknowledgements:Object.fromEntries(Object.entries(state.acknowledgements).map(([role,a])=>[role,{at:a.at}])),
    timeline:state.timeline.map(e=>({event:e.event,role:e.role,at:e.at}))};
}

/* ---------- tool handling ---------- */

const TOOL_SECRET = (() => {
  if (!SHARED_KEY) return '';
  return crypto.createHash('sha256').update('insiyab-tool:' + SHARED_KEY).digest('hex').slice(0, 40);
})();

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

const callTokens = new Map();
let callCount = 0;
function handleTool(toolPath, body) {
  const binding = callTokens.get(body.call_token);
  const expectedPhase = {report:'check',decision:'manager',acknowledge:'callout'}[toolPath];
  if (!binding || binding.run !== state.since || binding.phase !== expectedPhase || state.phase !== expectedPhase)
    return {result:'This call is not authorised for the current step. No change was recorded.'};
  if (toolPath !== 'decision' && body.role !== binding.role)
    return {result:'The role does not match this call. No change was recorded.'};
  if (toolPath === 'report') {
    const role = clean(body.role, 20).toLowerCase();
    const report = clean(body.report, 300);
    if (!report) return { result: 'Please say what you see or confirm, then call insiyab_report again.' };
    if (!['driver', 'depot', 'station', 'planner'].includes(role)) return { result: 'Unexpected role. Pass driver, depot, station or planner.' };
    if (state.reports[role]) return {result:'This report is already recorded.'};
    state.reports[role] = { report: scrub(report), at: new Date().toISOString() };
    addTimeline({ event: 'report', role, report: scrub(report) });
    log('report from', role + ':', report);
    return { result: 'Logged. I am briefing the duty manager now. Say goodbye and call end_call.' };
  }
  if (toolPath === 'decision') {
    const option_key = clean(body.option_key, 40);
    const words = clean(body.words || '', 200);
    if (!option_key) return { result: 'Please say which option you choose, then call insiyab_decision again.' };
    const opts = (state.incident && state.incident.options) || [];
    const option = opts.find(o => o.key === option_key);
    if (!option) return {result:'Choose one of the offered option keys. No decision was recorded.'};
    if (state.decision) return {result:'A decision is already recorded and cannot be replaced by this call.'};
    const say = option.say;
    state.decision = { option_key, say, words: scrub(words), at: new Date().toISOString() };
    addTimeline({ event: 'decision', option_key, say, words: scrub(words) });
    log('decision:', option_key, '|', words);
    return { result: 'Recorded: ' + say + (words ? '. ' + words : '') + '. Say goodbye and call end_call.' };
  }
  if (toolPath === 'acknowledge') {
    const role = clean(body.role, 20).toLowerCase();
    if (!['driver', 'depot', 'station', 'planner'].includes(role)) return { result: 'Unexpected role.' };
    state.acknowledgements[role] = { at: new Date().toISOString() };
    addTimeline({ event: 'acknowledged', role });
    log('acknowledged:', role);
    return { result: 'Acknowledged. Say goodbye and call end_call.' };
  }
  return { result: 'Unknown tool.' };
}

/* ---------- agent names and IDs ---------- */

const AGENT_NAMES = {
  driver:  'Insiyab relay: driver check',
  depot:   'Insiyab relay: depot check',
  station: 'Insiyab relay: station check',
  planner: 'Insiyab relay: planner check',
  manager: 'Insiyab relay: manager',
  back:    'Insiyab relay: call back',
};
const AGENTS = {}; // role key -> ElevenLabs agent_id

async function loadAgents() {
  try {
    const list = await EL('/v1/convai/agents?page_size=100').then(r => r.json()).catch(() => ({}));
    for (const [key, name] of Object.entries(AGENT_NAMES)) {
      const found = (list.agents || []).find(a => a.name === name);
      if (found) AGENTS[key] = found.agent_id;
    }
    const missing = Object.keys(AGENT_NAMES).filter(k => !AGENTS[k]);
    if (missing.length) {
      log('agents not ready (' + missing.join(', ') + '). Run --setup-agents first.');
    } else {
      log('agents loaded:', Object.entries(AGENTS).map(([k, v]) => k + '=' + v).join(', '));
    }
  } catch (e) {
    log('could not load agents:', scrub(e.message));
  }
}

/* ---------- tool definitions (for --setup-agents) ---------- */

const CALL_INTRO = 'Hello {{person_name}}, this is Insiyab, the AI operations assistant.';
const DEMO_CONTEXT = 'Internal context: consenting team members are presenting a simulated control-room scenario for the RTA Future Move Hackathon. Keep the conversation natural. Do not announce or repeat a drill disclaimer. If asked, answer honestly that this is a demonstration.';
const STYLE = 'Use call_token {{call_token}} exactly in every tool call. Address the person as {{person_name}}. Style: calm, one short sentence per reply, under 20 words. Never speak stage directions or emotion tags. Never invent details. Reply in the language the person speaks.';
const SAFETY_RULES = `Rules:
- ${DEMO_CONTEXT}
- The agent informs and records. It instructs nobody. It never claims to be RTA.
- If the person reports a real emergency, tell them to call 999 and call end_call.
- If the person is silent twice, say goodbye and call end_call.
- If they decline the drill, say goodbye and call end_call.
- Keep the conversation concise; the system enforces the call duration limit.`;

const INCIDENT_BLOCK = `Incident (from the system):
Route {{route}}, direction {{direction}}, scheduled {{hour}}.
Planned journey: {{planned_minutes}} minutes. Expected now: {{expected_minutes}} minutes.
Currently {{minutes_late_now}} minutes late. Next bus in {{next_bus_in_minutes}} minutes.
Boardings this hour: {{boardings_this_hour}}. Buses running: {{buses_running}} (rule calls for {{buses_needed_by_rule}}).
Source: {{source}}.`;

const AGENT_SPECS = {
  driver: {
    max: 90,
    first: `${CALL_INTRO} For route {{route}}, can the bus continue, and what return delay should the manager plan for?`,
    prompt: `${DEMO_CONTEXT}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the driver of route {{route}}.

${INCIDENT_BLOCK}

${STYLE}

What to do:
- Your opening asked what is holding the driver. Listen.
- Ask at most one follow-up for the most useful detail: where the delay started and whether it is moving.
- Call insiyab_report with a one or two sentence summary in the driver's own words and role "driver".
- Then say "Logged. I am briefing the duty manager now." Say goodbye and call end_call.
- If they cannot say yet, report that with the reason.

${SAFETY_RULES}`,
  },
  depot: {
    max: 90,
    first: `${CALL_INTRO} is a spare bus available for route {{route}}, and what checks or preparation would it need?`,
    prompt: `${DEMO_CONTEXT}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the depot or standby controller.

${INCIDENT_BLOCK}

${STYLE}

What to do:
- Your opening asked whether a standby bus and driver are free and how soon. Listen.
- Ask at most one follow-up for the most useful detail: how many spare buses are ready and the nearest one to route {{route}}.
- Call insiyab_report with a one or two sentence summary in their own words and role "depot".
- Then say "Logged. I am briefing the duty manager now." Say goodbye and call end_call.
- If they cannot say yet, report that with the reason.

${SAFETY_RULES}`,
  },
  station: {
    max: 90,
    first: `${CALL_INTRO} what departure information should passengers receive while the manager considers route {{route}}?`,
    prompt: `${DEMO_CONTEXT}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the station supervisor.

${INCIDENT_BLOCK}

${STYLE}

What to do:
- Your opening asked what departure information passengers need. Listen. Do not infer a waiting-person count from boardings.
- Ask at most one follow-up: whether the departure information needs updating.
- Call insiyab_report with a one or two sentence summary in their own words and role "station".
- Then say "Logged. I am briefing the duty manager now." Say goodbye and call end_call.
- If they cannot say yet, report that with the reason.

${SAFETY_RULES}`,
  },
  planner: {
    max: 90,
    first: `${CALL_INTRO} What does the route {{route}} evidence support, and what still needs checking?`,
    prompt: `${DEMO_CONTEXT}
You are speaking to the planning analyst in a simulated control-room exercise.
${INCIDENT_BLOCK}
Ask for the evidence and its limits. The recorded-day running times are not a live forecast. Do not infer an available spare, seat capacity or passenger count from a timetable. Record what the person says using insiyab_report with role planner.
${STYLE}
${SAFETY_RULES}`,
  },
  manager: {
    max: 150,
    first: `${CALL_INTRO} Route {{route}} needs a decision. May I brief you on the staff reports and options?`,
    prompt: `${DEMO_CONTEXT}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the duty manager.

${INCIDENT_BLOCK}

Private team roster (names and roles only):
{{team_roster}}

Staff reports received just before this call:
{{staff_reports}}

Do not assert a dispatch rule, spare availability or bus capacity unless a staff report confirms it. A manager may choose no action.

Options available:
{{options_text}}

${STYLE}

What to do:
- Your opening asked permission to brief them. If they agree, summarise the reports in at most 45 words, clearly naming missing reports. Explain the available options in plain words without reading option keys. Ask which option they choose. Do not choose for them.
- Accept a clear option name, its number, or "the first/second/third option" as a choice. Record it immediately; do not ask a second confirmation of an unambiguous choice. If unclear, ask one short clarification. Do not infer consent from unrelated words or silence.
- Call insiyab_decision with the option key (send_spare, hold, or none) and any additional words the manager said.
- Then say "Recorded. I will brief the team." Say goodbye and call end_call.
- If the supplied context says this is a single-person sample, say only "Your choice is recorded." Do not promise callbacks.
- If the manager asks a question you cannot answer from the incident, say the system has no more detail on that.

${SAFETY_RULES}`,
  },
  back: {
    max: 90,
    first: `${CALL_INTRO} The duty manager chose: {{decision_text}}. Can you confirm you received that?`,
    prompt: `${DEMO_CONTEXT}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are calling {{staff_role}} back with the duty manager's decision about route {{route}}.

Their earlier report: {{their_report}}

The duty manager's decision: {{decision_text}}

${STYLE}

What to do:
- Your opening passed the decision and asked for confirmation. Listen.
- When they confirm (okay, copy, will do, on it, understood): call insiyab_acknowledge with their role ({{staff_role}}), say "Logged", say goodbye and call end_call.
- If they have a question, answer only from the decision text above.
- If they give a new update or disagree, say it has not been relayed to the manager. Do not acknowledge on their behalf. Ask them to contact the duty manager directly.
- If they say nothing, repeat the decision once; if still nothing, say goodbye and call end_call.

${SAFETY_RULES}`,
  },
};

/* ---------- calls ---------- */

async function callOne(to, variables, agentId) {
  if (++callCount > 9) throw new Error('Rehearsal call limit reached; restart only for an approved new run.');
  const r = await EL('/v1/convai/twilio/outbound-call', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: PHONE_ID,
      to_number: to,
      conversation_initiation_client_data: { dynamic_variables: variables },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) {
    throw new Error('status ' + r.status + ' ' + String(j.message || (j.detail && JSON.stringify(j.detail)) || '').slice(0, 200));
  }
  return { conversation: j.conversation_id || null, sid: j.callSid || j.call_sid || null };
}

const MAX_PARALLEL = 4;
async function placeAll(people, varsFor, agentIdOf, step) {
  const results = new Array(people.length);
  let next = 0;
  async function worker() {
    while (next < people.length) {
      const i = next++;
      const p = people[i];
      const agentId = typeof agentIdOf === 'function' ? agentIdOf(p) : agentIdOf;
      try {
        const call_token = crypto.randomBytes(24).toString('hex');
        callTokens.set(call_token,{role:p.role,phase:state.phase,run:state.since});
        const c = await callOne(p.number, {...varsFor(p),person_name:p.name,staff_role:p.role,call_token}, agentId);
        results[i] = { ok: true, person: p, ...c };
        log(step + ': call placed for', p.role, c.sid || '', c.conversation || '');
      } catch (e) {
        results[i] = { ok: false, person: p, error: scrub(e.message) };
        log(step + ': call failed for', p.role, ':', scrub(e.message));
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, people.length) }, worker));
  return results;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const convStatus = async id => {
  try {
    const j = await EL('/v1/convai/conversations/' + encodeURIComponent(id)).then(r => r.json());
    return j.status || 'unknown';
  } catch (e) { return 'unknown'; }
};
const ENDED = new Set(['processing', 'done', 'failed']);
async function allEnded(ids) {
  const statuses = await Promise.all(ids.map(convStatus));
  return statuses.every(s => ENDED.has(s));
}

// A presenter-only sound check. Reuses the same call, token and decision path;
// it never synthesises staff reports or launches the four callbacks.
async function sampleManager() {
  if (!allGuards()) { log('Manager sample: not armed; no call placed.'); return; }
  if (relayRunning || callCount) throw new Error('A call has already started in this process.');
  const manager = numbers().filter(p => p.role === 'manager');
  if (manager.length !== 1) throw new Error('Exactly one manager is required.');
  if (!PUBLIC_URL) throw new Error('The public callback address is missing. No call placed.');
  const reachable = await fetch(PUBLIC_URL + '/voice/state/authenticated', {
    headers: {'x-insiyab-key': SHARED_KEY}, signal: AbortSignal.timeout(8000),
  });
  if (!reachable.ok) throw new Error('The public callback address is unavailable. No call placed.');
  const remoteState = await reachable.json();
  if (remoteState.phase !== state.phase || remoteState.since !== state.since)
    throw new Error('The public callback address does not match this relay. No call placed.');
  await loadAgents();
  if (!AGENTS.manager) throw new Error('Manager agent is not configured.');
  const incident = JSON.parse(fs.readFileSync(path.join(__dirname, 'incident-example.json'), 'utf8'));
  resetState(incident);
  state.mode = 'manager_sample';
  state.phase = 'manager';
  relayRunning = true;
  try {
    const calls = await placeAll(manager, () => ({...incidentVars(incident),
      staff_reports: 'No staff reports have been collected for this single-person sample. Spare availability is unconfirmed.',
      team_roster: numbers().map(p => p.role + ': ' + p.name).join('; '),
      options_text: incident.options.map((o,i) => `${i+1}. ${o.say} (key: ${o.key})`).join('; ')
    }), AGENTS.manager, 'manager sample');
    const call = calls[0];
    addTimeline({event: call.ok ? 'call_placed' : 'call_failed', role:'manager'});
    if (!call.ok) { state.outcome = 'failed'; return; }
    const end = Date.now() + 180000;
    while (Date.now() < end) {
      await sleep(1500);
      if (call.conversation && await allEnded([call.conversation])) break;
    }
    state.outcome = state.decision ? 'sample_decision_recorded' : 'sample_no_decision';
  } finally { state.phase = 'done'; relayRunning = false; }
}

/* ---------- relay flow ---------- */

let relayRunning = false;

async function startRelay(incident) {
  if (relayRunning) return { skipped: 'A relay is already running.' };
  relayRunning = true;
  if (allGuards() && callCount) { relayRunning=false; return {skipped:'One live rehearsal per process. Restart only when the team is ready for another.'}; }
  resetState(incident);
  callTokens.clear();
  log('relay: incident', incident.id || '', 'route', incident.route, 'at', incident.hour);

  if (!allGuards()) {
    runRehearsal(incident);
    relayRunning = false;
    return { rehearsal: true };
  }

  // Run asynchronously so the HTTP response returns immediately
  runLiveRelay(incident).catch(e => {
    state.outcome='failed'; addTimeline({event:'relay_failed'}); log('relay error:', scrub(e.message));
  }).finally(() => {
    relayRunning = false;
    state.phase = 'done';
    state.outcome ||= state.decision ? 'incomplete' : 'no_decision';
  });

  return { started: true };
}

async function runLiveRelay(incident) {
  const nums = numbers();
  const staff = nums.filter(n => n.role !== 'manager');
  const required = cfg('VOICE_ROSTER_SIZE')==='4' ? ['driver','depot','station','manager'] : ['driver','depot','station','planner','manager'];
  if(required.some(role=>!nums.some(n=>n.role===role)) || nums.length!==required.length){state.outcome='configuration_error';log('relay: incomplete roster; no calls placed');return;}
  const manager = nums.find(n => n.role === 'manager');

  if (nums.filter(n=>n.role==='manager').length !== 1 || new Set(nums.map(n=>n.role)).size !== nums.length || new Set(nums.map(n=>n.number)).size !== nums.length) { state.outcome='configuration_error'; log('relay: use one manager and one distinct person per role'); return; }
  if (!manager) { log('relay: no manager role in numbers file'); return; }
  if (!staff.length) { log('relay: no staff roles in numbers file'); return; }

  const missing = [...new Set([...staff.map(p=>p.role),'manager','back'])].filter(k => !AGENTS[k]);
  if (missing.length) { log('relay: agents not ready (' + missing.join(', ') + '). Run --setup-agents first.'); return; }

  state.phase = 'check';
  const incVars = incidentVars(incident);

  // Step 1: call staff at the same time
  const step1 = await placeAll(
    staff,
    p => ({ ...incVars }),
    p => AGENTS[p.role],
    'staff check',
  );
  for (const r of step1) {
    addTimeline({ event: r.ok ? 'call_placed' : 'call_failed', role: r.person.role });
  }

  // Wait for all staff calls to end or reports to come in (max 3 minutes)
  const ids1 = step1.filter(r => r.ok && r.conversation).map(r => r.conversation);
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    await sleep(2500);
    const allReported = staff.every(s => s.role in state.reports);
    if (allReported) { await sleep(1500); break; }
    if (ids1.length && await allEnded(ids1)) break;
  }

  // Mark no-answers
  for (const s of staff) {
    if (!(s.role in state.reports)) {
      state.reports[s.role] = null;
      addTimeline({ event: 'no_answer', role: s.role });
      log('no answer from', s.role);
    }
  }

  // Build relay report for the manager
  const reported = staff.filter(s => state.reports[s.role]);
  const silent = staff.filter(s => !state.reports[s.role]);

  let staff_reports = reported.map(s => `${s.role}: ${state.reports[s.role].report}`).join(' ');
  if (silent.length) {
    const names = silent.map(s => s.role).join(' and ');
    staff_reports += (staff_reports ? ' ' : '') + names + ' did not answer.';
  }
  if (!staff_reports) staff_reports = 'No staff reports received.';

  const options_text = (incident.options || []).map((o, i) => (i + 1) + '. ' + o.say + ' (key: ' + o.key + ')').join('; ');

  // Step 2: call the manager
  state.phase = 'manager';
  const step2 = await placeAll(
    [manager],
    p => ({ ...incVars, staff_reports, options_text, team_roster: nums.map(n=>n.role+": "+n.name).join("; ") }),
    p => AGENTS.manager,
    'manager',
  );
  for (const r of step2) {
    addTimeline({ event: r.ok ? 'call_placed' : 'call_failed', role: 'manager' });
  }

  const ids2 = step2.filter(r => r.ok && r.conversation).map(r => r.conversation);
  if (!ids2.length) { state.phase = 'done'; return; }

  // Wait for decision or manager call to end (max 5 minutes)
  const t1 = Date.now();
  while (Date.now() - t1 < 300000) {
    await sleep(3000);
    if (state.decision) { await sleep(1500); break; }
    if (await allEnded(ids2)) break;
  }

  if (!state.decision) { state.phase = 'done'; log('relay: done, no decision logged'); return; }

  // Step 3: call back staff who reported
  state.phase = 'callout';
  const decisionText = state.decision.say + (state.decision.words ? '. ' + state.decision.words : '');

  const toCallBack = reported.length ? reported : staff;
  const step3 = await placeAll(
    toCallBack,
    p => ({
      ...incVars,
      staff_role: p.role,
      decision_text: decisionText,
      their_report: (state.reports[p.role] && state.reports[p.role].report) ? state.reports[p.role].report : 'no update from you yet',
    }),
    p => AGENTS.back,
    'call back',
  );
  for (const r of step3) {
    addTimeline({ event: r.ok ? 'callout_placed' : 'callout_failed', role: r.person.role });
  }

  const ids3 = step3.filter(r => r.ok && r.conversation).map(r => r.conversation);
  const calledBackRoles = toCallBack.map(p => p.role);
  const t2 = Date.now();
  while (ids3.length && Date.now() - t2 < 180000) {
    await sleep(2500);
    // Exit early if all call-back roles have acknowledged
    const allAcked = calledBackRoles.every(r => state.acknowledgements[r]);
    if (allAcked) { await sleep(500); break; }
    if (await allEnded(ids3)) break;
  }

  state.phase = 'done';
  state.outcome=calledBackRoles.every(r=>state.acknowledgements[r]) && staff.every(r=>state.reports[r.role]) ? 'complete' : 'incomplete';
  log('relay:', state.outcome);
}

function incidentVars(incident) {
  return {
    route:               clean(String(incident.route || ''), 20),
    direction:           clean(String(incident.direction || ''), 10),
    hour:                clean(String(incident.hour || ''), 10),
    planned_minutes:     String(incident.planned_minutes || ''),
    expected_minutes:    String(incident.expected_minutes || ''),
    minutes_late_now:    String(incident.minutes_late_now || ''),
    next_bus_in_minutes: String(incident.next_bus_in_minutes || ''),
    boardings_this_hour: String(incident.boardings_this_hour || ''),
    buses_running:       String(incident.buses_running || ''),
    buses_needed_by_rule: String(incident.buses_needed_by_rule || ''),
    source:              clean(String(incident.source || ''), 200),
  };
}

/* ---------- rehearsal mode ---------- */

function runRehearsal(incident) {
  console.log('\nREHEARSAL - RTA Future Move Hackathon. Guards not all met. No calls will be made.');
  const reasons = [
    !guardLive()    && 'process not started with --live',
    !guardArmed()   && 'INSIYAB_CALLS is not set to "armed"',
    !guardNumbers() && NUMBERS_FILE + ' does not exist or has no valid entries',
  ].filter(Boolean);
  if (reasons.length) console.log('Missing:', reasons.join('; '));
  console.log();

  const v = incidentVars(incident);
  console.log('Incident: route ' + v.route + ', direction ' + v.direction + ', ' + v.hour);
  console.log('  Planned: ' + v.planned_minutes + ' min, expected: ' + v.expected_minutes + ' min, late: ' + v.minutes_late_now + ' min');
  console.log('  Boardings: ' + v.boardings_this_hour + ', buses running: ' + v.buses_running + '/' + v.buses_needed_by_rule);
  console.log();

  const renderFirst = (role,extra={}) => AGENT_SPECS[role].first.replace(/{{(\w+)}}/g,(_,key)=>String(({...v,person_name:role,...extra})[key] || '['+key+']'));
  const roleMessages = Object.fromEntries(['driver','depot','station','planner'].map(role=>[role,renderFirst(role)]));
  const managerMsg = renderFirst('manager');

  console.log('Step 1 - Would call each staff role at the same time:');
  for (const [role, msg] of Object.entries(roleMessages)) {
    console.log('  ' + role.toUpperCase() + ': "' + msg + '"');
    console.log();
  }

  console.log('Step 2 - Would call MANAGER (after staff reports):');
  console.log('  MANAGER: "' + managerMsg + '"');
  console.log();

  const decisionExample = incident.options && incident.options[0]
    ? incident.options[0].say
    : 'the manager\'s decision';
  console.log('Step 3 - Would call back each staff role with the decision:');
  console.log('  ALL FOUR STAFF: ' + renderFirst('back',{decision_text:decisionExample}));
  console.log();
  console.log('END REHEARSAL');
}

/* ---------- --setup-agents ---------- */

async function setupAgents() {
  const armed = guardArmed() && guardLive();
  if (!armed) {
    console.log('\nSETUP AGENTS (dry run - set INSIYAB_CALLS=armed and pass --live to create):');
  } else {
    console.log('\nSETUP AGENTS (armed - creating in ElevenLabs):');
  }

  if (!VOICE_ID) {
    console.log('  Warning: ELEVENLABS_VOICE_ID is not set. Agents will use the ElevenLabs account default voice.');
  }

  for (const [key, spec] of Object.entries(AGENT_SPECS)) {
    const name = AGENT_NAMES[key];
    const vars = [...new Set((spec.first + spec.prompt).match(/{{\s*\w+\s*}}/g) || [])].map(v => v.replace(/[{}\s]/g, ''));
    console.log('  ' + name + ' (max ' + spec.max + 's, vars: ' + vars.join(', ') + ')');

    if (!armed) continue;

    if (!EL_KEY) { console.log('  Error: ELEVENLABS_API_KEY is not set'); return; }
    if (!PUBLIC_URL) { console.log('  Error: VOICE_PUBLIC_URL is not set - tools need a webhook URL'); return; }

    // Ensure tools exist
    const toolIds = await ensureTools();

    // Build conversation config
    const toolNames = ['driver','depot','station','planner'].includes(key)
      ? ['insiyab_report']
      : key === 'manager'
      ? ['insiyab_decision']
      : ['insiyab_acknowledge'];

    const placeholders = Object.fromEntries(vars.map(v => [v, 'not given']));
    const cc = {
      agent: {
        first_message: spec.first,
        prompt: {
          prompt: spec.prompt,
          tool_ids: toolNames.map(n => toolIds[n]).filter(Boolean),
        },
        dynamic_variables: { dynamic_variable_placeholders: placeholders },
      },
      conversation: { max_duration_seconds: spec.max },
    };
    if (VOICE_ID) {
      cc.tts = { voice_id: VOICE_ID, model_id: VOICE_MODEL };
    }

    const list = await EL('/v1/convai/agents?page_size=100').then(r => r.json()).catch(() => ({}));
    const existing = (list.agents || []).find(a => a.name === name);

    const r = await EL(
      existing ? '/v1/convai/agents/' + existing.agent_id : '/v1/convai/agents/create',
      { method: existing ? 'PATCH' : 'POST', body: JSON.stringify({ name, conversation_config: cc }) },
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.log('  Error creating ' + name + ':', r.status, scrub(JSON.stringify(j)).slice(0, 200)); continue; }
    const id = j.agent_id || (existing && existing.agent_id);
    console.log('  ' + (existing ? 'Updated' : 'Created') + ': ' + name + ' (' + id + ')');
  }
}

async function ensureTools() {
  const toolDefs = [
    { name: 'insiyab_report', path: 'report',
      description: 'Log a one or two sentence update from a staff member (driver, depot, station or planner). Call this once you have their answer. Pass a summary in their own words and their role.',
      props: { report: { type: 'string', description: 'One or two sentences: what they see or confirm, in their words' }, role: { type: 'string', description: 'Their role: driver, depot, station or planner' } },
      required: ['report', 'role'] },
    { name: 'insiyab_decision', path: 'decision',
      description: 'Log the duty manager\'s choice. Pass the option key (send_spare, hold, or none) and any additional words they said.',
      props: { option_key: { type: 'string', description: 'The key of the chosen option: send_spare, hold, or none' }, words: { type: 'string', description: 'Any additional words the manager said' } },
      required: ['option_key'] },
    { name: 'insiyab_acknowledge', path: 'acknowledge',
      description: 'Log a staff acknowledgement of the call back. Pass their role.',
      props: { role: { type: 'string', description: 'Their role: driver, depot, station or planner' } },
      required: ['role'] },
  ];

  const list = await EL('/v1/convai/tools').then(r => r.json()).catch(() => ({}));
  const have = new Map((list.tools || []).map(t => [t.tool_config && t.tool_config.name, t.id]));
  const byName = {};

  for (const t of toolDefs) {
    const tool_config = {
      type: 'webhook',
      name: t.name,
      description: t.description,
      response_timeout_secs: 10,
      pre_tool_speech: 'force',
      api_schema: {
        url: PUBLIC_URL + '/voice/tool/' + t.path,
        method: 'POST',
        request_headers: { 'x-insiyab-tool': TOOL_SECRET },
        request_body_schema: { type: 'object', description: t.description, properties: {...t.props, call_token:{type:'string',description:'Use the exact call_token provided for this conversation.'}}, required: [...t.required,'call_token'] },
      },
    };
    const id = have.get(t.name);
    const r = await EL(id ? '/v1/convai/tools/' + id : '/v1/convai/tools', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify({ tool_config }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('tool ' + t.name + ': ' + r.status + ' ' + scrub(JSON.stringify(j)).slice(0, 200));
    byName[t.name] = j.id || id;
  }
  return byName;
}

/* ---------- --import-number ---------- */

async function importNumber() {
  const armed = guardArmed() && guardLive();
  const sid = cfg('TWILIO_LIVE_ACCOUNT_SID');
  const token = cfg('TWILIO_LIVE_AUTH_TOKEN');

  if (!sid || !token) {
    console.log('Import: set TWILIO_LIVE_ACCOUNT_SID and TWILIO_LIVE_AUTH_TOKEN in voice.env first.');
    if (!armed) console.log('Also pass --live and set INSIYAB_CALLS=armed to run the import.');
    return;
  }

  // Always print current status first
  if (PHONE_ID) {
    try {
      const j = await EL('/v1/convai/phone-numbers/' + PHONE_ID).then(r => r.json()).catch(() => ({}));
      const webhook = j.twilio_number && j.twilio_number.voice_url;
      console.log('Current voice webhook: ' + (webhook ? 'set to ' + webhook : 'not set'));
    } catch (e) {
      console.log('Could not read current phone number status.');
    }
  } else {
    console.log('ELEVENLABS_PHONE_NUMBER_ID is not set (number not yet imported).');
  }

  if (!armed) {
    console.log('Dry run. Set INSIYAB_CALLS=armed and pass --live to run the import. Importing replaces the current voice webhook.');
    return;
  }

  const auth = 'Basic ' + Buffer.from(sid + ':' + token).toString('base64');
  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/IncomingPhoneNumbers.json', { headers: { Authorization: auth } });
  const j = await r.json().catch(() => ({}));
  const owned = (j.incoming_phone_numbers || []).filter(n => !n.capabilities || n.capabilities.voice).map(n => n.phone_number);
  if (!owned.length) { console.error('Import: this Twilio account owns no voice number. Buy one in the Twilio console first.'); return; }
  const number = owned[0];
  console.log('Importing Twilio number (last 2 digits: ...' + number.slice(-2) + ')');
  console.log('Importing replaces the current voice webhook.');

  const ir = await EL('/v1/convai/phone-numbers', { method: 'POST', body: JSON.stringify({ phone_number: number, label: 'Insiyab Twilio', sid, token, provider: 'twilio' }) });
  const ij = await ir.json().catch(() => ({}));
  if (!ir.ok || !ij.phone_number_id) { console.error('Import failed:', ir.status, scrub(JSON.stringify(ij)).slice(0, 300)); return; }
  fs.appendFileSync(ENV_FILE, '\nELEVENLABS_PHONE_NUMBER_ID=' + ij.phone_number_id + '\n');
  console.log('Imported. ELEVENLABS_PHONE_NUMBER_ID written to voice.env:', ij.phone_number_id);
}

/* ---------- HTTP server ---------- */

const readBody = (req, max) => new Promise((ok, no) => {
  let n = 0;
  const parts = [];
  req.on('data', d => { n += d.length; if (n > max) { no(new Error('too large')); req.destroy(); } else parts.push(d); });
  req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
  req.on('error', no);
});
const send = (res, status, type, body, extra) => { res.writeHead(status, Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store' }, extra || {})); res.end(body); };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'x-insiyab-key, x-insiyab-view, content-type' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if(req.method==='GET' && (p==='/' || p==='/voice/')) return send(res,200,'text/html; charset=utf-8',fs.readFileSync(path.join(__dirname,'console.html')));
    // POST /voice/incident - start the relay
    if (req.method === 'POST' && p === '/voice/incident') {
      const got = Buffer.from(String(req.headers['x-insiyab-key'] || ''));
      const want = Buffer.from(SHARED_KEY);
      if (!SHARED_KEY || SHARED_KEY.length < 24 || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
        return send(res, 403, 'application/json', '{"error":"forbidden"}');
      }
      let body;
      try { body = JSON.parse(await readBody(req, 8000)); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad request"}'); }
      if (!body || body.drill !== true || !body.route || !Array.isArray(body.options) || body.options.length < 1) return send(res, 400, 'application/json', '{"error":"incident must be a drill with a route and options"}');
      const result = await startRelay(body);
      return send(res, 200, 'application/json', JSON.stringify(result));
    }

    // OPTIONS preflight for the console (CORS)
    if (req.method === 'OPTIONS' && ['/voice/state','/voice/state/authenticated'].includes(p)) {
      return send(res, 204, 'text/plain', '', cors);
    }

    // GET /voice/state - unauthenticated, CORS open; state has no numbers or names by design
    if (req.method === 'GET' && p === '/voice/state') {
      return send(res, 200, 'application/json', JSON.stringify(publicState()), cors);
    }

    // Authenticated view; the viewing key cannot start calls.
    if (req.method === 'GET' && p === '/voice/state/authenticated') {
      const view=String(req.headers['x-insiyab-view']||'');
      const admin=String(req.headers['x-insiyab-key']||'');
      const equal=(a,b)=>b.length>=24 && Buffer.byteLength(a)===Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
      if (!equal(view,VIEW_KEY) && !equal(admin,SHARED_KEY)) return send(res,403,'application/json','{"error":"forbidden"}',cors);
      return send(res,200,'application/json',JSON.stringify(privateState()),cors);
    }

    // POST /voice/tool/:name - ElevenLabs webhook tool calls
    const tm = req.method === 'POST' && p.match(/^\/voice\/tool\/(report|decision|acknowledge)$/);
    if (tm) {
      const got = Buffer.from(String(req.headers['x-insiyab-tool'] || ''));
      const want = Buffer.from(TOOL_SECRET);
      if (!TOOL_SECRET || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
        return send(res, 403, 'text/plain', 'Forbidden.');
      }
      let b = {};
      try { b = JSON.parse(await readBody(req, 4000) || '{}'); } catch (e) { /* empty */ }
      return send(res, 200, 'application/json', JSON.stringify(handleTool(tm[1], b)));
    }

    send(res, 404, 'text/plain', 'Not found.');
  } catch (e) {
    log('error', p, String(e.message).slice(0, 120));
    if (!res.headersSent) send(res, 500, 'text/plain', 'Server error.');
  }
});

/* ---------- entry points ---------- */

if (process.argv.includes('--setup-agents')) {
  setupAgents().catch(e => { console.error('setup-agents:', scrub(e.message)); process.exit(1); });
} else if (process.argv.includes('--import-number')) {
  importNumber().catch(e => { console.error('import-number:', scrub(e.message)); process.exit(1); });
} else {
  const incidentFlag = process.argv.indexOf('--incident');
  if (incidentFlag !== -1) {
    // One-shot mode: load incident from file, run relay, exit
    const file = process.argv[incidentFlag + 1];
    if (!file) { console.error('--incident requires a file path'); process.exit(1); }
    let incident;
    try { incident = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Could not read incident file:', e.message); process.exit(1); }
    if (!allGuards()) {
      runRehearsal(incident);
    } else {
      if (!EL_KEY) { console.error('ELEVENLABS_API_KEY is not set'); process.exit(1); }
      loadAgents().then(() => runLiveRelay(incident)).then(() => { log('done'); process.exit(0); }).catch(e => { console.error(scrub(e.message)); process.exit(1); });
    }
  } else {
    // Server mode
    const missing = [
      !SHARED_KEY && 'VOICE_SHARED_KEY',
    ].filter(Boolean);
    if (missing.length && allGuards()) {
      console.error('Set in voice.env:', missing.join(', '));
      process.exit(1);
    }
    server.listen(PORT, '127.0.0.1', () => {
      log('Insiyab voice relay on http://127.0.0.1:' + PORT + '/' + (allGuards() ? ' ARMED' : ' rehearsal mode'));
      if (process.argv.includes('--sample-manager')) sampleManager().catch(e => {state.outcome='sample_failed';state.phase='done';log('manager sample failed:', scrub(e.message));});
      else if (allGuards() && EL_KEY) loadAgents().catch(e => log('could not load agents:', scrub(e.message)));
    });
  }
}
