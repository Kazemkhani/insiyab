// The room relay (docs/CONTRACT.md, "The live room"). One room. A phone is a seat number and nothing else:
// no name, no number, no address and nothing about the browser is read or kept.
// All the rules are in handle(); the two stores below only keep a handful of small values.
'use strict';
const crypto = require('node:crypto');

const PHASES = ['waiting', 'offer', 'closed'];
const MAX_SEATS = 500;                 // a room, not a crowd: past this, join answers 429
const K = { seq: 'room:seq', phase: 'room:phase', decision: 'room:decision', answers: 'room:answers', depot: 'room:depot', at: 'room:at' };

// A store that lives in this process. Used by the tests, and on the public address when no shared store is set:
// it then holds the room only while one copy of the function stays warm, and the state says so ("store": "memory").
function memoryStore() {
  const v = new Map();
  return {
    kind: 'memory',
    async run(cmds) {
      return cmds.map(([op, key, a, b]) => {
        if (op === 'GET') return v.has(key) ? v.get(key) : null;
        if (op === 'SET') { v.set(key, String(a)); return 'OK'; }
        if (op === 'INCR') { const n = Number(v.get(key) || 0) + 1; v.set(key, String(n)); return n; }
        if (op === 'HSET') { const h = v.get(key) || {}; h[String(a)] = String(b); v.set(key, h); return 1; }
        if (op === 'HGETALL') { const h = v.get(key) || {}; return Object.entries(h).flat(); }
        if (op === 'DEL') { v.delete(key); return 1; }
        throw new Error('unknown command ' + op);
      });
    },
  };
}

// A shared store reached over HTTPS (Upstash Redis's REST pipeline). Every call has a deadline: a store that hangs is a room that is absent.
function restStore(url, token, fetchFn = fetch, timeoutMs = 1500) {
  return {
    kind: 'shared',
    async run(cmds) {
      const stop = new AbortController(); const timer = setTimeout(() => stop.abort(), timeoutMs);
      try {
        const r = await fetchFn(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(cmds), signal: stop.signal });
        if (!r.ok) throw new Error('the store answered ' + r.status);
        const out = await r.json();
        if (!Array.isArray(out) || out.some((x) => x && x.error)) throw new Error('the store refused a command');
        return out.map((x) => x.result);
      } finally { clearTimeout(timer); }
    },
  };
}

function sameCode(given, real) {
  if (typeof given !== 'string' || typeof real !== 'string' || real.length < 6) return false;      // no code set means nobody is the presenter
  const a = crypto.createHash('sha256').update(given).digest(); const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

async function readState(store) {
  const [seq, phase, decision, answers, depot, at] = await store.run([['GET', K.seq], ['GET', K.phase], ['GET', K.decision], ['HGETALL', K.answers], ['GET', K.depot], ['GET', K.at]]);
  const flat = Array.isArray(answers) ? answers : Object.entries(answers || {}).flat(); let accepted = 0; let declined = 0;
  for (let i = 1; i < flat.length; i += 2) { if (String(flat[i]) === '1') accepted += 1; else declined += 1; }
  return { phase: PHASES.includes(phase) ? phase : 'waiting', decision_id: decision || null, joined: Number(seq || 0), accepted, declined, depot: depot || 'none', at: Number(at || 0), store: store.kind };
}

// handle(store, request) -> { status, json }. request: { method, action, body, code, presenterCode, now }
async function handle(store, { method, action, body = {}, code, presenterCode, now = Math.floor(Date.now() / 1000) }) {
  const presenter = () => sameCode(code, presenterCode);
  const refuse = { status: 401, json: { error: 'presenter code needed' } };
  try {
    if (action === 'state' && method === 'GET') return { status: 200, json: await readState(store) };
    if (method !== 'POST') return { status: 405, json: { error: 'this call is a POST' } };
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return { status: 400, json: { error: 'the body must be a JSON object' } };
    if (action === 'join') {
      const [seat] = await store.run([['INCR', K.seq]]);
      if (seat > MAX_SEATS) return { status: 429, json: { error: 'the room is full' } };
      return { status: 200, json: { seat } };
    }
    if (action === 'answer') {
      const [seq] = await store.run([['GET', K.seq]]);
      if (!Number.isInteger(body.seat) || body.seat < 1 || body.seat > Math.min(Number(seq || 0), MAX_SEATS) || typeof body.accept !== 'boolean') return { status: 400, json: { error: 'a seat that has joined, and accept true or false' } };
      await store.run([['HSET', K.answers, body.seat, body.accept ? 1 : 0]]);          // a seat's later answer replaces its earlier one
      return { status: 200, json: { ok: true } };
    }
    if (action === 'phase') {
      if (!presenter()) return refuse;
      if (!PHASES.includes(body.phase)) return { status: 400, json: { error: 'phase is waiting, offer or closed' } };
      const cmds = [['SET', K.phase, body.phase], ['SET', K.at, now]];
      if (typeof body.decision_id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(body.decision_id)) cmds.push(['SET', K.decision, body.decision_id]);
      await store.run(cmds); return { status: 200, json: await readState(store) };
    }
    if (action === 'reset') {
      if (!presenter()) return refuse;
      await store.run([...Object.values(K).filter((k) => k !== K.at).map((k) => ['DEL', k]), ['SET', K.at, now]]);
      return { status: 200, json: await readState(store) };
    }
    if (action === 'call') {
      if (!presenter()) return refuse;
      // The depot's phone: not wired. No number is rung from here until the calling code is ported and Amir has said "call me".
      return { status: 503, json: { error: 'calling is not set up' } };
    }
    return { status: 404, json: { error: 'no such call' } };
  } catch (e) {
    return { status: 503, json: { error: 'the room is not reachable' } };            // a page treats this as the room being absent
  }
}

let warm = null;
function storeFromEnv(env = process.env) {
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return restStore(env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return restStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  warm = warm || memoryStore(); return warm;
}

module.exports = { handle, memoryStore, restStore, storeFromEnv, PHASES, MAX_SEATS };
