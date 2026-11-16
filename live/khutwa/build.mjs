// Builds the Khutwa passenger page: one page for a phone, plain files, nothing fetched from another address.
//   node live/khutwa/build.mjs --bundle <bundle folder> --out <folder>
// It is placed at khutwa/ inside the public site. Everything it shows is written into the page here, from the bundle's
// rewarded-choice decision, so it opens with the network off. The room (../api/room/) is asked for, and done without.
// This page stands in until lane 3's rider/ exists; scripts/deploy.sh uses rider/ in its place the day it appears.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const bundle = arg('--bundle'); const out = arg('--out');
if (!bundle || !out) { console.error('usage: node live/khutwa/build.mjs --bundle <folder> --out <folder>'); process.exit(2); }
const read = (name) => JSON.parse(fs.readFileSync(path.join(bundle, name), 'utf8'));

const meta = read('meta.json'); const network = read('network.json'); const decisions = read('decisions.json').decisions;
const d = decisions.find((x) => x.lever === 'rewarded_choice' && x.offers && x.offers.length && x.usual) || null;
const stopName = (id) => (network.stops.find((s) => s.stop_id === id) || {}).name || 'this stop';
const routeName = (id) => (network.routes.find((r) => r.route_id === id) || {}).short_name || id;

// Only what the page shows leaves the bundle: one decision's usual bus, its offers, and the names it needs.
const data = {
  fixture: meta.fixture === true, service_date: meta.service_date,
  offer: d && {
    decision_id: d.id,
    usual: { ...d.usual, stop: stopName(d.usual.stop_id), route: routeName(d.usual.route_id) },
    choices: d.offers.map((o) => ({ ...o, stop: stopName(o.stop_id), route: routeName(o.route_id) })),
    take_up: (d.effect.find((e) => e.metric === 'passengers_shifted') || {}).assumption || null,
  },
};
if (data.offer && data.offer.choices.some((o) => typeof o.load !== 'number' || typeof o.seats !== 'number')) data.offer.choices.forEach((o) => { if (typeof o.load !== 'number' || typeof o.seats !== 'number') { o.load = null; o.seats = null; } });

const page = fs.readFileSync(path.join(here, 'page.html'), 'utf8')
  .replace('/*STYLE*/', fs.readFileSync(path.join(here, 'page.css'), 'utf8'))
  .replace('/*SCRIPT*/', fs.readFileSync(path.join(here, 'page.js'), 'utf8'))
  .replace('"__DATA__"', JSON.stringify(data).replace(/</g, '\\u003c'));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`BUILT ${out}: the Khutwa page; fixture=${data.fixture}; ${data.offer ? data.offer.choices.length + ' choices from ' + data.offer.decision_id : 'no rewarded choice in this bundle'}`);
