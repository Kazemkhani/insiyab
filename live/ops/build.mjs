#!/usr/bin/env node
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateJudge} from './src/judge.mjs';
import {createRequire} from 'node:module';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const require = createRequire(resolve(root, 'web/package.json'));
const {build} = require('esbuild');
const args = process.argv.slice(2), at = args.indexOf('--out');
if (at < 0 || !args[at + 1]) throw Error('Usage: node live/ops/build.mjs --out <directory>');
const out = resolve(args[at + 1]);
if (out === root || root.startsWith(out + '/') || out.startsWith(root + '/')) throw Error('Build outside the source tree');
await mkdir(out, {recursive: true});
const logo = await readFile(resolve(root, 'brand/assets/logo/insiyab-lockup-ink.svg'), 'utf8');
const html = await readFile(resolve(here, 'src/index.html'), 'utf8');
await writeFile(resolve(out, 'index.html'), html.replace('<!-- LOGO -->', logo));
await copyFile(resolve(here, 'src/style.css'), resolve(out, 'style.css'));
await copyFile(resolve(root, 'brand/assets/tokens.css'), resolve(out, 'tokens.css'));
await mkdir(resolve(out, 'fonts'), {recursive: true});
for (const [font, weights] of [['overpass', [400, 600]], ['ibm-plex-sans', [400, 500]], ['ibm-plex-mono', [400]]]) {
  for (const weight of weights) await copyFile(resolve(root, `web/node_modules/@fontsource/${font}/files/${font}-latin-${weight}-normal.woff2`), resolve(out, `fonts/${font}-${weight}.woff2`));
  await copyFile(resolve(root, `web/node_modules/@fontsource/${font}/LICENSE`), resolve(out, `fonts/LICENSE-${font}.txt`));
}
const bundle = {};
for (const name of ['meta.json', 'network.json', 'replay/index.json']) bundle[name] = JSON.parse(await readFile(resolve(root, 'fixtures', name), 'utf8'));
for (const route of bundle['replay/index.json'].routes) {
  if (!/^replay\/[^/]+\.json$/.test(route.file)) throw Error('Unsafe replay path');
  bundle[route.file] = JSON.parse(await readFile(resolve(root, 'fixtures', route.file), 'utf8'));
}
async function optionalJSON(primary, fallback) {
  try { return JSON.parse(await readFile(resolve(root, primary), 'utf8')); }
  catch (error) {if (error.code !== 'ENOENT') throw error; return JSON.parse(await readFile(resolve(here, fallback), 'utf8'));}
}
const alerts = await optionalJSON('fixtures/watchers/alerts.json', 'demo/alerts.json');
if (typeof alerts.fixture !== 'boolean' || !Array.isArray(alerts.alerts)) throw Error('Invalid alerts file');
const judge = validateJudge(await optionalJSON('artifacts/forecast/judge_pick.json', 'demo/judge_pick.json'));
await writeFile(resolve(out, 'data.js'), 'window.INSIYAB_OPS_DATA=' + JSON.stringify({bundle, alerts, judge}).replace(/</g, '\\u003c') + ';');
await mkdir(resolve(out, 'map'), {recursive:true});
const mapBytes = await readFile(resolve(root, 'web/assets/map/dubai.pmtiles'));
await writeFile(resolve(out, 'map/dubai.pmtiles'), mapBytes);
await writeFile(resolve(out, 'map/offline.js'), 'window.INSIYAB_MAP_BYTES=' + JSON.stringify(mapBytes.toString('base64')) + ';');
await copyFile(resolve(root, 'opendata/public/basemap/PROVENANCE.md'), resolve(out, 'MAP-NOTICE.md'));
await copyFile(resolve(root, 'opendata/public/rta-gtfs/PROVENANCE.md'), resolve(out, 'NETWORK-NOTICE.md'));
await copyFile(resolve(root, 'web/node_modules/maplibre-gl/dist/maplibre-gl.css'), resolve(out, 'maplibre.css'));
await mkdir(resolve(out, 'sounds'), {recursive:true});
await copyFile(resolve(here, 'sounds/ring.mp3'), resolve(out, 'sounds/ring.mp3'));
await mkdir(resolve(out, 'icons'), {recursive:true});
for (const role of ['driver','depot','station','planning']) await copyFile(resolve(root, `brand/assets/icons/${role}.svg`), resolve(out, `icons/${role}.svg`));
await copyFile(resolve(root, 'web/node_modules/three/LICENSE'), resolve(out, 'THREE-LICENSE.txt'));
await build({entryPoints: [resolve(here, 'src/app.js')], outfile: resolve(out, 'app.js'), nodePaths: [resolve(root, 'web/node_modules')], bundle: true, format: 'iife', target: 'es2022', minify: true, legalComments: 'linked'});
console.log(`BUILT Insiyab Live demo: ${out}`);
