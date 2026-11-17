// The Khutwa page's rules and its build, checked with Node alone: no browser, no network, no library.
//   node rider/tests/logic.test.mjs        (bash rider/tests/run.sh runs it, then the page in a browser where one is installed)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const K = createRequire(import.meta.url)('../src/logic.js');
let failed = 0, passed = 0;
const check = (name, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ': ' + String(detail).slice(0, 300))); ok ? passed++ : failed++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khutwa-'));
const fixtures = path.join(root, 'fixtures');
const build = (bundle, name) => {
  const out = path.join(tmp, name, 'khutwa');
  const said = execFileSync('node', [path.join(root, 'rider', 'build.mjs'), '--bundle', bundle, '--out', out], { encoding: 'utf8' });
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const m = /window\.KHUTWA_DATA = (\{.*\});<\/script>/.exec(html);
  return { said, html, data: m ? JSON.parse(m[1]) : null, files: fs.readdirSync(out) };
};
// a copy of the stand-in bundle with one file changed
const variant = (name, change) => {
  const dir = path.join(tmp, name + '-bundle'); fs.cpSync(fixtures, dir, { recursive: true, filter: (p) => !p.includes(path.join('fixtures', 'raw')) });
  change(dir, (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o)));
  return dir;
};

const dec = JSON.parse(fs.readFileSync(path.join(fixtures, 'decisions.json'), 'utf8'));
const d0 = dec.decisions.find((x) => x.lever === 'rewarded_choice');
const net = JSON.parse(fs.readFileSync(path.join(fixtures, 'network.json'), 'utf8'));
const otherStop = net.stops.find((s) => s.stop_id !== d0.usual.stop_id).stop_id;
const walking = { kind: 'other_route', route_id: net.routes[0].route_id, stop_id: otherStop, depart: d0.usual.depart + 300, walk_metres: 320, walk_minutes: 5, extra_minutes: 9, points: 20, load: 4, seats: 32 };
const longWalk = { ...walking, walk_metres: 900, walk_minutes: 12, points: 60 };
const withOffers = (extra) => (dir, read, write) => { const j = read('decisions.json'); j.decisions.find((x) => x.lever === 'rewarded_choice').offers.push(...extra); write('decisions.json', j); };

// ---- the build, from the stand-in bundle
const a = build(fixtures, 'stand-in');
check('the build says BUILT and writes one file, index.html', a.said.startsWith('BUILT') && a.files.length === 1 && a.files[0] === 'index.html', a.said + a.files);
check('the page carries the bundle\u2019s own numbers for the usual bus', a.data && a.data.offers[0].usual.load === d0.usual.load && a.data.offers[0].usual.seats === d0.usual.seats && a.data.offers[0].usual.depart === d0.usual.depart);
check('every choice in the page is one of the bundle\u2019s offers, with its points', a.data.offers[0].choices.length === d0.offers.filter((o) => o.walk_metres <= K.LONGEST_WALK_METRES).length &&
  a.data.offers[0].choices.every((c, i) => c.points === d0.offers[i].points && c.depart === d0.offers[i].depart));
check('the page says STAND-IN DATA, NOT A RESULT and the bundle\u2019s fixture flag is carried', a.html.includes('STAND-IN DATA, NOT A RESULT') && a.data.fixture === true);
const addresses = [...a.html.matchAll(/(?:href|src)="([^"]*)"|url\(([^)]*)\)|fetch\('([^']*)'/g)].map((m) => m[1] ?? m[2] ?? m[3]);
check('every address inside the page is relative', addresses.length > 5 && addresses.every((u) => !/^(?:[a-z]+:|\/)/i.test(u)), addresses.filter((u) => /^(?:[a-z]+:|\/)/i.test(u)));
check('the page names no outside address at all', !/https?:\/\//.test(a.html));
check('the room is asked for beside the page, at ../api/room/', a.html.includes("'../api/room/'"));
check('nothing about a vehicle, a trip, a driver, a card or a device leaves the bundle', !/"(vehicle|trip_id|driver|driver_id|device_id|nol_id|body|model_year)"/i.test(JSON.stringify(a.data)));
check('no RTA or nol logo: the page holds no picture', !/<img|<svg|background-image/i.test(a.html));
check('the page calls her a passenger, never a rider, user or customer', !/\b(rider|riders|user|users|customer|customers)\b/i.test(a.html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/, '')));
check('the page says the passenger is fictional', /passenger is fictional/i.test(a.html));
check('the page is small enough for a phone on a poor connection (under 300 KB)', a.html.length < 300 * 1024, a.html.length);
const u = a.data.offers[0].usual;
check('the stop page has the usual stop\u2019s buses for the hour, soonest first', (a.data.boards[u.stop_id] || []).length > 0 && a.data.boards[u.stop_id].every((r, i, all) => i === 0 || all[i - 1][1] <= r[1]) && a.data.stops[u.stop_id] === u.stop);
check('the usual bus is on its stop\u2019s board with the same load and seats', a.data.boards[u.stop_id].some((r) => r[1] === u.depart && r[3] === u.load && r[4] === u.seats));

// ---- a walking offer, a long walk, no rewarded choice, and a bundle that is not stand-in
const w = build(variant('walking', withOffers([walking, longWalk])), 'walking');
const wo = w.data.offers[0];
check('a walking offer of 320 metres is offered', wo.choices.some((c) => c.walk_metres === 320));
check('a walk of 900 metres is never in the page, whatever it earns', !wo.choices.some((c) => c.walk_metres > K.LONGEST_WALK_METRES) && !w.html.includes('"walk_metres":900'));
check('after "I cannot walk further" no choice involves a walk', K.choicesFor(wo, true).length === d0.offers.length && K.choicesFor(wo, true).every((c) => c.walk_metres === 0));
check('without it, the short walk is among the choices', K.choicesFor(wo, false).length === d0.offers.length + 1);
const n = build(variant('none', (dir, read, write) => { const j = read('decisions.json'); j.decisions = j.decisions.filter((x) => x.lever !== 'rewarded_choice'); write('decisions.json', j); }), 'none');
check('a bundle with no rewarded choice still builds, with no offer in it', n.said.includes('no rewarded choice') && n.data.offers.length === 0);
const r = build(variant('real', (dir, read, write) => { const j = read('meta.json'); j.fixture = false; write('meta.json', j); }), 'real');
check('a bundle that is not stand-in data is not labelled stand-in', r.data.fixture === false);
const bare = build(variant('bare', (dir) => { fs.rmSync(path.join(dir, 'replay'), { recursive: true }); fs.rmSync(path.join(dir, 'forecast'), { recursive: true }); }), 'bare');
check('a bundle without the replay or the forecasts still builds the offer', bare.data.offers.length === 1 && bare.data.offers[0].usual.left === null && Object.keys(bare.data.boards).length === 0);

// ---- the rules
check('an offer that earns nothing is not an offer', !K.allowed({ points: 0, walk_metres: 0 }) && !K.allowed({ walk_metres: 0 }) && K.allowed({ points: 5, walk_metres: 0 }));
const words = K.describe(wo.choices.find((c) => c.walk_metres === 320), wo.usual);
check('a choice states its walk in metres and minutes, its extra minutes and its points', words.costs.some((t) => t.includes('320 metres') && t.includes('5 minutes')) && words.costs.some((t) => t.includes('9 minutes longer')) && words.earns === '20 Khutwa points', JSON.stringify(words));
check('every choice says the fare is the same: nobody is charged more', wo.choices.every((c) => K.describe(c, wo.usual).costs.includes('the fare is the same')));
check('a choice with room says a seat is not reserved', /seat is not reserved/.test(K.describe(wo.choices[0], wo.usual).room));
const buys = K.whatPointsBuy(16);
check('points buy a fare, bread, rice and a phone top-up, and nothing with a brand', ['fare', 'bread', 'rice', 'topup'].every((k) => buys.some((b) => b.key === k)) && buys.every((b) => b.mornings === Math.ceil(b.points / 16)));
check('no points buy nothing', K.whatPointsBuy(0).length === 0);
check('a bus with more on board than seats is full, by the count', K.fullness({ load: 33, seats: 32 }).full && K.fullness({ load: 33, seats: 32 }).over === 1 && !K.fullness({ load: 20, seats: 48 }).full);
check('times are read as clock times, also after midnight', K.clock(26790) === '07:26' && K.clock(25 * 3600 + 600) === '01:10');
check('lateness is said in minutes', K.lateness(416) === '7 minutes late' && K.lateness(20) === 'on time' && K.lateness(-120) === '2 minutes early');
check('the stop in the address is read, and anything odd is refused', K.stopAsked('?stop=376501') === '376501' && K.stopAsked('') === null && K.stopAsked('?stop=%3Cscript%3E') === '' && K.stopAsked('?x=1&stop=A_1-b') === 'A_1-b');
check('the next buses are those after the time, soonest first', JSON.stringify(K.nextBuses([[0, 300, 310, 5, 20], [1, 100, 100, 1, 20], [0, 200, 260, 30, 20]], 150, 6).map((b) => b.scheduled)) === '[200,300]');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} FAILED` : `ALL PASS (${passed} checks)`);
process.exit(failed ? 1 : 0);
