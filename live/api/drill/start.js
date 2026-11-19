'use strict';
// Vercel serverless function: runs the five-person phone drill on ElevenLabs.
// Guards: VOICE_SHARED_KEY auth, INSIYAB_CALLS=armed, valid VOICE_ROSTER, 5-min cooldown.
// Streams NDJSON; every event is scrubbed of phone numbers and roster names.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Timing caps (env-configurable, in seconds, converted to ms) ---
function capMs(env, def) {
  const v = Number(process.env[env]);
  return (Number.isFinite(v) && v > 0 ? v : def) * 1000;
}

// --- Helpers exposed for tests ---
function toolSecret(key) {
  if (!key) return '';
  return crypto.createHash('sha256').update('insiyab-tool:' + key).digest('hex').slice(0, 40);
}

function parseRoster(json) {
  let items;
  try { items = JSON.parse(json); } catch { throw new Error('VOICE_ROSTER is not valid JSON'); }
  if (!Array.isArray(items)) throw new Error('VOICE_ROSTER must be a JSON array');
  const REQUIRED = ['driver', 'depot', 'station', 'planner', 'manager'];
  const seen = new Map(), nums = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object') throw new Error('roster entry must be an object');
    const role = String(item.role || '').trim().toLowerCase();
    const name = String(item.name || '').trim();
    const number = String(item.number || '').trim();
    if (!REQUIRED.includes(role)) throw new Error('unknown role: ' + role);
    if (seen.has(role)) throw new Error('duplicate role: ' + role);
    if (nums.has(number)) throw new Error('duplicate number');
    if (!/^\+\d{8,15}$/.test(number)) throw new Error('invalid number for ' + role);
    seen.set(role, { role, name, number });
    nums.add(number);
  }
  for (const r of REQUIRED) if (!seen.has(r)) throw new Error('missing role: ' + r);
  return REQUIRED.map(r => seen.get(r));
}

function extractToolCall(conv, toolName) {
  if (!conv) return null;
  const tryParse = s => {
    try { return typeof s === 'string' ? JSON.parse(s) : (s || null); } catch { return null; }
  };
  const candidates = [...(conv.tool_calls || []), ...(conv.metadata?.tool_calls || [])];
  for (const container of [conv.transcript, conv.messages]) {
    if (!Array.isArray(container)) continue;
    for (const msg of container) {
      if (Array.isArray(msg.tool_calls)) candidates.push(...msg.tool_calls);
      if (msg.name || msg.tool_name) candidates.push(msg);
    }
  }
  for (const tc of candidates) {
    if (!tc) continue;
    const name = tc.tool_name || tc.name || tc.function?.name;
    if (name !== toolName) continue;
    const raw = tc.params_as_json ?? tc.arguments ?? tc.input ?? tc.params;
    return tryParse(raw) || (raw && typeof raw === 'object' ? raw : null) || {};
  }
  return null;
}

// Conversations are "ended" once in one of these states.
const ENDED = new Set(['processing', 'done', 'failed']);

// --- Core drill orchestration (exported for tests) ---
async function runDrill({ roster, incident, elKey, phoneId, agentIds, write, fetchFn, names, staffCap, managerCap, calloutCap, pollMs }) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const EL = async (path_, init) => fetchFn('https://api.elevenlabs.io' + path_, {
    ...init,
    headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const convStatus = async id => {
    try { const r = await EL('/v1/convai/conversations/' + encodeURIComponent(id)); const j = await r.json().catch(() => ({})); return j.status || 'unknown'; } catch { return 'unknown'; }
  };
  const getConv = async id => {
    try { const r = await EL('/v1/convai/conversations/' + encodeURIComponent(id)); if (!r.ok) return null; return r.json().catch(() => null); } catch { return null; }
  };

  // Scrub 7+ digit runs and any roster name from a string value.
  const scrubStr = s => {
    let r = String(s).replace(/\+\d[\d\s(){}\-]{5,}\d/g, '[phone]').replace(/\d{7,}/g, '[redacted]');
    for (const n of (names || new Set())) if (n) r = r.split(n).join('[name]');
    return r;
  };

  const incVars = {
    route: String(incident.route || ''), direction: String(incident.direction || ''),
    hour: String(incident.hour || ''), planned_minutes: String(incident.planned_minutes || ''),
    expected_minutes: String(incident.expected_minutes || ''),
    minutes_late_now: String(incident.minutes_late_now || ''),
    next_bus_in_minutes: String(incident.next_bus_in_minutes || ''),
    boardings_this_hour: String(incident.boardings_this_hour || ''),
    buses_running: String(incident.buses_running || ''),
    buses_needed_by_rule: String(incident.buses_needed_by_rule || ''),
    source: scrubStr(String(incident.source || '').slice(0, 300)),
  };

  const placeCall = async (person, variables, agentId) => {
    const callToken = crypto.randomBytes(24).toString('hex');
    try {
      const r = await fetchFn('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneId,
          to_number: person.number,
          conversation_initiation_client_data: {
            dynamic_variables: { ...variables, staff_role: person.role, call_token: callToken },
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) throw new Error('status ' + r.status + (j.message ? ' ' + scrubStr(j.message) : ''));
      return { ok: true, conversation: j.conversation_id || null, callToken };
    } catch (e) {
      return { ok: false, error: scrubStr(String(e.message || e)).slice(0, 200), callToken };
    }
  };

  const staff = roster.filter(p => p.role !== 'manager');
  const manager = roster.find(p => p.role === 'manager');

  // --- Phase 1: staff check calls ---
  write({ type: 'phase', phase: 'check' });
  const step1 = await Promise.all(staff.map(async person => {
    write({ type: 'status', role: person.role, status: 'calling' });
    const r = await placeCall(person, incVars, agentIds[person.role]);
    if (!r.ok) write({ type: 'error', role: person.role, message: r.error });
    return { person, ...r };
  }));
  const step1Convs = step1.filter(r => r.ok && r.conversation).map(r => ({ role: r.person.role, id: r.conversation }));

  // Wait until all conversations ended OR staffCap ms.
  const tStaff = Date.now();
  let staffEnded = !step1Convs.length;
  while (!staffEnded && Date.now() - tStaff < staffCap) {
    await sleep(pollMs);
    const statuses = await Promise.all(step1Convs.map(x => convStatus(x.id)));
    staffEnded = statuses.every(s => ENDED.has(s));
  }
  if (!staffEnded) write({ type: 'cap', phase: 'check', message: 'Staff call timeout. Proceeding with available reports.' });

  // Extract reports from ended conversations.
  const reports = {};
  for (const { role, id } of step1Convs) {
    const conv = await getConv(id);
    const params = extractToolCall(conv, 'insiyab_report');
    if (params !== null && params.report) {
      reports[role] = scrubStr(String(params.report).slice(0, 300));
      write({ type: 'status', role, status: 'reported', report: reports[role] });
    } else {
      reports[role] = null;
      write({ type: 'status', role, status: 'no_report' });
    }
  }
  // Fill in no_report for calls that failed immediately.
  for (const person of staff) if (!(person.role in reports)) { reports[person.role] = null; write({ type: 'status', role: person.role, status: 'no_report' }); }

  // --- Phase 2: manager call ---
  write({ type: 'phase', phase: 'manager' });
  const reported = staff.filter(s => reports[s.role]);
  const silent = staff.filter(s => !reports[s.role]);
  let staff_reports = reported.map(s => `${s.role}: ${reports[s.role]}`).join('. ');
  if (silent.length) staff_reports += (staff_reports ? '. ' : '') + silent.map(s => s.role).join(' and ') + ' did not answer.';
  if (!staff_reports) staff_reports = 'No staff reports received.';
  const options_text = (incident.options || []).map((o, i) => `${i + 1}. ${o.say} (key: ${o.key})`).join('; ');
  const team_roster = roster.map(p => `${p.role}: ${p.name}`).join('; ');

  write({ type: 'status', role: 'manager', status: 'calling' });
  const mr = await placeCall(manager, { ...incVars, staff_reports, options_text, team_roster }, agentIds.manager);
  if (!mr.ok) {
    write({ type: 'error', role: 'manager', message: mr.error });
    write({ type: 'phase', phase: 'done', outcome: 'no_decision' });
    return;
  }

  const tManager = Date.now();
  let managerEnded = !mr.conversation;
  if (mr.conversation) {
    while (!managerEnded && Date.now() - tManager < managerCap) {
      await sleep(pollMs);
      managerEnded = ENDED.has(await convStatus(mr.conversation));
    }
    if (!managerEnded) write({ type: 'cap', phase: 'manager', message: 'Manager call timeout. Proceeding.' });
  }

  let decision = null;
  if (mr.conversation) {
    const conv = await getConv(mr.conversation);
    const params = extractToolCall(conv, 'insiyab_decision');
    if (params !== null && params.option_key) {
      const opt = (incident.options || []).find(o => o.key === params.option_key);
      if (opt) {
        const words = params.words ? scrubStr(String(params.words).slice(0, 200)) : '';
        decision = { option_key: params.option_key, say: opt.say, words };
        write({ type: 'status', role: 'manager', status: 'decided', option_key: decision.option_key, say: decision.say, words: decision.words });
      }
    }
  }
  if (!decision) {
    write({ type: 'status', role: 'manager', status: 'no_decision' });
    write({ type: 'phase', phase: 'done', outcome: 'no_decision' });
    return;
  }

  // --- Phase 3: callout (relay decision to staff) ---
  write({ type: 'phase', phase: 'callout' });
  const decisionText = decision.say + (decision.words ? '. ' + decision.words : '');
  const step3 = await Promise.all(staff.map(async person => {
    write({ type: 'status', role: person.role, status: 'sent' });
    const r = await placeCall(person, { ...incVars, decision_text: decisionText, their_report: reports[person.role] || 'no update from you earlier' }, agentIds.back);
    if (!r.ok) write({ type: 'error', role: person.role, message: r.error });
    return { person, ...r };
  }));
  const step3Convs = step3.filter(r => r.ok && r.conversation).map(r => ({ role: r.person.role, id: r.conversation }));

  const tCallout = Date.now();
  let calloutEnded = !step3Convs.length;
  while (!calloutEnded && Date.now() - tCallout < calloutCap) {
    await sleep(pollMs);
    const statuses = await Promise.all(step3Convs.map(x => convStatus(x.id)));
    calloutEnded = statuses.every(s => ENDED.has(s));
  }
  if (!calloutEnded) write({ type: 'cap', phase: 'callout', message: 'Callback timeout.' });

  for (const { role, id } of step3Convs) {
    const conv = await getConv(id);
    const params = extractToolCall(conv, 'insiyab_acknowledge');
    if (params !== null) write({ type: 'status', role, status: 'received' });
  }

  write({ type: 'phase', phase: 'done', outcome: 'complete' });
}

// --- In-process cooldown (per instance, not cross-instance) ---
let lastStartMs = 0;
const GUARD_MS = 5 * 60 * 1000;

// --- Vercel handler ---
const handler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  // 1. Constant-time key check.
  const sharedKey = process.env.VOICE_SHARED_KEY || '';
  const given = String(req.headers['x-insiyab-key'] || '');
  const keyOk = sharedKey.length >= 24 && given.length === sharedKey.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(sharedKey));
  if (!keyOk) { res.status(401).json({ error: 'forbidden' }); return; }

  // 2. Armed guard.
  if (process.env.INSIYAB_CALLS !== 'armed') {
    res.status(403).json({ error: 'not armed', reason: 'Set INSIYAB_CALLS=armed to enable the drill.' }); return;
  }

  // 3. Roster validation.
  let roster;
  try { roster = parseRoster(process.env.VOICE_ROSTER || '[]'); }
  catch (e) { res.status(403).json({ error: 'bad roster', reason: e.message }); return; }

  // 4. Per-instance 5-minute cooldown.
  const now = Date.now();
  if (lastStartMs && now - lastStartMs < GUARD_MS) {
    res.status(429).json({ error: 'too soon', reason: 'Wait 5 minutes between drills (per instance).' }); return;
  }
  lastStartMs = now;

  // 5. Load ElevenLabs agent IDs.
  const elKey = process.env.ELEVENLABS_API_KEY || '';
  const phoneId = process.env.ELEVENLABS_PHONE_NUMBER_ID || '';
  const AGENT_NAMES = {
    driver: 'Insiyab relay: driver check', depot: 'Insiyab relay: depot check',
    station: 'Insiyab relay: station check', planner: 'Insiyab relay: planner check',
    manager: 'Insiyab relay: manager', back: 'Insiyab relay: call back',
  };
  let agentIds = {};
  try {
    const r = await Promise.race([
      fetch('https://api.elevenlabs.io/v1/convai/agents?page_size=100', { headers: { 'xi-api-key': elKey } }).then(r => r.json()).catch(() => ({})),
      new Promise((_, rej) => setTimeout(() => rej(new Error('agent list timeout')), 15000)),
    ]);
    for (const [k, name] of Object.entries(AGENT_NAMES)) {
      const found = (r.agents || []).find(a => a.name === name);
      if (found) agentIds[k] = found.agent_id;
    }
  } catch (e) { res.status(503).json({ error: 'agents unavailable', reason: String(e.message || '').slice(0, 100) }); return; }
  const missing = Object.keys(AGENT_NAMES).filter(k => !agentIds[k]);
  if (missing.length) { res.status(503).json({ error: 'agents not configured', missing }); return; }

  // 6. Load incident from sibling file (falls back to built-in defaults).
  let incident;
  try { incident = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'voice', 'incident-example.json'), 'utf8')); }
  catch {
    incident = { drill: true, id: 'drill-001', route: '310', direction: '1', hour: '18:00', planned_minutes: 67, expected_minutes: 96, minutes_late_now: 22, next_bus_in_minutes: 20, boardings_this_hour: 640, buses_running: 8, buses_needed_by_rule: 17, source: 'Stand-in drill scenario.', options: [{ key: 'send_spare', say: 'send the standby bus to route 310' }, { key: 'hold', say: 'hold the next departure' }, { key: 'none', say: 'take no action' }] };
  }

  // 7. Stream NDJSON.
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const names = new Set(roster.map(p => p.name).filter(Boolean));
  const scrub = s => {
    let r = String(s).replace(/\+\d[\d\s(){}\-]{5,}\d/g, '[phone]').replace(/\d{7,}/g, '[redacted]');
    for (const n of names) if (n) r = r.split(n).join('[name]');
    return r;
  };
  const write = event => {
    const safe = {};
    for (const [k, v] of Object.entries(event)) safe[k] = typeof v === 'string' ? scrub(v) : v;
    if (!safe.at) safe.at = new Date().toISOString();
    try { res.write(JSON.stringify(safe) + '\n'); } catch { /* stream closed */ }
  };

  try {
    await runDrill({
      roster, incident, elKey, phoneId, agentIds, write, fetchFn: fetch, names,
      staffCap: capMs('DRILL_STAFF_TIMEOUT_S', 75),
      managerCap: capMs('DRILL_MANAGER_TIMEOUT_S', 100),
      calloutCap: capMs('DRILL_CALLOUT_TIMEOUT_S', 40),
      pollMs: 2000,
    });
  } catch (e) {
    try { write({ type: 'error', message: 'Drill failed unexpectedly.' }); } catch { /* ignore */ }
  }
  res.end();
};

handler.config = { maxDuration: 300 };
module.exports = handler;
module.exports.runDrill = runDrill;
module.exports.parseRoster = parseRoster;
module.exports.toolSecret = toolSecret;
module.exports.extractToolCall = extractToolCall;
