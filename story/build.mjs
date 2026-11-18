#!/usr/bin/env node
// Build the pitch from its source and pinned local Three.js dependency.
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(resolve(root,'web/package.json'));
const {build}=require('esbuild');
const args=process.argv.slice(2),at=args.indexOf('--out');
if(at<0||!args[at+1])throw new Error('Usage: node story/build.mjs --out <pitch directory>');
const out=resolve(args[at+1]);
await mkdir(resolve(out,'onday'),{recursive:true});
await mkdir(resolve(out,'voice'),{recursive:true});
await copyFile(resolve(root,'story/index.html'),resolve(out,'index.html'));
await copyFile(resolve(root,'story/presenter.html'),resolve(out,'presenter.html'));
await copyFile(resolve(root,'opendata/onday/index.html'),resolve(out,'onday/index.html'));
await copyFile(resolve(root,'opendata/onday/FORECAST-RETEST.md'),resolve(out,'onday/FORECAST-RETEST.md'));
await copyFile(resolve(root,'opendata/onday/HOW-IT-CONNECTS.md'),resolve(out,'onday/HOW-IT-CONNECTS.md'));
await copyFile(resolve(root,'live/voice/console.html'),resolve(out,'voice/index.html'));
await build({stdin:{contents:"import * as THREE from 'three'; window.THREE=THREE;",resolveDir:resolve(root,'web')},bundle:true,minify:true,format:'iife',outfile:resolve(out,'three.js'),logLevel:'silent'});
await writeFile(resolve(out,'THREE-LICENSE.txt'),await import('node:fs/promises').then(fs=>fs.readFile(resolve(root,'web/node_modules/three/LICENSE'),'utf8')));
console.log('BUILT pitch with local 3D library, recorded-day page and rehearsal dashboard');
