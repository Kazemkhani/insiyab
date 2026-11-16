// The room relay's rules, with a store in memory and no network. node --test live/tests/room.test.js
'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { handle, memoryStore, restStore } = require('../api/_room.js');
const CODE = 'a-code-for-the-test';
const call = (store, action, method = 'POST', body = {}, code) => handle(store, { method, action, body, code, presenterCode: CODE, now: 1000 });

test('an empty room is waiting, with nobody in it', async () => {
  const s = (await call(memoryStore(), 'state', 'GET')).json;
  assert.deepStrictEqual(s, { phase: 'waiting', decision_id: null, joined: 0, accepted: 0, declined: 0, depot: 'none', at: 0, store: 'memory' });
});
test('each phone that joins gets the next seat number, and the state counts them', async () => {
  const st = memoryStore();
  assert.deepStrictEqual([(await call(st, 'join')).json.seat, (await call(st, 'join')).json.seat, (await call(st, 'join')).json.seat], [1, 2, 3]);
  assert.strictEqual((await call(st, 'state', 'GET')).json.joined, 3);
});
test('answers are counted, and a seat that changes its mind is counted once', async () => {
  const st = memoryStore(); for (let i = 0; i < 3; i++) await call(st, 'join');
  await call(st, 'answer', 'POST', { seat: 1, accept: true }); await call(st, 'answer', 'POST', { seat: 2, accept: false }); await call(st, 'answer', 'POST', { seat: 2, accept: true });
  const s = (await call(st, 'state', 'GET')).json; assert.deepStrictEqual([s.accepted, s.declined], [2, 0]);
});
test('an answer from a seat that never joined, or that is not a yes or a no, is refused and counted nowhere', async () => {
  const st = memoryStore(); await call(st, 'join');
  for (const body of [{ seat: 2, accept: true }, { seat: 0, accept: true }, { seat: 1, accept: 'yes' }, { seat: '1', accept: true }, { seat: 1.5, accept: true }, {}]) assert.strictEqual((await call(st, 'answer', 'POST', body)).status, 400);
  const s = (await call(st, 'state', 'GET')).json; assert.deepStrictEqual([s.accepted, s.declined], [0, 0]);
});
test('a visitor is refused the presenter\'s calls, and nothing changes', async () => {
  const st = memoryStore(); await call(st, 'join');
  for (const code of [undefined, '', 'wrong-code-entirely', CODE + 'x', CODE.slice(0, -1)]) {
    for (const [action, body] of [['phase', { phase: 'offer' }], ['reset', {}], ['call', { decision_id: 'd001' }]]) {
      const r = await call(st, action, 'POST', body, code); assert.strictEqual(r.status, 401); assert.deepStrictEqual(r.json, { error: 'presenter code needed' });
    }
  }
  const s = (await call(st, 'state', 'GET')).json; assert.deepStrictEqual([s.phase, s.joined, s.at], ['waiting', 1, 0]);
});
test('with no presenter code set on the server, nobody is the presenter', async () => {
  const r = await handle(memoryStore(), { method: 'POST', action: 'phase', body: { phase: 'offer' }, code: '', presenterCode: undefined }); assert.strictEqual(r.status, 401);
  const r2 = await handle(memoryStore(), { method: 'POST', action: 'phase', body: { phase: 'offer' }, code: undefined, presenterCode: undefined }); assert.strictEqual(r2.status, 401);
});
test('the presenter opens the offer, names the decision, and resets the room', async () => {
  const st = memoryStore(); await call(st, 'join'); await call(st, 'answer', 'POST', { seat: 1, accept: true });
  const opened = (await call(st, 'phase', 'POST', { phase: 'offer', decision_id: 'd003' }, CODE)).json;
  assert.deepStrictEqual([opened.phase, opened.decision_id, opened.at, opened.accepted], ['offer', 'd003', 1000, 1]);
  assert.strictEqual((await call(st, 'phase', 'POST', { phase: 'closed' }, CODE)).json.decision_id, 'd003');         // the decision is kept when left out
  assert.strictEqual((await call(st, 'phase', 'POST', { phase: 'party' }, CODE)).status, 400);
  const wiped = (await call(st, 'reset', 'POST', {}, CODE)).json;
  assert.deepStrictEqual([wiped.phase, wiped.decision_id, wiped.joined, wiped.accepted, wiped.declined, wiped.depot], ['waiting', null, 0, 0, 0, 'none']);
});
test('the room holds 500 seats and then says it is full', async () => {
  const st = memoryStore(); let last; for (let i = 0; i < 501; i++) last = await call(st, 'join');
  assert.strictEqual(last.status, 429);
});
test('the call to the depot is not wired: even the presenter gets a plain refusal, and nothing is rung', async () => {
  const r = await call(memoryStore(), 'call', 'POST', { decision_id: 'd001' }, CODE); assert.strictEqual(r.status, 503); assert.deepStrictEqual(r.json, { error: 'calling is not set up' });
});
test('a store that fails, hangs or refuses makes the room absent (503), never a crash and never a made-up state', async () => {
  const broken = { kind: 'shared', run: async () => { throw new Error('down'); } };
  for (const [action, method] of [['state', 'GET'], ['join', 'POST']]) assert.strictEqual((await handle(broken, { method, action, body: {}, presenterCode: CODE })).status, 503);
  const hangs = restStore('https://store.invalid', 't', (u, o) => new Promise((_, no) => o.signal.addEventListener('abort', () => no(new Error('aborted')))), 30);
  assert.strictEqual((await handle(hangs, { method: 'GET', action: 'state' })).status, 503);
  const refuses = restStore('https://store.invalid', 't', async () => ({ ok: false, status: 401, json: async () => ({}) }));
  assert.strictEqual((await handle(refuses, { method: 'GET', action: 'state' })).status, 503);
});
test('the shared store is asked in one round trip, with the token in a header and never in the address', async () => {
  const seen = []; const fake = async (url, o) => { seen.push([url, o.headers.authorization, JSON.parse(o.body).length]); return { ok: true, status: 200, json: async () => [{ result: '2' }, { result: 'offer' }, { result: 'd003' }, { result: ['1', '1', '2', '0'] }, { result: null }, { result: '7' }] }; };
  const s = (await handle(restStore('https://store.invalid/', 'tok', fake), { method: 'GET', action: 'state' })).json;
  assert.deepStrictEqual(seen, [['https://store.invalid/pipeline', 'Bearer tok', 6]]);
  assert.deepStrictEqual(s, { phase: 'offer', decision_id: 'd003', joined: 2, accepted: 1, declined: 1, depot: 'none', at: 7, store: 'shared' });
});
test('an unknown call is a 404, a GET where a POST is meant is a 405, and a body that is not an object is a 400', async () => {
  const st = memoryStore();
  assert.strictEqual((await call(st, 'nothing')).status, 404); assert.strictEqual((await call(st, 'join', 'GET')).status, 405); assert.strictEqual((await call(st, 'join', 'POST', null)).status, 400);
});
test('nothing about a visitor is kept: the store holds only seat counts, answers by seat, the phase, the decision and a time', async () => {
  const keys = new Set(); const st = memoryStore(); const run = st.run; st.run = async (c) => { c.forEach((x) => keys.add(x[1])); return run(c); };
  await call(st, 'join'); await call(st, 'answer', 'POST', { seat: 1, accept: true }); await call(st, 'phase', 'POST', { phase: 'offer', decision_id: 'd1' }, CODE); await call(st, 'state', 'GET');
  assert.deepStrictEqual([...keys].sort(), ['room:answers', 'room:at', 'room:decision', 'room:depot', 'room:phase', 'room:seq']);
});
