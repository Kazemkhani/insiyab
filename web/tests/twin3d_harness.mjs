#!/usr/bin/env node
// web/tests/twin3d_harness.mjs
// Builds a self-contained test page for twin3d.mjs into /tmp/twin3d-work/.
// Usage: node web/tests/twin3d_harness.mjs
//
// Reads fixtures at build time and embeds them inline so the page works
// with no HTTP fetches (docs/RULES.md §5.5).
// Outputs:
//   /tmp/twin3d-work/index.html
//   /tmp/twin3d-work/twin3d.bundle.js  (esbuild minified)

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../');
const outDir = '/tmp/twin3d-work';

// ── Load fixture files ───────────────────────────────────────────────────
function readJSON(rel) {
  try {
    return JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const personas  = readJSON('fixtures/personas.json');
const decisions = readJSON('fixtures/decisions.json');
const network   = readJSON('fixtures/network.json');
const meta      = readJSON('fixtures/meta.json');

if (!personas) {
  console.error('ERROR: fixtures/personas.json not found — run from repo root');
  process.exit(1);
}

// Build the bundle
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'web/src/twin3d.mjs')],
  bundle: true,
  // Three.js class declarations trigger a TDZ error when identifiers are
  // renamed by the minifier (esbuild reorders initializations).
  // Keep identifier names; compress whitespace and syntax only.
  minifyIdentifiers: false,
  minifyWhitespace: true,
  minifySyntax: true,
  format: 'esm',
  outfile: `${outDir}/twin3d.bundle.js`,
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
});

const bundleSize = readFileSync(`${outDir}/twin3d.bundle.js`).length;
console.log(`Bundle: ${(bundleSize / 1024).toFixed(1)} KB`);

// ── Build fixture bundle (inline JSON, no fetch needed) ──────────────────
const fixtureBundle = {
  'personas.json':  personas,
  'decisions.json': decisions,
  'network.json':   network,
  'meta.json':      meta,
};

// Embed bundle as a JS constant
const bundleJS = `const FIXTURE_BUNDLE = ${JSON.stringify(fixtureBundle)};`;

// ── Build HTML ────────────────────────────────────────────────────────────
// 4 personas × 2 steps = 8 panels; each has a container sized at 736x445 and 342x300
const personaIds = personas.personas.map(p => p.id);

function panelHTML(personaId, stepIdx, width, height) {
  const id = `twin-${personaId}-step${stepIdx + 1}-${width}x${height}`;
  return `
  <div class="panel">
    <div class="label">${personaId} · step ${stepIdx + 1} · ${width}×${height}</div>
    <div
      id="${id}"
      class="twin-container"
      data-persona="${personaId}"
      data-step="${stepIdx}"
      style="width:${width}px;height:${height}px;display:inline-block;border:1px solid #C3C9CF;"
    ></div>
  </div>`;
}

let panelsHTML = '';
for (const p of personas.personas) {
  for (let s = 0; s < p.steps.length; s++) {
    panelsHTML += panelHTML(p.id, s, 736, 445);
    panelsHTML += panelHTML(p.id, s, 342, 300);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>twin3d harness</title>
<style>
  body { margin: 0; background: #F6F5F1; font: 11px/1.4 'IBM Plex Sans', system-ui, sans-serif; color: #12263A; padding: 16px; }
  .panel { margin: 0 0 20px; }
  .label { margin: 0 0 4px; font-size: 10px; color: #5A6672; }
  .twin-container { vertical-align: top; }
</style>
</head>
<body>
<h1 style="font:600 16px/1 'IBM Plex Sans',sans-serif;margin:0 0 16px;">twin3d harness · ${new Date().toISOString()}</h1>
${panelsHTML}

<script>
${bundleJS}
</script>
<script type="module">
import { mountTwin } from './twin3d.bundle.js';

const bundle = FIXTURE_BUNDLE;
const personas = bundle['personas.json'].personas;
window._twins = {};

for (const person of personas) {
  for (let stepIdx = 0; stepIdx < person.steps.length; stepIdx++) {
    const step = person.steps[stepIdx];
    for (const [w, h] of [[736, 445], [342, 300]]) {
      const id = \`twin-\${person.id}-step\${stepIdx + 1}-\${w}x\${h}\`;
      const container = document.getElementById(id);
      if (!container) continue;
      try {
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const twin = mountTwin(container, { person, step, bundle, reducedMotion });
        window._twins[id] = twin;
      } catch (err) {
        container.innerHTML = '<p style="padding:8px;color:#B23A2E;">' + err.message + '</p>';
        console.error(id, err);
      }
    }
  }
}
</script>
</body>
</html>`;

writeFileSync(`${outDir}/index.html`, html, 'utf8');
console.log(`Wrote ${outDir}/index.html`);
console.log(`Containers: ${personas.personas.reduce((n, p) => n + p.steps.length * 2, 0)}`);
