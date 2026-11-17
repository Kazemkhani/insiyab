// Builds the Khutwa passenger page: one file for a phone, nothing fetched from another address.
//   node rider/build.mjs --bundle <bundle folder> --out <folder>
// Lane 1 places the out folder at khutwa/ inside the public site, beside data/ (the bundle), fonts/ and api/room/.
// Everything the page shows is taken from the bundle here and written into the page, so it opens with the network off
// and from a file. The only thing it asks for at run time is the room (../api/room/), and it works without it.
// Only totals leave the bundle: no vehicle name, no trip number, nothing about a person.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const K = createRequire(import.meta.url)('./src/logic.js');
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const bundle = arg('--bundle'); const out = arg('--out');
if (!bundle || !out) { console.error('usage: node rider/build.mjs --bundle <folder> --out <folder>'); process.exit(2); }
const read = (name) => JSON.parse(fs.readFileSync(path.join(bundle, name), 'utf8'));
const maybe = (name) => { try { return read(name); } catch { return null; } };

const meta = read('meta.json'); const network = read('network.json'); const decisions = read('decisions.json').decisions || [];
const stopName = Object.fromEntries(network.stops.map((s) => [s.stop_id, s.name]));
const routeName = Object.fromEntries(network.routes.map((r) => [r.route_id, r.short_name || r.route_id]));
const num = (x) => typeof x === 'number' && Number.isFinite(x);

// The day as it happened, route by route (docs/CONTRACT.md, replay/). Absent files are done without.
const index = maybe('replay/index.json'); const trips = [];
for (const r of (index && index.routes) || []) {
  const f = maybe(r.file); if (!f) continue;
  for (const t of f.trips) trips.push({ route_id: f.route_id, seats: t.seats, trip_id: t.trip_id, visits: t.visits });
}
const stopForecast = maybe('forecast/boardings-stop.json'); const delayForecast = maybe('forecast/delay-route.json');

// Each rewarded-choice decision becomes one offer: the usual bus, the choices, and the forecasts the bundle holds for it.
function offerOf(d) {
  const u = d.usual;
  const usual = { route_id: u.route_id, route: routeName[u.route_id] || u.route_id, stop_id: u.stop_id, stop: stopName[u.stop_id] || 'this stop',
    depart: u.depart, load: u.load, seats: u.seats, left: null, forecast_boardings: null, forecast_late: null };
  // how late it left on the day, and the lateness forecast for that trip at that stop, if the bundle kept one
  const trip = trips.find((t) => t.route_id === u.route_id && t.visits.some((v) => v.stop_id === u.stop_id && v.sched_dep === u.depart));
  if (trip) {
    const v = trip.visits.find((x) => x.stop_id === u.stop_id && x.sched_dep === u.depart);
    if (num(v.act_dep)) usual.left = v.act_dep;
    const series = delayForecast && delayForecast.series.find((s) => s.id === u.route_id);
    const rows = series ? series.rows.filter((r) => r.trip_id === trip.trip_id && r.stop_id === u.stop_id) : [];
    if (rows.length) {
      const r = rows.sort((a, b) => b.stops_ahead - a.stops_ahead)[0];
      usual.forecast_late = { seconds: r.forecast, lo: r.lo, hi: r.hi, stops_ahead: r.stops_ahead };
    }
  }
  // the boardings forecast for this stop and route in the quarter-hour of the usual bus, if the bundle kept that one
  const s = stopForecast && stopForecast.series.find((x) => x.id === u.stop_id && x.route_id === u.route_id);
  const bin = (stopForecast && stopForecast.bin_seconds) || meta.bin_seconds || 900;
  const row = s && s.rows.find((r) => u.depart >= r.bin_start && u.depart < r.bin_start + bin);
  if (row) usual.forecast_boardings = { from: row.bin_start, to: row.bin_start + bin, forecast: row.forecast, lo: row.lo, hi: row.hi, made: row.origin };
  const shifted = (d.effect || []).find((e) => e.metric === 'passengers_shifted' && e.kind === 'simulated');
  return {
    decision_id: d.id, usual,
    // an offer that is a long walk, or earns nothing, never reaches the page at all
    choices: d.offers.map((o) => ({ kind: o.kind, route_id: o.route_id, route: routeName[o.route_id] || o.route_id, stop_id: o.stop_id,
      stop: stopName[o.stop_id] || 'another stop', depart: o.depart, walk_metres: o.walk_metres, walk_minutes: o.walk_minutes,
      extra_minutes: o.extra_minutes, points: o.points, minutes_earlier: o.minutes_earlier, minutes_later: o.minutes_later,
      load: num(o.load) && num(o.seats) ? o.load : null, seats: num(o.load) && num(o.seats) ? o.seats : null })).filter(K.allowed),
    assumption: shifted ? shifted.assumption : null,
  };
}
const offers = decisions.filter((d) => d.lever === 'rewarded_choice' && d.usual && Array.isArray(d.offers) && d.offers.length).map(offerOf);

// The stop page (?stop=<stop_id>): every stop's buses in the hour of the morning the page is set in.
const now = offers.length ? offers[0].usual.depart - 600 : 7 * 3600 + 900;
const until = now + 3600; const boards = {}; const routes = [];
const routeIndex = (id) => { const n = routeName[id] || id; let i = routes.indexOf(n); if (i < 0) { routes.push(n); i = routes.length - 1; } return i; };
for (const t of trips) for (const v of t.visits) {
  if (!num(v.sched_dep) || v.sched_dep < now || v.sched_dep > until || !num(v.load) || !num(t.seats)) continue;
  (boards[v.stop_id] = boards[v.stop_id] || []).push([routeIndex(t.route_id), v.sched_dep, num(v.act_dep) ? v.act_dep : v.sched_dep, v.load, t.seats]);
}
for (const id of Object.keys(boards)) boards[id] = boards[id].sort((a, b) => a[1] - b[1]).slice(0, 8);
const forecasts = {};
for (const s of (stopForecast && stopForecast.series) || []) {
  const bin = stopForecast.bin_seconds || 900;
  for (const r of s.rows) if (r.bin_start + bin > now && r.bin_start < until) (forecasts[s.id] = forecasts[s.id] || []).push([routeIndex(s.route_id), r.bin_start, r.bin_start + bin, r.forecast, r.lo, r.hi, r.origin]);
}
const names = {}; for (const s of network.stops) names[s.stop_id] = s.name;

const data = { fixture: meta.fixture === true, service_date: meta.service_date, now, offers, routes, boards, forecasts, stops: names,
  credit: (network.source && network.source.credit) || null, invented: (network.source && network.source.invented) || null };

const src = (name) => fs.readFileSync(path.join(here, 'src', name), 'utf8');
const page = src('page.html')
  .replace('/*STYLE*/', () => src('page.css'))
  .replace('/*LOGIC*/', () => src('logic.js'))
  .replace('/*SCRIPT*/', () => src('page.js'))
  .replace('"__DATA__"', () => JSON.stringify(data).replace(/</g, '\\u003c'));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), page);
const o = offers[0];
console.log(`BUILT ${out}: the Khutwa page, ${Math.round(page.length / 1024)} KB; fixture=${data.fixture}; ` +
  (o ? `${o.choices.length} choices from ${o.decision_id}` : 'no rewarded choice in this bundle') + `; ${Object.keys(boards).length} stops with buses in the hour from ${K.clock(now)}`);
