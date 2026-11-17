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

   GET /voice/state  returns the timeline by ROLE: who was called, what was reported, the decision,
                     timestamps. No phone number and no name from the numbers file appears in the response.
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
    if (!['driver', 'depot', 'station', 'manager'].includes(role)) return null;
    if (!/^\+\d{8,15}$/.test(number)) return null;
    return { role, name, number };
  }).filter(Boolean);
}

/* ---------- secrets and logging ---------- */

function liveSecrets() {
  return [EL_KEY, SHARED_KEY, cfg('TWILIO_LIVE_AUTH_TOKEN'), cfg('TWILIO_LIVE_ACCOUNT_SID')].filter(Boolean);
}
const scrub = s => liveSecrets().reduce((x, k) => x.split(k).join('[redacted]'), String(s));
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
function publicState() {
  const nums = numbers();
  const toRemove = new Set(nums.flatMap(n => [n.name, n.number]).filter(Boolean));
  if (!toRemove.size) return state;
  let str = JSON.stringify(state);
  for (const val of toRemove) str = str.split(val).join('[redacted]');
  return JSON.parse(str);
}

/* ---------- tool handling ---------- */

const TOOL_SECRET = (() => {
  if (!SHARED_KEY) return '';
  return crypto.createHash('sha256').update('insiyab-tool:' + SHARED_KEY).digest('hex').slice(0, 40);
})();

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

function handleTool(toolPath, body) {
  if (toolPath === 'report') {
    const role = clean(body.role, 20).toLowerCase();
    const report = clean(body.report, 300);
    if (!report) return { result: 'Please say what you see or confirm, then call insiyab_report again.' };
    if (!['driver', 'depot', 'station'].includes(role)) return { result: 'Unexpected role. Pass driver, depot or station.' };
    state.reports[role] = { report, at: new Date().toISOString() };
    addTimeline({ event: 'report', role, report });
    log('report from', role + ':', report);
    return { result: 'Logged. I am briefing the duty manager now. Say goodbye and call end_call.' };
  }
  if (toolPath === 'decision') {
    const option_key = clean(body.option_key, 40);
    const words = clean(body.words || '', 200);
    if (!option_key) return { result: 'Please say which option you choose, then call insiyab_decision again.' };
    const opts = (state.incident && state.incident.options) || [];
    const option = opts.find(o => o.key === option_key);
    const say = option ? option.say : option_key;
    state.decision = { option_key, say, words, at: new Date().toISOString() };
    addTimeline({ event: 'decision', option_key, say, words });
    log('decision:', option_key, '|', words);
    return { result: 'Recorded: ' + say + (words ? '. ' + words : '') + '. Say goodbye and call end_call.' };
  }
  if (toolPath === 'acknowledge') {
    const role = clean(body.role, 20).toLowerCase();
    if (!['driver', 'depot', 'station'].includes(role)) return { result: 'Unexpected role.' };
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

const DRILL_PREFIX = 'This is a drill by a student team for the RTA Future Move Hackathon. Nothing said will be acted on.';
const STYLE = 'Style: calm, one short sentence per reply, under 20 words. Never invent details. Reply in the language the person speaks.';
const SAFETY_RULES = `Rules:
- ${DRILL_PREFIX}
- The agent informs and records. It instructs nobody. It never claims to be RTA.
- If the person reports a real emergency, tell them to call 999 and call end_call.
- If the person is silent twice, say goodbye and call end_call.
- Calls are capped at 90 seconds.`;

const INCIDENT_BLOCK = `Incident (from the system):
Route {{route}}, direction {{direction}}, scheduled {{hour}}.
Planned journey: {{planned_minutes}} minutes. Expected now: {{expected_minutes}} minutes.
Currently {{minutes_late_now}} minutes late. Next bus in {{next_bus_in_minutes}} minutes.
Boardings this hour: {{boardings_this_hour}}. Buses running: {{buses_running}} (rule calls for {{buses_needed_by_rule}}).
Source: {{source}}.`;

const AGENT_SPECS = {
  driver: {
    max: 90,
    first: `${DRILL_PREFIX} Route {{route}}, direction {{direction}}, scheduled {{hour}}: the forecast shows this trip taking {{expected_minutes}} minutes against {{planned_minutes}} planned. What is holding you right now?`,
    prompt: `${DRILL_PREFIX}

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
    first: `${DRILL_PREFIX} Route {{route}} at {{hour}} is running {{minutes_late_now}} minutes late; {{buses_running}} buses are running and the rule calls for {{buses_needed_by_rule}}. Is a standby bus and driver free, and how soon could they be at the route?`,
    prompt: `${DRILL_PREFIX}

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
    first: `${DRILL_PREFIX} Route {{route}}, direction {{direction}}, at {{hour}}: {{minutes_late_now}} minutes late, {{boardings_this_hour}} boardings this hour, next bus in {{next_bus_in_minutes}} minutes. How many passengers are waiting at the stop right now, roughly?`,
    prompt: `${DRILL_PREFIX}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the station supervisor.

${INCIDENT_BLOCK}

${STYLE}

What to do:
- Your opening asked how many passengers are at the stop. Listen.
- Ask at most one follow-up: whether the platform is crowded and passengers are asking about the delay.
- Call insiyab_report with a one or two sentence summary in their own words and role "station".
- Then say "Logged. I am briefing the duty manager now." Say goodbye and call end_call.
- If they cannot say yet, report that with the reason.

${SAFETY_RULES}`,
  },
  manager: {
    max: 90,
    first: `${DRILL_PREFIX} Route {{route}}, direction {{direction}}, {{hour}}: planned {{planned_minutes}} minutes, expected {{expected_minutes}}, running {{minutes_late_now}} late. {{staff_reports}} RTA's dispatch test: the next bus is in {{next_bus_in_minutes}} minutes and none follows within the route's frequency. Options: {{options_text}}. Which do you choose?`,
    prompt: `${DRILL_PREFIX}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are on a call with the duty manager.

${INCIDENT_BLOCK}

Staff reports received just before this call:
{{staff_reports}}

RTA's dispatch test: the next bus is in {{next_bus_in_minutes}} minutes. The next bus is at or near capacity and no further bus follows within the route's frequency.

Options available:
{{options_text}}

${STYLE}

What to do:
- Your opening gave the incident, the staff reports, the dispatch test and the options, and asked which to choose.
- Listen for a choice. If the choice is unclear, name the options once more and ask again.
- Call insiyab_decision with the option key (send_spare, hold, or none) and any additional words the manager said.
- Then say "Recorded. I will brief the team." Say goodbye and call end_call.
- If the manager asks a question you cannot answer from the incident, say the system has no more detail on that.

${SAFETY_RULES}`,
  },
  back: {
    max: 90,
    first: `${DRILL_PREFIX} Message from the duty manager about route {{route}}: {{decision_text}}. Can you confirm?`,
    prompt: `${DRILL_PREFIX}

You are Insiyab, an automated voice for a student team's control-centre drill for the RTA Future Move Hackathon. You are calling {{staff_role}} back with the duty manager's decision about route {{route}}.

Their earlier report: {{their_report}}

The duty manager's decision: {{decision_text}}

${STYLE}

What to do:
- Your opening passed the decision and asked for confirmation. Listen.
- When they confirm (okay, copy, will do, on it, understood): call insiyab_acknowledge with their role ({{staff_role}}), say "Logged", say goodbye and call end_call.
- If they have a question, answer only from the decision text above.
- If they give an update, note it and say the manager has been briefed.
- If they say nothing, repeat the decision once; if still nothing, say goodbye and call end_call.

${SAFETY_RULES}`,
  },
};

/* ---------- calls ---------- */

async function callOne(to, variables, agentId) {
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
        const c = await callOne(p.number, varsFor(p), agentId);
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

/* ---------- relay flow ---------- */

let relayRunning = false;

async function startRelay(incident) {
  if (relayRunning) return { skipped: 'A relay is already running.' };
  relayRunning = true;
  resetState(incident);
  log('relay: incident', incident.id || '', 'route', incident.route, 'at', incident.hour);

  if (!allGuards()) {
    runRehearsal(incident);
    relayRunning = false;
    return { rehearsal: true };
  }

  // Run asynchronously so the HTTP response returns immediately
  runLiveRelay(incident).catch(e => {
    log('relay error:', scrub(e.message));
  }).finally(() => {
    relayRunning = false;
    state.phase = 'done';
  });

  return { started: true };
}

async function runLiveRelay(incident) {
  const nums = numbers();
  const staff = nums.filter(n => n.role !== 'manager');
  const manager = nums.find(n => n.role === 'manager');

  if (!manager) { log('relay: no manager role in numbers file'); return; }
  if (!staff.length) { log('relay: no staff roles in numbers file'); return; }

  const missing = ['driver', 'depot', 'station', 'manager', 'back'].filter(k => !AGENTS[k]);
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
    p => ({ ...incVars, staff_reports, options_text }),
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
  log('relay: done');
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
  console.log('\nREHEARSAL - guards not all met. No calls will be made.');
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

  const roleMessages = {
    driver:  AGENT_SPECS.driver.first.replace(/{{route}}/g, v.route).replace(/{{direction}}/g, v.direction).replace(/{{hour}}/g, v.hour).replace(/{{expected_minutes}}/g, v.expected_minutes).replace(/{{planned_minutes}}/g, v.planned_minutes),
    depot:   AGENT_SPECS.depot.first.replace(/{{route}}/g, v.route).replace(/{{hour}}/g, v.hour).replace(/{{minutes_late_now}}/g, v.minutes_late_now).replace(/{{buses_running}}/g, v.buses_running).replace(/{{buses_needed_by_rule}}/g, v.buses_needed_by_rule),
    station: AGENT_SPECS.station.first.replace(/{{route}}/g, v.route).replace(/{{direction}}/g, v.direction).replace(/{{hour}}/g, v.hour).replace(/{{minutes_late_now}}/g, v.minutes_late_now).replace(/{{boardings_this_hour}}/g, v.boardings_this_hour).replace(/{{next_bus_in_minutes}}/g, v.next_bus_in_minutes),
  };

  const opts = (incident.options || []).map(o => o.key + ': ' + o.say).join('; ');
  const managerMsg = AGENT_SPECS.manager.first
    .replace(/{{route}}/g, v.route).replace(/{{direction}}/g, v.direction).replace(/{{hour}}/g, v.hour)
    .replace(/{{planned_minutes}}/g, v.planned_minutes).replace(/{{expected_minutes}}/g, v.expected_minutes)
    .replace(/{{minutes_late_now}}/g, v.minutes_late_now).replace(/{{next_bus_in_minutes}}/g, v.next_bus_in_minutes)
    .replace('{{staff_reports}}', '[staff reports would appear here]')
    .replace('{{options_text}}', opts);

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
  console.log('  DRIVER/DEPOT/STATION: "' + DRILL_PREFIX + ' Message from the duty manager about route ' + v.route + ': ' + decisionExample + '. Can you confirm?"');
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
    const toolNames = key === 'driver' || key === 'depot' || key === 'station'
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
      description: 'Log a one or two sentence update from a staff member (driver, depot or station). Call this once you have their answer. Pass a summary in their own words and their role.',
      props: { report: { type: 'string', description: 'One or two sentences: what they see or confirm, in their words' }, role: { type: 'string', description: 'Their role: driver, depot or station' } },
      required: ['report', 'role'] },
    { name: 'insiyab_decision', path: 'decision',
      description: 'Log the duty manager\'s choice. Pass the option key (send_spare, hold, or none) and any additional words they said.',
      props: { option_key: { type: 'string', description: 'The key of the chosen option: send_spare, hold, or none' }, words: { type: 'string', description: 'Any additional words the manager said' } },
      required: ['option_key'] },
    { name: 'insiyab_acknowledge', path: 'acknowledge',
      description: 'Log a staff acknowledgement of the call back. Pass their role.',
      props: { role: { type: 'string', description: 'Their role: driver, depot or station' } },
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
        request_body_schema: { type: 'object', description: t.description, properties: t.props, required: t.required },
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
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'x-insiyab-key, content-type' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    // POST /voice/incident - start the relay
    if (req.method === 'POST' && p === '/voice/incident') {
      const got = Buffer.from(String(req.headers['x-insiyab-key'] || ''));
      const want = Buffer.from(SHARED_KEY);
      if (!SHARED_KEY || SHARED_KEY.length < 8 || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
        return send(res, 403, 'application/json', '{"error":"forbidden"}');
      }
      let body;
      try { body = JSON.parse(await readBody(req, 8000)); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad request"}'); }
      if (!body || !body.route) return send(res, 400, 'application/json', '{"error":"incident must have a route"}');
      const result = await startRelay(body);
      return send(res, 200, 'application/json', JSON.stringify(result));
    }

    // OPTIONS preflight for the console (CORS)
    if (req.method === 'OPTIONS' && p === '/voice/state') {
      return send(res, 204, 'text/plain', '', cors);
    }

    // GET /voice/state - unauthenticated, CORS open; state has no numbers or names by design
    if (req.method === 'GET' && p === '/voice/state') {
      return send(res, 200, 'application/json', JSON.stringify(publicState()), cors);
    }

    // GET /voice/state?key=... - key-authenticated version for internal tools
    if (req.method === 'GET' && p === '/voice/state/authenticated') {
      const got = Buffer.from(String(req.headers['x-insiyab-key'] || ''));
      const want = Buffer.from(SHARED_KEY);
      if (!SHARED_KEY || SHARED_KEY.length < 8 || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
        return send(res, 403, 'text/plain', 'Forbidden.');
      }
      return send(res, 200, 'application/json', JSON.stringify(publicState()));
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
      if (allGuards() && EL_KEY) loadAgents().catch(e => log('could not load agents:', scrub(e.message)));
    });
  }
}
