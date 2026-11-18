#!/usr/bin/env node
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
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
await build({entryPoints: [resolve(here, 'src/app.js')], outfile: resolve(out, 'app.js'), nodePaths: [resolve(root, 'web/node_modules')], bundle: true, format: 'iife', target: 'es2022', minify: true, legalComments: 'linked'});
console.log(`BUILT Insiyab Live demo: ${out}`);
