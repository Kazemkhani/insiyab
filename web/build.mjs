import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const args = process.argv.slice(2);
const bundle = path.resolve(args[args.indexOf('--bundle') + 1] || 'fixtures');
const out = path.resolve(args[args.indexOf('--out') + 1] || '/tmp/insiyab-site');
if (!args.includes('--bundle') || !args.includes('--out')) throw Error('Usage: node web/build.mjs --bundle <folder> --out <folder>');
if (out === root || root.startsWith(out + '/') || out === bundle || bundle.startsWith(out + '/')) throw Error('Output must not contain source or bundle');
try { await fs.access(path.join(here, 'node_modules/esbuild/lib/main.js')); }
catch { const install = spawnSync('npm', ['ci', '--prefix', here, '--no-audit', '--no-fund'], {stdio:'inherit'}); if (install.status) process.exit(install.status); }
const {build} = await import('esbuild');
const {default: QRCode} = await import('qrcode');
const checked = spawnSync('python3', [path.join(root, 'tools/contract_check.py'), bundle], {encoding:'utf8'});
if (checked.status) throw Error(checked.stdout + checked.stderr);
const names = ['meta.json','network.json','replay/index.json','forecast/boardings-route.json','forecast/boardings-stop.json','metrics.json','gap.json','decisions.json','personas.json','summary.json'];
const data = {};
for (const name of names) data[name] = JSON.parse(await fs.readFile(path.join(bundle,name),'utf8'));
for (const route of data['replay/index.json'].routes) {
  if (!/^replay\/[^/]+\.json$/.test(route.file)) throw Error('Unsafe replay path');
  data[route.file] = JSON.parse(await fs.readFile(path.join(bundle,route.file),'utf8'));
}
for (const [name,value] of Object.entries(data)) if (value.fixture !== data['meta.json'].fixture) throw Error(`Mixed bundle at ${name}`);
await fs.mkdir(out,{recursive:true});
await fs.mkdir(path.join(out,'data'),{recursive:true});
for (const [name,value] of Object.entries(data)) {
  await fs.mkdir(path.dirname(path.join(out,'data',name)),{recursive:true});
  await fs.writeFile(path.join(out,'data',name),JSON.stringify(value));
}
const firstScreenData={...data};delete firstScreenData['forecast/boardings-stop.json'];
await fs.writeFile(path.join(out,'bundle.js'), 'window.INSIYAB_BUNDLE=' + JSON.stringify(firstScreenData).replace(/</g,'\\u003c') + ';\n');
await fs.writeFile(path.join(out,'stop-forecast.js'), "window.INSIYAB_BUNDLE['forecast/boardings-stop.json']=" + JSON.stringify(data['forecast/boardings-stop.json']).replace(/</g,'\\u003c') + ';\n');
await build({entryPoints:[path.join(here,'src/app.js')],outfile:path.join(out,'app.js'),bundle:true,format:'iife',target:'es2022',minify:true,legalComments:'linked'});
for (const name of ['index.html','style.css']) await fs.copyFile(path.join(here,'src',name),path.join(out,name));
await fs.mkdir(path.join(out,'fonts'),{recursive:true});
for (const [font,subset,weights] of [['overpass','latin',[400,600]],['ibm-plex-sans','latin',[400,500]],['ibm-plex-mono','latin',[400]],['noto-kufi-arabic','arabic',[400]]]) {
  for (const weight of weights) await fs.copyFile(path.join(here,`node_modules/@fontsource/${font}/files/${font}-${subset}-${weight}-normal.woff2`),path.join(out,`fonts/${font}-${weight}.woff2`));
  await fs.copyFile(path.join(here,`node_modules/@fontsource/${font}/LICENSE`),path.join(out,`fonts/LICENSE-${font}.txt`));
}
await fs.writeFile(path.join(out,'qr.svg'),await QRCode.toString('https://insiyab.amirkazemkhani.com',{type:'svg',margin:2,color:{dark:'#12263A',light:'#F6F5F1'}}));
for (const decision of data['decisions.json'].decisions) await fs.writeFile(path.join(out,`qr-${encodeURIComponent(decision.id)}.svg`),await QRCode.toString('https://insiyab.amirkazemkhani.com/#decision-'+decision.id,{type:'svg',margin:2,color:{dark:'#12263A',light:'#F6F5F1'}}));
console.log(`BUILT ${out}: ${Object.keys(data).length} bundle files; fixture=${data['meta.json'].fixture}; local fonts, deck.gl and QR. Open index.html directly, including offline.`);
