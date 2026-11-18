/* script.js — Insiyab Dataiku webapp
 *
 * No external dependencies.  All charts are inline SVG built here.
 * getWebAppBackendUrl(path) is provided by Dataiku's runtime.
 *
 * Tab order and data sources:
 *   The day              punctuality_by_hour, demand_by_hour
 *   Passenger demand     demand_by_hour, demand_by_route_hour, demand_by_stop
 *   Service reliability  punctuality_by_route_hour, punctuality_by_bus_type
 *   Supply and capacity  supply_vs_demand_by_route_hour, supply_status_by_hour
 *   Forecast             running_time_metrics, running_time_forecast (aggregated),
 *                        running_time_drivers, running_time_bands (optional)
 *   What if              supply_vs_demand_by_route_hour (browser computation)
 *   How it is built      static
 */

// ── Colour tokens (match story/index.html exactly) ──────────────────
const C = {
  // Brand palette
  sand:     '#F5EFE3',   // page background
  card:     '#FFFCF6',   // card background
  line:     '#E4D9C4',   // borders / grid lines
  ink:      '#1E1A16',   // body text
  muted:    '#6F6350',   // secondary text / axis labels
  sea:      '#0E5A73',   // model line, on-time, in-balance, the forecast
  red:      '#E21F26',   // LATENESS AND SHORTFALL ONLY
  gold:     '#C8A24A',   // simple-rule bar, accents
  goldtext: '#7E5F17',   // text on gold chip
  neutral:  '#D8CBB2',   // timetable / neutral bars / boardings area
  // Aliases used throughout existing chart code
  paper:    '#F5EFE3',   // = sand
  flow:     '#0E5A73',   // = sea
  over:     '#E21F26',   // = red
  spare:    '#D8CBB2',   // boardings line/area (neutral, not blue)
  sim:      '#7E5F17',   // simulated text
  g1:       '#E4D9C4',   // = line (grid)
  g2:       '#E4D9C4',   // = line (axis)
  g3:       '#6F6350',   // = muted
  g4:       '#6F6350',   // = muted
};

// ── State ────────────────────────────────────────────────────────────
const S = {
  pHour: null, pRouteHour: null, pBusType: null,
  dHour: null, dRouteHour: null, dStop: null,
  supply: null, supplyStatus: null,
  supplyHour: null, demandRoute: null,
  // Forecast zone state
  fcMetrics: null, fcSummary: null, fcDrivers: null, fcBands: null,
  fcRoute: null,          // currently selected route in the trip chart
  fcPlannerRoute: null,   // currently selected route in the planner chart
  // Worklist state (undefined = not yet fetched; null = fetched but absent)
  wlBands: undefined, wlLedger: undefined,
  wlAccepted: {},         // row key -> true
  wlSetAside: {},         // row key -> true
  wi: { addBuses: 0, useDouble: false, route: null, hour: null, donor: '' },
};

// ── Utilities ─────────────────────────────────────────────────────────
function fmtHour(h) {
  if (h == null) return '';
  if (h >= 24) {
    const hh = (h - 24).toString().padStart(2, '0');
    return hh + ':00 (next day)';
  }
  return h.toString().padStart(2, '0') + ':00';
}

// Short form for chart axis labels where space is limited
function fmtHourShort(h) {
  if (h == null) return '';
  const hh = (h % 24).toString().padStart(2, '0');
  return hh + ':00';
}

function fmtPct(v, digits) {
  if (v == null) return '—';
  return (Number(v) * 100).toFixed(digits == null ? 1 : digits) + '%';
}

function fmtNum(v, dec) {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-GB', {
    maximumFractionDigits: dec == null ? 0 : dec,
  });
}

function fmtSec(v) {
  if (v == null) return '—';
  const s = Math.round(Number(v));
  return s >= 60
    ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s'
    : s + ' s';
}

// ── API helpers ───────────────────────────────────────────────────────
async function apiFetch(path) {
  const url = getWebAppBackendUrl(path);
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error('Network error: ' + e.message);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status);
  return json;
}

function setLoading(el, msg) {
  el.innerHTML = '<p class="loading">' + (msg || 'Loading…') + '</p>';
}

function setError(el, msg) {
  el.innerHTML = '<p class="api-error">' + msg + '</p>';
}

function setNotBuilt(el, label) {
  el.innerHTML = '<p class="not-built">The ' + label + ' step has not been built yet.</p>';
}

// ── SVG helpers ───────────────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';

function se(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  }
  return e;
}

function seText(x, y, text, attrs) {
  const e = se('text', Object.assign({ x, y }, attrs));
  e.textContent = text;
  return e;
}

function seLine(x1, y1, x2, y2, attrs) {
  return se('line', Object.assign({ x1, y1, x2, y2 }, attrs));
}

function seRect(x, y, w, h, attrs) {
  return se('rect', Object.assign({ x, y, width: w, height: h }, attrs));
}

function scaleLinear(d0, d1, r0, r1) {
  if (d1 === d0) return function() { return r0; };
  return function(v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
}

function niceMax(vals) {
  const m = Math.max.apply(null, vals.filter(function(v) { return v != null && !isNaN(v); }));
  if (!m || m <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(m)));
  return Math.ceil(m / exp) * exp;
}

function colorInterp(c1, c2, t) {
  const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
  const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
  const r = Math.round(r1 + t*(r2-r1));
  const g = Math.round(g1 + t*(g2-g1));
  const b = Math.round(b1 + t*(b2-b1));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function makeSvg(vw, vh, label) {
  const svg = se('svg', {
    viewBox: '0 0 ' + vw + ' ' + vh,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': label || '',
    style: 'width:100%;height:auto;overflow:visible',
  });
  return svg;
}

// ── Dual-axis line chart: lateness (left) + boardings (right) by hour ─
function buildDualLine(data, opts) {
  // data: [{hour, late5, boardings, count?}]
  // opts.minLatenessCount: skip lateness for hours with fewer departures
  opts = opts || {};
  const minCount = opts.minLatenessCount || 0;
  const W = 760, H = 240;
  const ml = 64, mr = 68, mt = 24, mb = 52;
  const iW = W - ml - mr, iH = H - mt - mb;

  const hours  = data.map(function(d) { return d.hour; });
  const minH   = Math.min.apply(null, hours);
  const maxH   = Math.max.apply(null, hours);
  const maxL   = niceMax(data.map(function(d) { return d.late5; }));
  const maxB   = niceMax(data.map(function(d) { return d.boardings; }));

  const xS = scaleLinear(minH, maxH, 0, iW);
  const yL = scaleLinear(0, maxL, iH, 0);
  const yR = scaleLinear(0, maxB, iH, 0);

  const svg = makeSvg(W, H, 'Share of late departures and total boardings by hour');
  const g = se('g', { transform: 'translate(' + ml + ',' + mt + ')' });
  svg.appendChild(g);

  // Grid + left axis
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const vL = maxL * i / ticks;
    const y = yL(vL);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1, 'stroke-width': 1 }));
    g.appendChild(seText(-6, y + 4, fmtPct(vL, 0), {
      'text-anchor': 'end', 'font-size': 11, fill: C.over,
    }));
    // Right axis
    const vR = maxB * i / ticks;
    g.appendChild(seText(iW + 6, y + 4, fmtNum(vR), {
      'text-anchor': 'start', 'font-size': 11, fill: C.spare,
    }));
  }

  // Boardings area + line
  let bPath = data.map(function(d, i) {
    return (i === 0 ? 'M' : 'L') + xS(d.hour).toFixed(1) + ',' + yR(d.boardings || 0).toFixed(1);
  }).join(' ');
  const bArea = bPath + ' L' + xS(maxH).toFixed(1) + ',' + iH + ' L' + xS(minH).toFixed(1) + ',' + iH + ' Z';
  g.appendChild(se('path', { d: bArea, fill: C.spare, opacity: 0.12, stroke: 'none' }));
  g.appendChild(se('path', { d: bPath, fill: 'none', stroke: C.spare, 'stroke-width': 2 }));

  // Lateness line: only hours with count >= minCount (fix D — spikes from handful of departures)
  const lateData = minCount > 0 ? data.filter(function(d) { return (d.count || 0) >= minCount; }) : data;
  if (lateData.length >= 2) {
    // Build connected segments (gaps where count < minCount)
    let lPath = '';
    lateData.forEach(function(d, i) {
      const cmd = (i === 0) ? 'M' : 'L';
      lPath += cmd + xS(d.hour).toFixed(1) + ',' + yL(d.late5 || 0).toFixed(1) + ' ';
    });
    g.appendChild(se('path', { d: lPath.trim(), fill: 'none', stroke: C.over, 'stroke-width': 2.5 }));
  }

  // X axis
  g.appendChild(seLine(0, iH, iW, iH, { stroke: C.g2 }));
  data.forEach(function(d) {
    if (d.hour % 3 !== 0 && data.length > 10) return;
    const x = xS(d.hour);
    g.appendChild(seLine(x, iH, x, iH + 5, { stroke: C.g2 }));
    g.appendChild(seText(x, iH + 18, fmtHourShort(d.hour), {
      'text-anchor': 'middle', 'font-size': 11, fill: C.g4,
    }));
  });

  // Axis labels (rotated)
  const lbl1 = se('text', { 'text-anchor': 'middle', 'font-size': 11, fill: C.over,
    transform: 'translate(-48,' + (iH/2) + ') rotate(-90)' });
  lbl1.textContent = '5+ min late %';
  g.appendChild(lbl1);

  const lbl2 = se('text', { 'text-anchor': 'middle', 'font-size': 11, fill: C.spare,
    transform: 'translate(' + (iW+52) + ',' + (iH/2) + ') rotate(90)' });
  lbl2.textContent = 'boardings';
  g.appendChild(lbl2);

  // Legend
  const lx = 4;
  g.appendChild(seLine(lx, mt - 8, lx + 18, mt - 8, { stroke: C.over, 'stroke-width': 2.5 }));
  g.appendChild(seText(lx + 22, mt - 4, '5+ min late (left axis)', { 'font-size': 11, fill: C.ink }));
  g.appendChild(seLine(lx + 180, mt - 8, lx + 198, mt - 8, { stroke: C.spare, 'stroke-width': 2 }));
  g.appendChild(seText(lx + 202, mt - 4, 'boardings (right axis)', { 'font-size': 11, fill: C.ink }));

  return svg;
}

// ── Simple bar chart ──────────────────────────────────────────────────
function buildBar(data, xKey, yKey, cfg) {
  cfg = cfg || {};
  const color  = cfg.color || C.spare;
  const yLabel = cfg.yLabel || '';
  const W = cfg.W || 560, H = cfg.H || 200;
  const ml = 60, mr = 20, mt = 20, mb = 44;
  const iW = W - ml - mr, iH = H - mt - mb;

  const vals = data.map(function(d) { return Number(d[yKey]) || 0; });
  const maxY = niceMax(vals);
  const yS = scaleLinear(0, maxY, iH, 0);
  const bW = Math.max(4, (iW / data.length) * 0.65);
  const bGap = iW / data.length;

  const svg = makeSvg(W, H, yLabel + ' by ' + xKey);
  const g = se('g', { transform: 'translate(' + ml + ',' + mt + ')' });
  svg.appendChild(g);

  // Y ticks
  for (let i = 0; i <= 4; i++) {
    const v = maxY * i / 4;
    const y = yS(v);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-6, y + 4, fmtNum(v), { 'text-anchor': 'end', 'font-size': 11, fill: C.g4 }));
  }

  // Bars
  data.forEach(function(d, i) {
    const x = i * bGap + (bGap - bW) / 2;
    const y = yS(Number(d[yKey]) || 0);
    const h = iH - y;
    if (h > 0) {
      g.appendChild(seRect(x, y, bW, h, { fill: color, rx: 1 }));
    }
  });

  // X axis + labels
  g.appendChild(seLine(0, iH, iW, iH, { stroke: C.g2 }));
  data.forEach(function(d, i) {
    if (i % 3 !== 0 && data.length > 8) return;
    const x = i * bGap + bGap / 2;
    g.appendChild(seText(x, iH + 16, fmtHourShort(d[xKey]), {
      'text-anchor': 'middle', 'font-size': 11, fill: C.g4,
    }));
  });

  if (yLabel) {
    const lbl = se('text', {
      'text-anchor': 'middle', 'font-size': 11, fill: C.g4,
      transform: 'translate(-44,' + (iH/2) + ') rotate(-90)',
    });
    lbl.textContent = yLabel;
    g.appendChild(lbl);
  }

  return svg;
}

// ── Heatmap: routes x hours, coloured by late_5min_avg ───────────────
function buildHeatmap(data) {
  // Find top 25 routes by total count
  const totals = {};
  data.forEach(function(r) {
    totals[r.route] = (totals[r.route] || 0) + (Number(r.count) || 0);
  });
  const top25 = Object.keys(totals)
    .sort(function(a,b) { return totals[b] - totals[a]; })
    .slice(0, 25);

  const hours = [];
  const hSet = {};
  data.forEach(function(r) { if (!hSet[r.hour]) { hSet[r.hour] = 1; hours.push(r.hour); } });
  hours.sort(function(a,b) { return a-b; });

  // Matrix
  const mx = {};
  data.forEach(function(r) {
    if (top25.indexOf(r.route) < 0) return;
    if (!mx[r.route]) mx[r.route] = {};
    mx[r.route][r.hour] = { v: Number(r.late_5min_avg) || 0, c: Number(r.count) || 0 };
  });

  const maxLate = (function() {
    let m = 0;
    data.forEach(function(r) {
      if (Number(r.count) >= 20 && Number(r.late_5min_avg) > m)
        m = Number(r.late_5min_avg);
    });
    return m || 0.5;
  })();

  const cellW = 28, cellH = 20, labelW = 64, padB = 32;
  const W = labelW + hours.length * cellW;
  const H = top25.length * cellH + padB;

  const svg = se('svg', {
    viewBox: '0 0 ' + W + ' ' + H,
    preserveAspectRatio: 'xMinYMin meet',
    style: 'min-width:' + Math.min(W, 760) + 'px;width:' + W + 'px;height:auto',
    role: 'img',
    'aria-label': 'Route-hour lateness heatmap, 5+ min late %',
  });

  top25.forEach(function(route, ri) {
    const y = ri * cellH;
    const lbl = seText(labelW - 4, y + cellH * 0.72, route, {
      'text-anchor': 'end', 'font-size': 10, fill: C.ink, 'font-weight': 600,
    });
    svg.appendChild(lbl);

    hours.forEach(function(h, hi) {
      const x = labelW + hi * cellW;
      const cell = mx[route] && mx[route][h];
      let fill;
      if (!cell || cell.c < 20) {
        fill = C.g1;
      } else {
        const t = Math.min(1, cell.v / maxLate);
        fill = colorInterp(C.paper, C.over, t);
      }
      svg.appendChild(seRect(x + 1, y + 1, cellW - 2, cellH - 2, { fill: fill, rx: 1 }));
    });
  });

  // Hour labels (every 3)
  hours.forEach(function(h, hi) {
    if (h % 3 !== 0 && hours.length > 12) return;
    const x = labelW + hi * cellW + cellW / 2;
    svg.appendChild(seText(x, top25.length * cellH + 20, fmtHourShort(h), {
      'text-anchor': 'middle', 'font-size': 10, fill: C.g4,
    }));
  });

  // Colour scale legend
  const lx = labelW;
  const ly = top25.length * cellH + 28;
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    svg.appendChild(seRect(lx + i * 20, ly - 2, 20, 8, {
      fill: colorInterp(C.paper, C.over, t),
    }));
  }
  svg.appendChild(seText(lx, ly + 12, '0%', { 'font-size': 9, fill: C.g4 }));
  svg.appendChild(seText(lx + steps * 20 + 20, ly + 12,
    fmtPct(maxLate, 0), { 'text-anchor': 'end', 'font-size': 9, fill: C.g4 }));
  svg.appendChild(seText(lx + (steps * 10) + 10, ly + 12, 'late %',
    { 'text-anchor': 'middle', 'font-size': 9, fill: C.g3 }));

  return svg;
}

// ── Stacked bar chart: status by hour ─────────────────────────────────
const STATUS_ORDER = [
  { key: 'short even with standing', color: '#7A1A14'   },
  { key: 'short of seats',           color: C.red      },
  { key: 'in balance',               color: C.sea      },
  { key: 'under a fifth used',       color: C.neutral  },
  { key: 'route not in the running-time table', color: C.muted },
];

function buildStackedBar(data) {
  // data: [{hour, status, count}]
  const hours = [];
  const hSet = {};
  data.forEach(function(r) { if (!hSet[r.hour]) { hSet[r.hour] = 1; hours.push(r.hour); } });
  hours.sort(function(a,b) { return a-b; });

  const byHour = {};
  hours.forEach(function(h) { byHour[h] = {}; });
  data.forEach(function(r) { byHour[r.hour][r.status] = Number(r.count) || 0; });

  const totals = hours.map(function(h) {
    return STATUS_ORDER.reduce(function(s, st) { return s + (byHour[h][st.key] || 0); }, 0);
  });
  const maxT = niceMax(totals);

  const W = 760, H = 220;
  const ml = 55, mr = 20, mt = 20, mb = 44;
  const iW = W - ml - mr, iH = H - mt - mb;
  const bGap = iW / hours.length;
  const bW = Math.max(4, bGap * 0.65);
  const yS = scaleLinear(0, maxT, iH, 0);

  const svg = makeSvg(W, H, 'Route count by status and hour');
  const g = se('g', { transform: 'translate(' + ml + ',' + mt + ')' });
  svg.appendChild(g);

  // Y ticks
  for (let i = 0; i <= 4; i++) {
    const v = maxT * i / 4;
    const y = yS(v);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-6, y + 4, fmtNum(v), { 'text-anchor': 'end', 'font-size': 11, fill: C.g4 }));
  }

  // Stacked bars
  hours.forEach(function(h, i) {
    const x = i * bGap + (bGap - bW) / 2;
    let yBase = iH;
    STATUS_ORDER.forEach(function(st) {
      const v = byHour[h][st.key] || 0;
      if (!v) return;
      const barH = iH - yS(v);
      if (barH > 0) {
        yBase -= barH;
        g.appendChild(seRect(x, yBase, bW, barH, { fill: st.color, rx: 1 }));
      }
    });
    if (h % 3 === 0 || hours.length <= 8) {
      g.appendChild(seText(i * bGap + bGap / 2, iH + 16, fmtHourShort(h), {
        'text-anchor': 'middle', 'font-size': 11, fill: C.g4,
      }));
    }
  });

  g.appendChild(seLine(0, iH, iW, iH, { stroke: C.g2 }));

  // Y label
  const lbl = se('text', { 'text-anchor': 'middle', 'font-size': 11, fill: C.g4,
    transform: 'translate(-40,' + (iH/2) + ') rotate(-90)' });
  lbl.textContent = 'routes';
  g.appendChild(lbl);

  return svg;
}

// ── Build status legend for supply tab ───────────────────────────────
function buildStatusLegend(container) {
  container.innerHTML = '';
  STATUS_ORDER.forEach(function(st) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:var(--sz11)';
    const swatch = document.createElement('span');
    swatch.style.cssText = 'display:inline-block;width:12px;height:12px;border-radius:2px;background:' + st.color;
    const label = document.createElement('span');
    label.style.color = C.ink;
    label.textContent = st.key;
    wrap.appendChild(swatch);
    wrap.appendChild(label);
    container.appendChild(wrap);
  });
}

// ── Tab 1: The day ────────────────────────────────────────────────────
async function renderDay() {
  const chartEl = document.getElementById('day-chart');
  const whyEl   = document.getElementById('day-why');

  setLoading(chartEl);

  try {
    const [ph, dh] = await Promise.all([
      S.pHour  || apiFetch('/api/punctuality-by-hour').then(function(d) { return (S.pHour = d); }),
      S.dHour  || apiFetch('/api/demand-by-hour').then(function(d) { return (S.dHour = d); }),
    ]);

    // Fill the four stat tiles using 08:00 and 18:00 specifically
    var ph8  = ph.find(function(r) { return r.hour === 8;  });
    var ph18 = ph.find(function(r) { return r.hour === 18; });
    var dh8  = dh.find(function(r) { return r.hour === 8;  });
    var dh18 = dh.find(function(r) { return r.hour === 18; });
    var setTile = function(id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val || '';
    };
    setTile('day-b8',  fmtNum(dh8  && dh8.boardings_sum));
    setTile('day-l8',  fmtPct(ph8  && ph8.late_5min_avg, 0));
    setTile('day-b18', fmtNum(dh18 && dh18.boardings_sum));
    setTile('day-l18', fmtPct(ph18 && ph18.late_5min_avg, 0));

    // Dual-axis chart: lateness line drawn only for hours with >= 500 departures
    var chartData = ph.map(function(r) {
      var dRow = dh.find(function(d) { return d.hour === r.hour; });
      return {
        hour:      r.hour,
        late5:     Number(r.late_5min_avg) || 0,
        boardings: dRow ? Number(dRow.boardings_sum) || 0 : 0,
        count:     Number(r.count) || 0,
      };
    }).sort(function(a, b) { return a.hour - b.hour; });

    chartEl.innerHTML = '';
    chartEl.appendChild(buildDualLine(chartData, { minLatenessCount: 500 }));

    // Why copy
    if (whyEl) {
      whyEl.innerHTML =
        '<strong>What this is:</strong> measured departures and nol card boardings, 15 December 2025. ' +
        '<strong>Finding:</strong> lateness and demand peak in the same two hours. ' +
        '<strong>Open question:</strong> whether the bus shortage causes the lateness, or lateness ' +
        'causes missed connections that inflate boardings, is not settled here.' +
        '<br><span style="font-size:var(--sz11);color:var(--muted)">Lateness line shown only for hours with 500 or more recorded departures.</span>';
    }

    // Worklist link
    var wlLink = document.getElementById('day-worklist-link');
    if (wlLink) wlLink.style.display = '';

    // Presenter notes for this tab
    _presenterData.day = {
      say: 'These are records from 15 December 2025. At eight in the morning we counted ' + fmtNum(dh8 && dh8.boardings_sum) + ' boardings; at six in the evening, ' + fmtNum(dh18 && dh18.boardings_sum) + '. Those totals are similar, but the share of late stop departures rose from ' + fmtPct(ph8 && ph8.late_5min_avg,0) + ' to ' + fmtPct(ph18 && ph18.late_5min_avg,0) + '. That made us investigate whether the timetable gives evening trips enough time. This comparison does not prove the cause.',
      point: 'the red lateness line peaking in the right half of the chart',
      next: 'tab 2 — Planner\'s worklist',
    };
    _updatePresenterPanel('day');

  } catch (e) {
    setError(chartEl, e.message);
  }
}

function stat(val, label, source, kind) {
  return '<div class="stat-box' + (kind ? ' stat-' + kind : '') + '">' +
    '<div class="stat-val">' + val + '</div>' +
    '<div class="stat-label">' + label + '</div>' +
    '<div class="stat-source">' + source + '</div>' +
    '</div>';
}

// ── Tab 2: Service reliability ────────────────────────────────────────
async function renderReliability() {
  const hmEl   = document.getElementById('reliability-heatmap');
  const rlEl   = document.getElementById('reliability-ranklist');
  const btEl   = document.getElementById('reliability-bustype');

  setLoading(hmEl);
  setLoading(rlEl);
  setLoading(btEl);

  try {
    if (!S.pRouteHour) S.pRouteHour = await apiFetch('/api/punctuality-by-route-hour');
    if (!S.pBusType)   S.pBusType   = await apiFetch('/api/punctuality-by-bus-type');

    // Heatmap
    hmEl.innerHTML = '';
    hmEl.appendChild(buildHeatmap(S.pRouteHour));

    // Rank list: worst route-hours by late_5min_avg, count >= 20
    const eligible = S.pRouteHour.filter(function(r) { return Number(r.count) >= 20; });
    const sorted = eligible.slice().sort(function(a,b) {
      return Number(b.late_5min_avg) - Number(a.late_5min_avg);
    });
    const top15 = sorted.slice(0, 15);
    if (top15.length) {
      let html = '<ol class="rank-list">';
      top15.forEach(function(r, i) {
        html += '<li>' +
          '<span class="rank-num">' + (i+1) + '</span>' +
          '<span class="rank-label">' + r.route + ' at ' + fmtHour(r.hour) + '</span>' +
          '<span class="rank-val">' + fmtPct(r.late_5min_avg, 0) + '</span>' +
          '<span class="rank-sub">(' + fmtNum(r.count) + ' dep.)</span>' +
          '</li>';
      });
      html += '</ol>';
      rlEl.innerHTML = html;
    } else {
      rlEl.innerHTML = '<p class="note">No route-hours with 20+ departures found.</p>';
    }

    // Bus type table
    const btsorted = S.pBusType.slice().sort(function(a,b) {
      return Number(b.late_5min_avg) - Number(a.late_5min_avg);
    });
    let html2 = '<ol class="rank-list">';
    btsorted.forEach(function(r) {
      const bt = r.bus_type || '(unknown)';
      html2 += '<li>' +
        '<span class="rank-label">' + bt + '</span>' +
        '<span class="rank-val">' + fmtPct(r.late_5min_avg, 0) + '</span>' +
        '<span class="rank-sub">' + fmtNum(r.count) + ' dep. | ' + fmtSec(r.late_s_avg) + ' avg</span>' +
        '</li>';
    });
    html2 += '</ol>';
    btEl.innerHTML = html2;

  } catch (e) {
    setError(hmEl, e.message);
    setError(rlEl, e.message);
    setError(btEl, e.message);
  }
}

// ── Tab 3: Passenger demand ───────────────────────────────────────────
async function renderDemand() {
  const hourEl  = document.getElementById('demand-hour-chart');
  const stopEl  = document.getElementById('demand-stops');
  const selEl   = document.getElementById('demand-route-sel');
  const rchEl   = document.getElementById('demand-route-chart');

  setLoading(hourEl);
  setLoading(stopEl);

  try {
    if (!S.dHour)      S.dHour      = await apiFetch('/api/demand-by-hour');
    if (!S.dRouteHour) S.dRouteHour = await apiFetch('/api/demand-by-route-hour');
    if (!S.dStop)      S.dStop      = await apiFetch('/api/demand-by-stop');

    // Fill headline spans
    var dh8  = S.dHour.find(function(r) { return r.hour === 8; });
    var dh18 = S.dHour.find(function(r) { return r.hour === 18; });
    var hlB8  = document.getElementById('dem-hl-b8');
    var hlB18 = document.getElementById('dem-hl-b18');
    if (hlB8)  hlB8.textContent  = fmtNum(dh8  && dh8.boardings_sum);
    if (hlB18) hlB18.textContent = fmtNum(dh18 && dh18.boardings_sum);

    // Boardings by hour
    hourEl.innerHTML = '';
    const hourData = S.dHour.slice().sort(function(a,b) { return a.hour - b.hour; });
    hourEl.appendChild(buildBar(hourData, 'hour', 'boardings_sum', {
      color: C.neutral, yLabel: 'boardings',
    }));

    // Top 15 stops
    if (S.dStop.length) {
      let html = '<ol class="rank-list">';
      S.dStop.forEach(function(r, i) {
        html += '<li>' +
          '<span class="rank-num">' + (i+1) + '</span>' +
          '<span class="rank-label">' + (r.stop_name || r.stop_id) + '</span>' +
          '<span class="rank-val">' + fmtNum(r.boardings_sum) + '</span>' +
          '<span class="rank-sub">boardings</span>' +
          '</li>';
      });
      html += '</ol>';
      stopEl.innerHTML = html;
    } else {
      stopEl.innerHTML = '<p class="note">No stop data available.</p>';
    }

    // Route selector
    const routes = [];
    const rSet = {};
    S.dRouteHour.forEach(function(r) { if (!rSet[r.route]) { rSet[r.route] = 1; routes.push(r.route); } });
    routes.sort();
    selEl.innerHTML = '<option value="">pick a route</option>';
    routes.forEach(function(r) {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      selEl.appendChild(opt);
    });

    // Restore selection
    if (S.demandRoute) selEl.value = S.demandRoute;

    selEl.onchange = function() {
      S.demandRoute = selEl.value;
      renderRouteDetail(rchEl);
    };

    if (S.demandRoute) renderRouteDetail(rchEl);

  } catch (e) {
    setError(hourEl, e.message);
    setError(stopEl, e.message);
  }
}

function renderRouteDetail(container) {
  const route = S.demandRoute;
  if (!route || !S.dRouteHour) {
    container.innerHTML = '<p class="note">Select a route above.</p>';
    return;
  }
  const rows = S.dRouteHour
    .filter(function(r) { return r.route === route; })
    .sort(function(a,b) { return a.hour - b.hour; });
  if (!rows.length) {
    container.innerHTML = '<p class="note">No data for route ' + route + '.</p>';
    return;
  }
  container.innerHTML = '';
  container.appendChild(buildBar(rows, 'hour', 'boardings_sum', {
    color: C.flow, yLabel: 'boardings',
    W: 460, H: 180,
  }));
  const p = document.createElement('p');
  p.className = 'caption';
  p.textContent = 'Route ' + route + ' boardings by hour. Source: demand_by_route_hour';
  container.appendChild(p);
}

// ── Tab 4: Supply and capacity ────────────────────────────────────────
async function renderSupply() {
  const selEl    = document.getElementById('supply-hour-sel');
  const detailEl = document.getElementById('supply-hour-detail');
  const chartEl  = document.getElementById('supply-status-chart');
  const legendEl = document.getElementById('supply-legend');

  setLoading(chartEl);

  try {
    if (!S.supply)       S.supply       = await apiFetch('/api/supply-vs-demand');
    if (!S.supplyStatus) S.supplyStatus = await apiFetch('/api/supply-status-by-hour');

    // Hour selector
    const hours = [];
    const hSet = {};
    S.supply.forEach(function(r) { if (!hSet[r.hour]) { hSet[r.hour] = 1; hours.push(r.hour); } });
    hours.sort(function(a,b) { return a-b; });
    selEl.innerHTML = '<option value="">pick an hour</option>';
    hours.forEach(function(h) {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = fmtHour(h);
      selEl.appendChild(opt);
    });

    // If not already selected, auto-select the peak short hour (15:00-20:00)
    if (!S.supplyHour) {
      const shortCountsByHour = {};
      const spareCountsByHour = {};
      S.supplyStatus.forEach(function(r) {
        const h = r.hour;
        if (h < 15 || h > 20) return;
        if (r.status === 'short of seats' || r.status === 'short even with standing') {
          shortCountsByHour[h] = (shortCountsByHour[h] || 0) + Number(r.count || 0);
        }
        if (r.status === 'under a fifth used') {
          spareCountsByHour[h] = (spareCountsByHour[h] || 0) + Number(r.count || 0);
        }
      });
      let peakH = null, peakCount = -1;
      Object.keys(shortCountsByHour).forEach(function(h) {
        const c = shortCountsByHour[h];
        if (c > peakCount) { peakCount = c; peakH = Number(h); }
      });
      if (peakH != null) S.supplyHour = peakH;
    }

    if (S.supplyHour) selEl.value = S.supplyHour;

    // Fill headline span with routes-short count at 18:00
    var hlN = document.getElementById('sup-hl-n');
    if (hlN) {
      var shortAt18 = 0;
      S.supplyStatus.forEach(function(r) {
        if (r.hour === 18 && (r.status === 'short of seats' || r.status === 'short even with standing')) {
          shortAt18 += Number(r.count || 0);
        }
      });
      hlN.textContent = fmtNum(shortAt18);
    }

    // Lead sentence: routes short and routes with room at the chosen hour, and the hour of the day with most room.
    // One function, so the first paint and a change of hour can never disagree.
    function supplyLead(hour) {
      var shortN = 0, spareN = 0, spareByHour = {};
      S.supplyStatus.forEach(function(r) {
        var n = Number(r.count || 0);
        if (r.status === 'under a fifth used') spareByHour[r.hour] = (spareByHour[r.hour] || 0) + n;
        if (r.hour !== hour) return;
        if (r.status === 'short of seats' || r.status === 'short even with standing') shortN += n;
        if (r.status === 'under a fifth used') spareN += n;
      });
      var bestH = null;
      Object.keys(spareByHour).forEach(function(h) { if (bestH === null || spareByHour[h] > spareByHour[bestH]) bestH = h; });
      var txt = 'At ' + fmtHour(hour) + ', by this rule ' + shortN + ' routes were short of buses and ' + spareN + ' had less than a fifth of their seats used.';
      if (bestH !== null && Number(bestH) !== hour && spareByHour[bestH] > spareN) {
        txt += ' The room is at other hours: at ' + fmtHour(Number(bestH)) + ', ' + spareByHour[bestH] + ' routes had less than a fifth of their seats used.';
        txt += ' So the gap is mostly one of timing: buses are spread across the day more evenly than boardings are.';
      }
      return txt;
    }
    const leadEl = document.getElementById('supply-lead-sentence');
    if (leadEl) leadEl.textContent = S.supplyHour ? supplyLead(S.supplyHour) : '';

    selEl.onchange = function() {
      S.supplyHour = selEl.value ? Number(selEl.value) : null;
      if (leadEl) leadEl.textContent = S.supplyHour ? supplyLead(S.supplyHour) : '';
      renderSupplyHourDetail(detailEl);
    };

    if (S.supplyHour) renderSupplyHourDetail(detailEl);

    // Stacked bar
    chartEl.innerHTML = '';
    chartEl.appendChild(buildStackedBar(S.supplyStatus));

    // Legend
    buildStatusLegend(legendEl);

    // Populate what-if selectors too if data loaded
    populateWhatIfSelectors();

  } catch (e) {
    setError(chartEl, e.message);
    setError(detailEl, e.message);
  }
}

function renderSupplyHourDetail(container) {
  const h = S.supplyHour;
  if (!h || !S.supply) {
    container.innerHTML = '<p class="note">Select an hour to see the route breakdown.</p>';
    return;
  }
  const rows = S.supply.filter(function(r) { return r.hour === h; });
  if (!rows.length) {
    container.innerHTML = '<p class="note">No data for ' + fmtHour(h) + '.</p>';
    return;
  }

  const short = rows.filter(function(r) {
    return r.status === 'short of seats' || r.status === 'short even with standing';
  }).sort(function(a,b) { return Number(b.buses_short_seated) - Number(a.buses_short_seated); });

  const spare = rows.filter(function(r) {
    return r.status === 'under a fifth used';
  }).sort(function(a,b) { return Number(a.boardings_per_seat_offered) - Number(b.boardings_per_seat_offered); });

  const inBalance = rows.filter(function(r) { return r.status === 'in balance'; });

  let html = '<div class="two-col"><div>';
  html += '<h3>Short of buses at ' + fmtHour(h) + ' (' + short.length + ' routes)</h3>';
  if (short.length) {
    html += '<ol class="rank-list">';
    short.slice(0, 10).forEach(function(r) {
      html += '<li>' +
        '<span class="rank-label">' + r.route + '</span>' +
        '<span class="rank-val">-' + fmtNum(r.buses_short_seated) + ' bus' +
          (Number(r.buses_short_seated) !== 1 ? 'es' : '') + '</span>' +
        '<span class="rank-sub">' + fmtNum(r.boardings) + ' boardings</span>' +
        '</li>';
    });
    html += '</ol>';
  } else {
    html += '<p class="note">No routes short of buses at this hour.</p>';
  }
  html += '</div><div>';

  html += '<h3>Spare capacity at ' + fmtHour(h) + ' (' + spare.length + ' routes)</h3>';
  if (spare.length) {
    html += '<ol class="rank-list">';
    spare.slice(0, 10).forEach(function(r) {
      html += '<li>' +
        '<span class="rank-label">' + r.route + '</span>' +
        '<span class="rank-sub">' + fmtPct(r.boardings_per_seat_offered, 1) + ' of seats used</span>' +
        '</li>';
    });
    html += '</ol>';
  } else {
    html += '<p class="note">No routes under a fifth used at this hour.</p>';
  }
  html += '<p class="caption" style="margin-top:8px">' + inBalance.length + ' routes in balance.</p>';
  html += '</div></div>';
  html += '<p class="caption">Source: supply_vs_demand_by_route_hour</p>';

  container.innerHTML = html;
}

// ── Tab 5: What if ────────────────────────────────────────────────────
function populateWhatIfSelectors() {
  if (!S.supply) return;

  const wi = S.wi;
  const routeSel = document.getElementById('wi-route');
  const hourSel  = document.getElementById('wi-hour');
  const donorSel = document.getElementById('wi-donor');
  if (!routeSel) return;

  // Routes that are "short" in some hour
  const shortRoutes = [];
  const srSet = {};
  S.supply.forEach(function(r) {
    if ((r.status === 'short of seats' || r.status === 'short even with standing') && !srSet[r.route]) {
      srSet[r.route] = 1; shortRoutes.push(r.route);
    }
  });
  shortRoutes.sort();

  routeSel.innerHTML = '';
  shortRoutes.forEach(function(r) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    routeSel.appendChild(opt);
  });
  if (!shortRoutes.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No crowded routes found';
    routeSel.appendChild(opt);
  }
  if (wi.route) {
    routeSel.value = wi.route;
  }
  if (!wi.route && shortRoutes.length) {
    // Default to the route-hour with the largest buses_short_with_standing
    // among covered rows (not 'route not in the running-time table').
    const covered = S.supply.filter(function(r) {
      return r.status !== 'route not in the running-time table';
    });
    const bestRow = covered.reduce(function(best, r) {
      return (!best || Number(r.buses_short_with_standing) > Number(best.buses_short_with_standing))
        ? r : best;
    }, null);
    if (bestRow) {
      wi.route = bestRow.route;
      wi.hour  = bestRow.hour;
      routeSel.value = bestRow.route;
    } else {
      wi.route = shortRoutes[0];
      routeSel.value = shortRoutes[0];
    }
  }

  updateWhatIfHours();
}

function updateWhatIfHours() {
  if (!S.supply) return;
  const wi = S.wi;
  const route = wi.route || (document.getElementById('wi-route') && document.getElementById('wi-route').value);
  const hourSel = document.getElementById('wi-hour');
  if (!hourSel) return;

  // Offer ALL hours where this route has data, not just short ones.
  const hours = S.supply
    .filter(function(r) { return r.route === route; })
    .map(function(r) { return r.hour; })
    .sort(function(a, b) { return a - b; });

  hourSel.innerHTML = '';
  hours.forEach(function(h) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = fmtHour(h);
    hourSel.appendChild(opt);
  });
  if (wi.hour) hourSel.value = wi.hour;
  if (!wi.hour && hours.length) {
    wi.hour = hours[0];
    hourSel.value = hours[0];
  }

  updateDonorRoutes();
  computeWhatIf();
}

function updateDonorRoutes() {
  if (!S.supply) return;
  const wi = S.wi;
  const h  = wi.hour || (document.getElementById('wi-hour') && Number(document.getElementById('wi-hour').value));
  const donorSel = document.getElementById('wi-donor');
  if (!donorSel) return;

  const donorRoutes = S.supply
    .filter(function(r) { return r.hour === h && r.status === 'under a fifth used'; })
    .map(function(r) { return r.route; })
    .sort();

  donorSel.innerHTML = '<option value="">none</option>';
  donorRoutes.forEach(function(r) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r + ' (spare)';
    donorSel.appendChild(opt);
  });
  if (wi.donor) donorSel.value = wi.donor;
}

function computeWhatIf() {
  const wi = S.wi;
  const resultsEl = document.getElementById('whatif-results');
  if (!resultsEl || !S.supply) return;

  const route = wi.route;
  const hour  = wi.hour ? Number(wi.hour) : null;
  if (!route || !hour) {
    resultsEl.innerHTML = '<p class="note">Select a route and hour above.</p>';
    return;
  }

  const rowA = S.supply.find(function(r) { return r.route === route && r.hour === hour; });
  if (!rowA) {
    resultsEl.innerHTML = '<p class="note">No data for route ' + route + ' at ' + fmtHour(hour) + '.</p>';
    return;
  }

  const seatsPerBusOrig = Number(rowA.seats_per_bus) || 42;
  const seatsPerBusNew  = wi.useDouble ? 70 : seatsPerBusOrig;
  // places_per_bus = seats + standing spaces (from fleet data, marked not verified)
  const placesPerBusOrig = Number(rowA.places_per_bus) || (seatsPerBusOrig + 20);
  // For double-decker assume 70 seats + 35 standing = 105 (not in fleet data)
  const placesPerBusNew  = wi.useDouble ? 105 : placesPerBusOrig;
  const tripsOrig = Number(rowA.trips_run) || 0;
  const tripsNew  = tripsOrig + wi.addBuses;
  const boardings = Number(rowA.boardings) || 0;

  // Update standard-bus seat label in the control
  const stdSeatsEl = document.getElementById('wi-std-seats');
  if (stdSeatsEl) stdSeatsEl.textContent = seatsPerBusOrig + ' seats';

  // Seated rule
  const needOrig  = Math.ceil(boardings / seatsPerBusOrig);
  const shortOrig = Math.max(0, needOrig - tripsOrig);
  const bpsOrig   = tripsOrig > 0 ? boardings / (tripsOrig * seatsPerBusOrig) : null;

  const needNew   = Math.ceil(boardings / seatsPerBusNew);
  const shortNew  = Math.max(0, needNew - Math.max(0, tripsNew));
  const bpsNew    = tripsNew > 0 ? boardings / (tripsNew * seatsPerBusNew) : null;

  // Standing rule (RTA plans with standing; fleet data marks standing 'not verified')
  const needStandOrig  = Math.ceil(boardings / placesPerBusOrig);
  const shortStandOrig = Math.max(0, needStandOrig - tripsOrig);
  const needStandNew   = Math.ceil(boardings / placesPerBusNew);
  const shortStandNew  = Math.max(0, needStandNew - Math.max(0, tripsNew));

  let html = '<div class="simulated-banner" aria-live="polite">SIMULATED</div>';
  html += '<table class="whatif-table">';
  html += '<thead><tr><th>Metric</th><th>Now (measured)</th><th class="col-after">What if (SIMULATED)</th></tr></thead>';
  html += '<tbody>';
  html += wiRow('Route', route, route);
  html += wiRow('Hour', fmtHour(hour), fmtHour(hour));
  html += wiRow('Buses running', fmtNum(tripsOrig), fmtNum(tripsNew), tripsNew !== tripsOrig);
  html += wiRow('Seats per bus', fmtNum(seatsPerBusOrig), fmtNum(seatsPerBusNew), wi.useDouble);
  html += wiRow('Buses needed (seated rule)', fmtNum(needOrig), fmtNum(needNew), needNew !== needOrig);
  html += wiRow('Buses short (seated)', fmtNum(shortOrig), fmtNum(shortNew), shortNew < shortOrig, shortNew > shortOrig);
  html += wiRow('Places per bus (with standing)', fmtNum(placesPerBusOrig), fmtNum(placesPerBusNew), wi.useDouble);
  html += wiRow('Buses needed (with standing)', fmtNum(needStandOrig), fmtNum(needStandNew), needStandNew !== needStandOrig);
  html += wiRow('Buses short (with standing)', fmtNum(shortStandOrig), fmtNum(shortStandNew),
    shortStandNew < shortStandOrig, shortStandNew > shortStandOrig);
  html += wiRow('Boardings per seat', bpsOrig != null ? fmtNum(bpsOrig*100, 0)+'%' : '—',
    bpsNew != null ? fmtNum(bpsNew*100, 0)+'%' : '—', bpsNew < bpsOrig, bpsNew > bpsOrig);
  html += '</tbody></table>';
  html += '<p class="note" style="margin-top:8px">Standing capacity from RTA\'s scheduling engineer; ' +
    'marked not verified in fleet data. Double-decker standing capacity: 35 (assumed, not in fleet data).</p>';

  // Donor route
  if (wi.donor && wi.donor !== route) {
    const rowD = S.supply.find(function(r) { return r.route === wi.donor && r.hour === hour; });
    if (rowD) {
      const dTripsOrig = Number(rowD.trips_run) || 0;
      const dTripsNew  = dTripsOrig - 1;
      const dBoards    = Number(rowD.boardings) || 0;
      const dSeats     = Number(rowD.seats_per_bus) || 42;
      const dNeedOrig  = Math.ceil(dBoards / dSeats);
      const dShortOrig = Math.max(0, dNeedOrig - dTripsOrig);
      const dShortNew  = Math.max(0, dNeedOrig - Math.max(0, dTripsNew));
      const dBpsOrig   = dTripsOrig > 0 ? dBoards / (dTripsOrig * dSeats) : null;
      const dBpsNew    = dTripsNew > 0  ? dBoards / (dTripsNew * dSeats)  : null;

      html += '<h3 style="margin-top:20px">Donor route ' + wi.donor +
        ' <span class="simulated-banner" style="font-size:var(--sz11)">SIMULATED</span></h3>';
      html += '<table class="whatif-table"><thead><tr><th>Metric</th>' +
        '<th>Now (measured)</th><th class="col-after">If one bus is taken</th></tr></thead><tbody>';
      html += wiRow('Buses running', fmtNum(dTripsOrig), fmtNum(dTripsNew));
      html += wiRow('Buses short', fmtNum(dShortOrig), fmtNum(dShortNew), dShortNew < dShortOrig, dShortNew > dShortOrig);
      html += wiRow('Boardings per seat',
        dBpsOrig != null ? fmtNum(dBpsOrig*100,0)+'%' : '—',
        dBpsNew  != null ? fmtNum(dBpsNew*100,0)+'%'  : '—',
        false, dBpsNew > dBpsOrig);
      html += '</tbody></table>';
    }
  }

  resultsEl.innerHTML = html;
}

function wiRow(label, before, after, improved, worse) {
  const cls = improved ? ' class="col-improved"' : (worse ? ' class="col-after"' : '');
  return '<tr><td>' + label + '</td><td>' + before + '</td><td' + cls + '>' + after + '</td></tr>';
}

async function renderWhatIf() {
  if (!S.supply) {
    try {
      S.supply = await apiFetch('/api/supply-vs-demand');
      populateWhatIfSelectors();
    } catch (e) {
      setError(document.getElementById('whatif-results'), e.message);
      return;
    }
  } else {
    populateWhatIfSelectors();
  }
  computeWhatIf();
}

// ── Forecast tab ──────────────────────────────────────────────────────
// ── Forecast tab ──────────────────────────────────────────────────────

function _fcNotBuilt(label) {
  return '<p class="not-built">' + label + ' has not been built yet.</p>';
}

function _fcMetricTable(rows) {
  // Table: method, trips, MAE, RMSE, MAPE, gain vs timetable (with range), gain vs best simple
  const BANDS = ['16:00 to 18:59', '19:00 to end of service', 'all trips from 16:00'];
  let html = '<div class="table-scroll"><table class="data-table"><thead><tr>';
  html += '<th>Band</th><th>Method</th><th class="num">Trips</th><th class="num">MAE min</th>';
  html += '<th class="num">RMSE min</th><th class="num">MAPE</th>';
  html += '<th class="num">vs timetable</th><th class="num">vs best simple</th></tr></thead><tbody>';
  rows.forEach(function(r) {
    const gain = r.gain_vs_timetable != null ? fmtPct(r.gain_vs_timetable, 0) : '';
    const range = (r.gain_low != null && r.gain_high != null)
      ? ' (' + fmtPct(r.gain_low, 0) + ' to ' + fmtPct(r.gain_high, 0) + ')'
      : '';
    const gainStr = r.gain_vs_timetable != null
      ? '<span class="col-gain">' + gain + range + '</span>'
      : '<span style="color:var(--g3)">baseline</span>';
    const vs_simple = r.gain_vs_best_simple != null
      ? '<span class="col-gain">' + fmtPct(r.gain_vs_best_simple, 0) + '</span>'
      : '';
    html += '<tr>';
    html += '<td style="font-size:var(--sz11);color:var(--g4)">' + (r.tested_on || '') + '</td>';
    html += '<td>' + (r.method || '') + '</td>';
    html += '<td class="num">' + fmtNum(r.trips) + '</td>';
    html += '<td class="num col-miss">' + (r.mae_minutes != null ? r.mae_minutes.toFixed(1) : '') + '</td>';
    html += '<td class="num">' + (r.rmse_minutes != null ? r.rmse_minutes.toFixed(1) : '') + '</td>';
    html += '<td class="num">' + (r.mape != null ? fmtPct(r.mape, 0) : '') + '</td>';
    html += '<td class="num">' + gainStr + '</td>';
    html += '<td class="num">' + vs_simple + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function _fcMethodBars(eveningRows) {
  // Horizontal bars: MAE in minutes for each method in the evening band
  if (!eveningRows || !eveningRows.length) return _fcNotBuilt('Method comparison');
  const maxMae = Math.max.apply(null, eveningRows.map(function(r) { return r.mae_minutes || 0; }));
  if (!maxMae) return '';

  const METHOD_COLOUR = {
    'RTA timetable (the plan)': C.neutral,  // timetable = neutral bar
  };
  function barColour(method) {
    if (METHOD_COLOUR[method]) return METHOD_COLOUR[method];
    if (method && method.toLowerCase().indexOf('model') >= 0) return C.sea;   // model = sea
    if (method && method.toLowerCase().indexOf('simple') >= 0) return C.gold; // simple rule = gold
    return C.muted;
  }

  let html = '<div class="method-bar-wrap">';
  eveningRows.forEach(function(r) {
    const pct = maxMae > 0 ? Math.round((r.mae_minutes / maxMae) * 100) : 0;
    const col = barColour(r.method);
    html += '<div class="method-bar-row">';
    html += '<span class="method-bar-label">' + (r.method || '') + '</span>';
    html += '<div class="method-bar-track">';
    html += '<div class="method-bar-fill" style="width:' + pct + '%;background:' + col + '">';
    html += '<span class="method-bar-val">' + (r.mae_minutes != null ? r.mae_minutes.toFixed(1) + ' min' : '') + '</span>';
    html += '</div></div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function _fcHourChart(byHour) {
  // Dual bar chart: timetable MAE vs model MAE by hour from 16:00
  if (!byHour || !byHour.length) return _fcNotBuilt('Hour breakdown');
  const evening = byHour.filter(function(r) { return (r.hour || 0) >= 16; });
  if (!evening.length) return _fcNotBuilt('Hour breakdown');

  const W = 560, H = 180, padL = 40, padR = 8, padT = 10, padB = 32;
  const iW = W - padL - padR, iH = H - padT - padB;
  const maxVal = Math.max.apply(null, evening.map(function(r) {
    return Math.max(r.timetable_mae || 0, r.model_mae || 0);
  }));
  const yS = function(v) { return padT + iH - (v / (maxVal || 1)) * iH; };
  const bGap = iW / evening.length;
  const bW = Math.max(4, bGap - 4);

  const svg = se('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
  const g = se('g', { transform: 'translate(' + padL + ',0)' });
  svg.appendChild(g);

  // Y gridlines
  [0.25, 0.5, 0.75, 1].forEach(function(f) {
    const y = padT + iH * (1 - f);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-4, y + 4, (maxVal * f).toFixed(1), { 'text-anchor': 'end', 'font-size': 10, fill: C.g4 }));
  });

  // Bars
  evening.forEach(function(r, i) {
    const x = i * bGap + bGap / 2;
    if (r.timetable_mae != null) {
      const h = (r.timetable_mae / (maxVal || 1)) * iH;
      g.appendChild(seRect(x - bW / 2 - 2, padT + iH - h, bW / 2 - 1, h, { fill: C.ink }));
    }
    if (r.model_mae != null) {
      const h = (r.model_mae / (maxVal || 1)) * iH;
      g.appendChild(seRect(x + 1, padT + iH - h, bW / 2 - 1, h, { fill: C.flow }));
    }
    if (i % 2 === 0 || evening.length <= 6) {
      g.appendChild(seText(x, padT + iH + 14, fmtHourShort(r.hour), { 'text-anchor': 'middle', 'font-size': 10, fill: C.g4 }));
    }
  });

  // Axis label
  g.appendChild(seText(-padL + 2, padT + iH / 2, 'min', { transform: 'rotate(-90,' + (-padL + 12) + ',' + (padT + iH / 2) + ')', 'font-size': 10, fill: C.g4 }));

  // Legend
  const lx = iW - 160;
  g.appendChild(seRect(lx, padT, 12, 10, { fill: C.ink }));
  g.appendChild(seText(lx + 16, padT + 9, 'Timetable', { 'font-size': 10, fill: C.ink }));
  g.appendChild(seRect(lx + 80, padT, 12, 10, { fill: C.flow }));
  g.appendChild(seText(lx + 96, padT + 9, 'Model', { 'font-size': 10, fill: C.flow }));

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Mean absolute error by hour');
  wrap.appendChild(svg);
  return wrap.outerHTML;
}

function _fcTripChart(trips) {
  // Simple chart: sched_run_min, actual_run_min, model_plan per evening trip in order
  if (!trips || !trips.length) return _fcNotBuilt('Trip chart');
  trips = trips.slice().sort(function(a, b) { return (a.hour || 0) - (b.hour || 0) || (a.trip_id || '') < (b.trip_id || '') ? -1 : 1; });

  const W = 560, H = 180, padL = 40, padR = 8, padT = 10, padB = 32;
  const iW = W - padL - padR, iH = H - padT - padB;
  const maxVal = Math.max.apply(null, trips.map(function(r) {
    return Math.max(r.sched_run_min || 0, r.actual_run_min || 0, r.model_plan || 0);
  }));
  if (!maxVal) return _fcNotBuilt('Trip chart (no run-time values)');

  const xS = function(i) { return i * (iW / (trips.length - 1 || 1)); };
  const yS = function(v) { return padT + iH - (v / maxVal) * iH; };

  const svg = se('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
  const g = se('g', { transform: 'translate(' + padL + ',0)' });
  svg.appendChild(g);

  // Gridlines
  [0.25, 0.5, 0.75, 1].forEach(function(f) {
    const y = padT + iH * (1 - f);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-4, y + 4, (maxVal * f).toFixed(0), { 'text-anchor': 'end', 'font-size': 10, fill: C.g4 }));
  });

  // Lines: sched, actual, model
  function polyLine(key, col) {
    const pts = trips.map(function(r, i) { return r[key] != null ? xS(i) + ',' + yS(r[key]) : null; }).filter(Boolean);
    if (pts.length < 2) return;
    g.appendChild(se('polyline', { points: pts.join(' '), fill: 'none', stroke: col, 'stroke-width': '2' }));
  }
  polyLine('sched_run_min', C.g3);
  polyLine('actual_run_min', C.ink);
  polyLine('model_plan', C.flow);

  // X axis: a few hour labels
  const hoursSeen = {};
  trips.forEach(function(r, i) {
    const h = r.hour;
    if (h != null && !hoursSeen[h]) {
      hoursSeen[h] = 1;
      g.appendChild(seText(xS(i), padT + iH + 14, fmtHourShort(h), { 'text-anchor': 'middle', 'font-size': 10, fill: C.g4 }));
    }
  });

  // Axis label
  g.appendChild(seText(-padL + 2, padT + iH / 2, 'min', { transform: 'rotate(-90,' + (-padL + 12) + ',' + (padT + iH / 2) + ')', 'font-size': 10, fill: C.g4 }));

  // Legend row above the plot — left-aligned, spaced so labels never collide
  const legendItems = [
    { col: C.g3,  label: 'Planned' },
    { col: C.ink, label: 'Actual' },
    { col: C.flow, label: 'Forecast' },
  ];
  let lxCursor = 0;
  legendItems.forEach(function(item) {
    g.appendChild(seLine(lxCursor, padT - 8, lxCursor + 16, padT - 8, { stroke: item.col, 'stroke-width': 2 }));
    g.appendChild(seText(lxCursor + 20, padT - 4, item.label, { 'font-size': 10, fill: item.col }));
    lxCursor += 90;
  });

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.appendChild(svg);
  return wrap.outerHTML;
}

function _fcDriverBars(drivers) {
  // Horizontal bars for feature importance (share 0..1)
  if (!drivers || !drivers.length) return _fcNotBuilt('Feature importance');
  const PLAIN_NAMES = {
    'sched_run_min': 'Planned running time',
    'n_stops': 'Number of stops',
    'hour': 'Hour of day',
    'sched_dep_min': 'Time of day (minutes since midnight)',
    'route': 'Route',
    'direction': 'Direction',
    'bus_type': 'Bus type',
    'seats': 'Seats',
    'model_year': 'Age of the bus',
    'layover_sched_min': 'Planned layover before the trip',
    'prev_trip_end_late_min': 'How late this bus finished its previous trip',
    'route_recent_ratio': 'How the route ran in the last two hours',
    'route_boardings_prev_hour': 'Boardings on the route in the last full hour',
  };
  const top = drivers.slice(0, 12);
  const maxShare = top[0] && top[0].share != null ? Number(top[0].share) : 1;
  let html = '<div class="method-bar-wrap">';
  top.forEach(function(d) {
    const name = PLAIN_NAMES[d.feature] || d.feature;
    const share = Number(d.share) || 0;
    const pct = maxShare > 0 ? Math.round((share / maxShare) * 100) : 0;
    html += '<div class="method-bar-row">';
    html += '<span class="method-bar-label">' + name + '</span>';
    html += '<div class="method-bar-track">';
    html += '<div class="method-bar-fill" style="width:' + pct + '%;background:' + C.flow + '">';
    html += '<span class="method-bar-val">' + Math.round(share * 100) + '%</span>';
    html += '</div></div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function _fcCaveats(metrics, summary) {
  // Section 7: computed statements about what the forecast does not show
  const evening = metrics ? metrics.filter(function(r) { return r.tested_on === '16:00 to 18:59'; }) : [];
  const timetableRow = evening.find(function(r) { return r.method === 'RTA timetable (the plan)'; });
  const modelPlanRow = evening.find(function(r) { return r.method === 'Model, timetable features only'; });
  const modelLiveRow = evening.find(function(r) { return r.method === 'Model, with what is known 30 minutes ahead'; });
  const bestSimpleRow = evening.find(function(r) { return r.method && r.method.toLowerCase().indexOf('simple') >= 0 && r.gain_vs_timetable != null; });

  const items = [];
  if (timetableRow && bestSimpleRow) {
    const gainSimple = bestSimpleRow.gain_vs_timetable != null
      ? Math.round(Number(bestSimpleRow.gain_vs_timetable) * 100) : null;
    if (gainSimple != null) {
      items.push('The gain over the best simple baseline (' + (bestSimpleRow.best_simple_was || 'route history') + ') is ' + gainSimple + '%: the model learns patterns the simple baseline does not capture, but the gap is small.');
    }
  }
  if (modelPlanRow && modelLiveRow) {
    const diffMae = (modelLiveRow.mae_minutes || 0) - (modelPlanRow.mae_minutes || 0);
    if (Math.abs(diffMae) < 0.5) {
      items.push('Adding the live signals (how the route ran in the last two hours, boardings in the last full hour) did not improve accuracy in the test: the two model rows have almost the same MAE. The model learns most from the planned running time, not from real-time updates.');
    }
  }
  items.push('This is one day of data. Performance on other days may differ, particularly on days with incidents or unusual demand.');

  let html = '<div class="caveats-box"><h4>What this does not show</h4><ul>';
  items.forEach(function(s) { html += '<li>' + s + '</li>'; });
  html += '</ul></div>';
  return html;
}

function _fcPlannerChart(bands, route) {
  // Section 8: planned vs p85 by hour for the chosen route
  if (!bands || !bands.length) return '';
  const routeBands = bands.filter(function(r) { return r.route === route; });
  if (!routeBands.length) return '<p class="note">No bands data for route ' + route + '.</p>';
  const hours = routeBands.map(function(r) { return r.hour; }).filter(function(h) { return h != null; });
  hours.sort(function(a,b) { return a-b; });

  const W = 560, H = 200, padL = 40, padR = 8, padT = 10, padB = 32;
  const iW = W - padL - padR, iH = H - padT - padB;
  const allVals = routeBands.flatMap(function(r) { return [r.sched_run_min, r.actual_p85_min]; }).filter(Boolean);
  const maxVal = Math.max.apply(null, allVals) || 1;
  const xS = function(i) { return i * (iW / (Math.max(hours.length - 1, 1))); };
  const yS = function(v) { return padT + iH - (v / maxVal) * iH; };

  const svg = se('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
  const g = se('g', { transform: 'translate(' + padL + ',0)' });
  svg.appendChild(g);

  // Gridlines
  [0.25, 0.5, 0.75, 1].forEach(function(f) {
    const y = padT + iH * (1 - f);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-4, y + 4, (maxVal * f).toFixed(0), { 'text-anchor': 'end', 'font-size': 10, fill: C.g4 }));
  });

  // Lines
  function routeLine(key, col) {
    const pts = hours.map(function(h, i) {
      const row = routeBands.find(function(r) { return r.hour === h; });
      return row && row[key] != null ? xS(i) + ',' + yS(row[key]) : null;
    }).filter(Boolean);
    if (pts.length >= 2) g.appendChild(se('polyline', { points: pts.join(' '), fill: 'none', stroke: col, 'stroke-width': 2 }));
  }
  routeLine('sched_run_min', C.g3);
  routeLine('actual_p85_min', C.over);

  // Extra min fill
  hours.forEach(function(h, i) {
    const row = routeBands.find(function(r) { return r.hour === h; });
    if (row && row.extra_min_at_p85 != null && row.extra_min_at_p85 > 0) {
      const x = xS(i);
      const y1 = yS(row.sched_run_min || 0);
      const y2 = yS(row.actual_p85_min || 0);
      g.appendChild(seRect(x - 4, Math.min(y1, y2), 8, Math.abs(y1 - y2), { fill: C.over, opacity: '0.15' }));
    }
  });

  // X axis labels
  hours.forEach(function(h, i) {
    if (i % 2 === 0 || hours.length <= 6) {
      g.appendChild(seText(xS(i), padT + iH + 14, fmtHourShort(h), { 'text-anchor': 'middle', 'font-size': 10, fill: C.g4 }));
    }
  });

  // Axis label
  g.appendChild(seText(-padL + 2, padT + iH / 2, 'min', { transform: 'rotate(-90,' + (-padL + 12) + ',' + (padT + iH / 2) + ')', 'font-size': 10, fill: C.g4 }));

  // Legend
  g.appendChild(seLine(iW - 160, padT + 5, iW - 148, padT + 5, { stroke: C.g3, 'stroke-width': 2 }));
  g.appendChild(seText(iW - 144, padT + 9, 'Planned', { 'font-size': 10, fill: C.g3 }));
  g.appendChild(seLine(iW - 95, padT + 5, iW - 83, padT + 5, { stroke: C.over, 'stroke-width': 2 }));
  g.appendChild(seText(iW - 79, padT + 9, '85th percentile', { 'font-size': 10, fill: C.over }));

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.appendChild(svg);
  return wrap.outerHTML;
}

async function renderForecast() {
  try {
    // Load all four datasets in parallel (bands is optional)
    const [metrics, summary, drivers, bandsResult] = await Promise.all([
      S.fcMetrics  || apiFetch('/api/running-time-metrics').then(function(d)  { return (S.fcMetrics  = d); }),
      S.fcSummary  || apiFetch('/api/running-time-forecast-summary').then(function(d) { return (S.fcSummary  = d); }),
      S.fcDrivers  || apiFetch('/api/running-time-drivers').then(function(d)  { return (S.fcDrivers  = d); }),
      S.fcBands !== undefined
        ? Promise.resolve(S.fcBands)
        : apiFetch('/api/running-time-bands').then(function(d) { S.fcBands = d.error ? null : d; return S.fcBands; }).catch(function() { S.fcBands = null; return null; }),
    ]);

    const eveningMetrics = metrics.filter(function(r) { return r.tested_on === '16:00 to 18:59'; });
    const modelRow = eveningMetrics.find(function(r) { return r.method && r.method.indexOf('Model') >= 0 && r.method.indexOf('timetable features') >= 0; });
    const ttRow    = eveningMetrics.find(function(r) { return r.method === 'RTA timetable (the plan)'; });

    // 1. Summary sentence + headline span
    const summaryEl = document.getElementById('fc-summary');
    if (summaryEl && modelRow && ttRow) {
      const gain = modelRow.gain_vs_timetable != null ? Math.round(Number(modelRow.gain_vs_timetable) * 100) : null;
      // Fill headline span
      var hlPct = document.getElementById('fc-hl-pct');
      if (hlPct) hlPct.textContent = gain != null ? String(gain) : '?';
      const gainLow  = modelRow.gain_low  != null ? Math.round(Number(modelRow.gain_low)  * 100) : null;
      const gainHigh = modelRow.gain_high != null ? Math.round(Number(modelRow.gain_high) * 100) : null;
      const rangeStr = (gainLow != null && gainHigh != null) ? ' (' + gainLow + ' to ' + gainHigh + '%)' : '';
      summaryEl.textContent =
        'In the evening peak, the timetable misses actual running time by ' +
        (ttRow.mae_minutes != null ? ttRow.mae_minutes.toFixed(1) : '?') + ' min on average. ' +
        'The model brings that to ' + (modelRow.mae_minutes != null ? modelRow.mae_minutes.toFixed(1) : '?') + ' min' +
        (gain != null ? ', a ' + gain + '% gain' + rangeStr : '') + '. ' +
        (modelRow.learned_from ? 'It learned from ' + modelRow.learned_from + '.' : '') +
        (modelRow.made ? ' Forecast is made ' + modelRow.made + '.' : '');
    } else if (summaryEl) {
      summaryEl.textContent = 'Running-time metrics could not be loaded.';
    }

    // 2. Method bar chart (evening band)
    const methodChartEl = document.getElementById('fc-method-chart');
    if (methodChartEl) methodChartEl.innerHTML = _fcMethodBars(eveningMetrics);

    // 3. All-bands table
    const bandsTableEl = document.getElementById('fc-bands-table');
    if (bandsTableEl) bandsTableEl.innerHTML = _fcMetricTable(metrics);

    // 4. Hour chart
    const hourChartEl = document.getElementById('fc-hour-chart');
    if (hourChartEl) hourChartEl.innerHTML = _fcHourChart(summary && summary.by_hour);

    // 5. Trip chart: route selector
    const byRoute = (summary && summary.by_route) || [];
    const routeSel = document.getElementById('fc-route-sel');
    if (routeSel && byRoute.length) {
      routeSel.innerHTML = '';
      byRoute.forEach(function(r) {
        const opt = document.createElement('option');
        opt.value = r.route;
        opt.textContent = r.route + ' (' + r.trips + ' trips)';
        routeSel.appendChild(opt);
      });
      if (!S.fcRoute && byRoute.length) S.fcRoute = byRoute[0].route;
      if (S.fcRoute) routeSel.value = S.fcRoute;

      routeSel.onchange = function() {
        S.fcRoute = routeSel.value;
        _loadTripChart();
      };
    }
    _loadTripChart();

    // 6. Drivers
    const driversEl = document.getElementById('fc-drivers-chart');
    if (driversEl) driversEl.innerHTML = _fcDriverBars(drivers);

    // 7. Caveats
    const caveatsEl = document.getElementById('fc-caveats');
    if (caveatsEl) caveatsEl.innerHTML = _fcCaveats(metrics, summary);

    // 8. Planner view (optional)
    const plannerWrap = document.getElementById('fc-planner-wrap');
    if (plannerWrap) {
      if (S.fcBands && S.fcBands.length) {
        plannerWrap.removeAttribute('hidden');
        // Populate planner route selector from bands data
        const plannerRoutes = Array.from(new Set(S.fcBands.map(function(r) { return r.route; }).filter(Boolean))).sort();
        const plannerSel = document.getElementById('fc-planner-route');
        if (plannerSel) {
          plannerSel.innerHTML = '';
          plannerRoutes.forEach(function(r) {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            plannerSel.appendChild(opt);
          });
          if (!S.fcPlannerRoute && plannerRoutes.length) S.fcPlannerRoute = plannerRoutes[0];
          if (S.fcPlannerRoute) plannerSel.value = S.fcPlannerRoute;
          plannerSel.onchange = function() {
            S.fcPlannerRoute = plannerSel.value;
            const plannerChart = document.getElementById('fc-planner-chart');
            if (plannerChart) plannerChart.innerHTML = _fcPlannerChart(S.fcBands, S.fcPlannerRoute);
          };
        }
        const plannerChart = document.getElementById('fc-planner-chart');
        if (plannerChart) plannerChart.innerHTML = _fcPlannerChart(S.fcBands, S.fcPlannerRoute || plannerRoutes[0]);
      } else {
        // Show "not built yet" note within planner section
        plannerWrap.removeAttribute('hidden');
        const plannerChart = document.getElementById('fc-planner-chart');
        if (plannerChart) plannerChart.innerHTML = _fcNotBuilt('running_time_bands');
      }
    }

  } catch (e) {
    const el = document.getElementById('fc-summary');
    if (el) setError(el, e.message);
  }
}

async function _loadTripChart() {
  const tripChartEl = document.getElementById('fc-trip-chart');
  if (!tripChartEl || !S.fcRoute) return;
  tripChartEl.innerHTML = '<div class="skel-chart"></div>';
  try {
    const url = '/api/running-time-forecast-route?route=' + encodeURIComponent(S.fcRoute);
    const trips = await apiFetch(url);
    tripChartEl.innerHTML = _fcTripChart(trips);
  } catch (e) {
    tripChartEl.innerHTML = '<p class="api-error">Could not load trips: ' + e.message + '</p>';
  }
}

// ── Planner's worklist tab ────────────────────────────────────────────

function _wlRowKey(r) {
  return (r.route || '') + '|' + (r.direction || '') + '|' + (r.hour || 0);
}

function _wlBandFilter(r, band) {
  const h = r.hour || 0;
  if (band === 'am')   return h >= 6  && h <= 9;
  if (band === 'pm')   return h >= 16 && h <= 18;
  if (band === 'late') return h >= 19;
  return true; // 'all'
}

function _wlUpdateDraftTotal() {
  const totalEl = document.getElementById('wl-draft-total');
  const textEl  = document.getElementById('wl-draft-text');
  if (!totalEl || !textEl) return;
  const accepted = Object.keys(S.wlAccepted).filter(function(k) { return S.wlAccepted[k]; });
  if (accepted.length === 0) {
    totalEl.setAttribute('hidden', '');
    return;
  }
  totalEl.removeAttribute('hidden');
  // Compute total bus hours from the accepted rows
  let totalMins = 0;
  if (S.wlBands) {
    S.wlBands.forEach(function(r) {
      if (S.wlAccepted[_wlRowKey(r)]) {
        totalMins += Number(r.extra_bus_minutes_at_p85) || 0;
      }
    });
  }
  textEl.textContent = 'Accepted: ' + fmtNum(accepted.length) + ' change' +
    (accepted.length !== 1 ? 's' : '') + ', adding ' +
    (totalMins / 60).toFixed(1) + ' bus hours';
}

function _wlBuildTable(rows, band, routeSearch) {
  // Filter
  const search = (routeSearch || '').trim().toLowerCase();
  let filtered = rows.filter(function(r) {
    return (r.trips || 0) >= 5 && _wlBandFilter(r, band);
  });
  if (search) {
    filtered = filtered.filter(function(r) {
      return (r.route || '').toLowerCase().indexOf(search) >= 0;
    });
  }
  // Sort by extra_bus_minutes_at_p85 descending, take top 25
  filtered.sort(function(a, b) {
    return (Number(b.extra_bus_minutes_at_p85) || 0) - (Number(a.extra_bus_minutes_at_p85) || 0);
  });
  const top = filtered.slice(0, 25);

  if (!top.length) {
    return '<p class="caption" style="color:var(--g3)">No rows match the current filter.</p>';
  }

  let html = '<table class="data-table wl-table"><thead><tr>';
  html += '<th>Route</th>';
  html += '<th>Direction</th>';
  html += '<th class="num">Hour</th>';
  html += '<th class="num">Trips</th>';
  html += '<th class="num">Planned min</th>';
  html += '<th class="num">Median actual</th>';
  html += '<th class="num">85th pct</th>';
  html += '<th class="num" style="color:var(--over)">Add min</th>';
  html += '<th class="num">Over plan</th>';
  html += '<th class="num">5+ min late</th>';
  html += '<th></th>';
  html += '</tr></thead><tbody>';

  top.forEach(function(r) {
    const key = _wlRowKey(r);
    const isAccepted  = !!S.wlAccepted[key];
    const isSetAside  = !!S.wlSetAside[key];
    const rowClass = isAccepted ? ' wl-row-accepted' : (isSetAside ? ' wl-row-set-aside' : '');
    const extra = r.extra_min_at_p85 != null ? Math.round(Number(r.extra_min_at_p85) * 10) / 10 : null;
    const hourStr = r.hour != null ? fmtHourShort(r.hour) : '';

    html += '<tr class="' + rowClass + '" data-wl-key="' + key + '">';
    html += '<td>' + (r.route || '') + '</td>';
    html += '<td style="font-size:var(--sz11);color:var(--g4)">' + (r.direction || '') + '</td>';
    html += '<td class="num">' + hourStr + '</td>';
    html += '<td class="num">' + fmtNum(r.trips) + '</td>';
    html += '<td class="num">' + (r.sched_run_min != null ? Number(r.sched_run_min).toFixed(1) : '—') + '</td>';
    html += '<td class="num">' + (r.actual_p50_min != null ? Number(r.actual_p50_min).toFixed(1) : '—') + '</td>';
    html += '<td class="num">' + (r.actual_p85_min != null ? Number(r.actual_p85_min).toFixed(1) : '—') + '</td>';
    html += '<td class="num"><strong style="color:var(--over)">' + (extra != null ? '+' + extra : '—') + '</strong></td>';
    html += '<td class="num">' + fmtPct(r.share_running_over_plan, 0) + '</td>';
    html += '<td class="num">' + fmtPct(r.share_ending_5min_late, 0) + '</td>';
    html += '<td style="white-space:nowrap">';
    html += '<button type="button" class="wl-accept-btn' + (isAccepted ? ' accepted' : '') +
            '" data-wl-action="accept" data-wl-key="' + key + '">Accept</button>';
    html += '<button type="button" class="wl-setaside-btn' + (isSetAside ? ' set-aside' : '') +
            '" data-wl-action="setaside" data-wl-key="' + key + '">Set aside</button>';
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  if (filtered.length > 25) {
    html += '<p class="source-line">' + fmtNum(filtered.length - 25) + ' more rows not shown. Narrow the filter to see them.</p>';
  }
  return html;
}

function _wlLedgerChart(ledger) {
  if (!ledger || !ledger.length) return _fcNotBuilt('running_time_ledger_by_hour');
  const hours = ledger.map(function(r) { return r.hour; });
  const maxVal = Math.max.apply(null, ledger.map(function(r) {
    return (Number(r.extra_bus_minutes_at_p85_sum) || 0) / 60;
  }));
  if (!maxVal) return _fcNotBuilt('ledger data (no extra bus hours)');

  const W = 560, H = 180, padL = 48, padR = 8, padT = 10, padB = 32;
  const iW = W - padL - padR, iH = H - padT - padB;
  const bW = Math.max(4, Math.floor(iW / (hours.length + 1)));
  const xS = function(i) { return i * (iW / hours.length) + (iW / hours.length - bW) / 2; };
  const yS = function(v) { return padT + iH - (v / maxVal) * iH; };

  const svg = se('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
  const g   = se('g', { transform: 'translate(' + padL + ',0)' });
  svg.appendChild(g);

  // Gridlines
  [0.25, 0.5, 0.75, 1].forEach(function(f) {
    const y = padT + iH * (1 - f);
    g.appendChild(seLine(0, y, iW, y, { stroke: C.g1 }));
    g.appendChild(seText(-4, y + 4, (maxVal * f).toFixed(1), { 'text-anchor': 'end', 'font-size': 10, fill: C.g4 }));
  });

  // Bars — evening hours highlighted
  ledger.forEach(function(r, i) {
    const val = (Number(r.extra_bus_minutes_at_p85_sum) || 0) / 60;
    const h   = r.hour || 0;
    const col = (h >= 16 && h <= 18) ? C.over : C.g2;
    const barH = (val / maxVal) * iH;
    const x = xS(i);
    g.appendChild(seRect(x, padT + iH - barH, bW, barH, { fill: col }));
    if (i % 3 === 0 || hours.length <= 8) {
      g.appendChild(seText(x + bW / 2, padT + iH + 14, fmtHourShort(h), {
        'text-anchor': 'middle', 'font-size': 10, fill: C.g4,
      }));
    }
  });

  // Axis label
  g.appendChild(seText(-padL + 2, padT + iH / 2, 'bus hours', {
    transform: 'rotate(-90,' + (-padL + 14) + ',' + (padT + iH / 2) + ')',
    'font-size': 10, fill: C.g4,
  }));

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.appendChild(svg);
  return wrap.outerHTML;
}

function _wlFocalHtml(bands, all) {
  // The headline is the WHOLE evening figure, from the same hourly table the chart below draws
  // (running_time_ledger_by_hour), so the number and the red bars can never disagree.
  // The list covers only the route-direction-hours with 5 or more trips; the line under the number says how much of it.
  const inEvening = function(r) { return (r.hour || 0) >= 16 && (r.hour || 0) <= 18; };
  const mins = function(rows, col) { return rows.reduce(function(s, r) { return s + (Number(r[col]) || 0); }, 0); };
  const listed = bands.filter(function(r) { return (r.trips || 0) >= 5; });
  const listedEvening = listed.filter(inEvening);
  const listedEveningHours = mins(listedEvening, 'extra_bus_minutes_at_p85') / 60;
  const ledger = (S.wlLedger && S.wlLedger.length) ? S.wlLedger : null;
  const eveningHours = ledger ? mins(ledger.filter(inEvening), 'extra_bus_minutes_at_p85_sum') / 60 : mins(bands.filter(inEvening), 'extra_bus_minutes_at_p85') / 60;
  const allHours = ledger ? mins(ledger, 'extra_bus_minutes_at_p85_sum') / 60 : mins(bands, 'extra_bus_minutes_at_p85') / 60;
  const src = ledger ? 'running_time_ledger_by_hour' : 'running_time_bands';

  return '<div class="wl-focal-wrap">' +
    '<div>' +
      '<div class="wl-focal-label">more running time the 16:00 to 18:59 band needs, to cover 85 trips in 100<br>' +
        'The list below holds the ' + fmtNum(listedEvening.length) + ' route, direction and hour rows with 5 or more trips: ' +
        fmtNum(Math.round(listedEveningHours)) + ' of those bus hours.</div>' +
      '<div class="source-line">from ' + src + '</div>' +
    '</div>' +
    '<div>' +
      '<div class="wl-focal-side">' + fmtNum(Math.round(allHours)) + ' bus hours</div>' +
      '<div class="wl-focal-side-label">the whole day</div>' +
    '</div>' +
  '</div>';
}

function _wlWireTableEvents(tableWrap) {
  if (!tableWrap) return;
  // Attach once only. The table is redrawn inside this same element, and a second listener would
  // undo the first: one click would accept and then un-accept the row.
  if (tableWrap.dataset.wlWired === '1') return;
  tableWrap.dataset.wlWired = '1';
  tableWrap.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-wl-action]');
    if (!btn) return;
    const key    = btn.dataset.wlKey;
    const action = btn.dataset.wlAction;
    const row    = tableWrap.querySelector('tr[data-wl-key="' + key + '"]');

    if (action === 'accept') {
      if (S.wlAccepted[key]) {
        // Toggle off
        delete S.wlAccepted[key];
        btn.classList.remove('accepted');
        if (row) row.classList.remove('wl-row-accepted');
      } else {
        S.wlAccepted[key] = true;
        delete S.wlSetAside[key];
        btn.classList.add('accepted');
        const saBtn = tableWrap.querySelector('[data-wl-action="setaside"][data-wl-key="' + key + '"]');
        if (saBtn) saBtn.classList.remove('set-aside');
        if (row) { row.classList.add('wl-row-accepted'); row.classList.remove('wl-row-set-aside'); }
      }
    } else if (action === 'setaside') {
      if (S.wlSetAside[key]) {
        delete S.wlSetAside[key];
        btn.classList.remove('set-aside');
        if (row) row.classList.remove('wl-row-set-aside');
      } else {
        S.wlSetAside[key] = true;
        delete S.wlAccepted[key];
        btn.classList.add('set-aside');
        const acBtn = tableWrap.querySelector('[data-wl-action="accept"][data-wl-key="' + key + '"]');
        if (acBtn) acBtn.classList.remove('accepted');
        if (row) { row.classList.add('wl-row-set-aside'); row.classList.remove('wl-row-accepted'); }
      }
    }
    _wlUpdateDraftTotal();
  });
}

function _wlRebuildTable() {
  if (!S.wlBands) return;
  const tableWrap = document.getElementById('wl-table-wrap');
  if (!tableWrap) return;
  const band = (document.getElementById('wl-band-sel') || {}).value || 'all';
  const search = (document.getElementById('wl-route-search') || {}).value || '';
  tableWrap.innerHTML = _wlBuildTable(S.wlBands, band, search);
  _wlWireTableEvents(tableWrap);
  _wlUpdateDraftTotal();
}

async function renderWorklist() {
  try {
    const [bandsResult, ledgerResult] = await Promise.all([
      S.wlBands !== undefined
        ? Promise.resolve(S.wlBands)
        : apiFetch('/api/running-time-bands').then(function(d) {
            S.wlBands = (d && !d.error) ? d : null;
            return S.wlBands;
          }).catch(function() { S.wlBands = null; return null; }),
      S.wlLedger !== undefined
        ? Promise.resolve(S.wlLedger)
        : apiFetch('/api/running-time-ledger-by-hour').then(function(d) {
            S.wlLedger = (d && !d.error) ? d : null;
            return S.wlLedger;
          }).catch(function() { S.wlLedger = null; return null; }),
    ]);

    // Focal number
    const focalEl = document.getElementById('wl-focal');
    if (focalEl) {
      if (S.wlBands && S.wlBands.length) {
        focalEl.innerHTML = _wlFocalHtml(S.wlBands);
        // Fill the headline span with the same evening figure
        var hlNum = document.getElementById('wl-hl-num');
        if (hlNum) {
          var inEvPM = function(r) { return (r.hour || 0) >= 16 && (r.hour || 0) <= 18; };
          var mins = function(rows, col) { return rows.reduce(function(s, r) { return s + (Number(r[col]) || 0); }, 0); };
          var ledger = (S.wlLedger && S.wlLedger.length) ? S.wlLedger : null;
          var evHours = ledger
            ? mins(ledger.filter(inEvPM), 'extra_bus_minutes_at_p85_sum') / 60
            : mins(S.wlBands.filter(inEvPM), 'extra_bus_minutes_at_p85') / 60;
          hlNum.textContent = fmtNum(Math.round(evHours));
        }
      } else {
        focalEl.innerHTML = '<p class="not-built">running_time_bands has not been built yet.</p>';
      }
    }

    // Table
    if (S.wlBands && S.wlBands.length) {
      _wlRebuildTable();
      // Wire filters
      const bandSel = document.getElementById('wl-band-sel');
      if (bandSel && !bandSel._wlWired) {
        bandSel._wlWired = true;
        bandSel.addEventListener('change', _wlRebuildTable);
      }
      const routeSearch = document.getElementById('wl-route-search');
      if (routeSearch && !routeSearch._wlWired) {
        routeSearch._wlWired = true;
        routeSearch.addEventListener('input', _wlRebuildTable);
      }
    } else {
      const tableWrap = document.getElementById('wl-table-wrap');
      if (tableWrap) tableWrap.innerHTML = '<p class="not-built">running_time_bands has not been built yet.</p>';
    }

    // Ledger chart
    const ledgerEl = document.getElementById('wl-ledger-chart');
    if (ledgerEl) {
      ledgerEl.innerHTML = S.wlLedger ? _wlLedgerChart(S.wlLedger) : '<p class="not-built">running_time_ledger_by_hour has not been built yet.</p>';
    }

    // Copy button
    const copyBtn = document.getElementById('wl-copy-btn');
    if (copyBtn && !copyBtn._wlWired) {
      copyBtn._wlWired = true;
      copyBtn.addEventListener('click', function() {
        const accepted = S.wlBands ? S.wlBands.filter(function(r) {
          return S.wlAccepted[_wlRowKey(r)];
        }) : [];
        const lines = ['Accepted changes — Planner\'s worklist', ''];
        accepted.forEach(function(r) {
          const extra = r.extra_min_at_p85 != null ? '+' + Number(r.extra_min_at_p85).toFixed(1) + ' min' : '';
          lines.push([r.route, r.direction, fmtHourShort(r.hour), extra].filter(Boolean).join('  '));
        });
        const text = lines.join('\n');
        try {
          navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied';
            setTimeout(function() { copyBtn.textContent = 'Copy the accepted list'; }, 2000);
          });
        } catch (e) {
          // Fallback: create a textarea, select, and let the user copy
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = 'Text selected — press Ctrl+C';
          setTimeout(function() { copyBtn.textContent = 'Copy the accepted list'; }, 3000);
        }
      });
    }

  } catch (e) {
    const focalEl = document.getElementById('wl-focal');
    if (focalEl) setError(focalEl, e.message);
  }
}

// ── Tab switching ─────────────────────────────────────────────────────
const TAB_RENDERERS = {
  day:          renderDay,
  worklist:     renderWorklist,
  reliability:  renderReliability,
  demand:       renderDemand,
  supply:       renderSupply,
  whatif:       renderWhatIf,
  build:        renderBuild,
  forecast:     renderForecast,
};

const LOADED = {};

function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    const active = btn.dataset.tab === id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.panel').forEach(function(panel) {
    panel.classList.toggle('active', panel.id === 'panel-' + id);
  });

  if (!LOADED[id]) {
    LOADED[id] = true;
    const fn = TAB_RENDERERS[id];
    if (fn) fn().catch && fn().catch(function(e) {
      console.error('Tab ' + id + ' render error:', e);
    });
  }

  // Update presenter panel notes for newly active tab
  _updatePresenterPanel(id);
}

// ── What-if event wiring ──────────────────────────────────────────────
function wireWhatIf() {
  const routeSel = document.getElementById('wi-route');
  const hourSel  = document.getElementById('wi-hour');
  const donorSel = document.getElementById('wi-donor');
  const minusBtn = document.getElementById('wi-minus');
  const plusBtn  = document.getElementById('wi-plus');
  const addVal   = document.getElementById('wi-add-val');
  const stdBtn   = document.getElementById('wi-bus-std');
  const dblBtn   = document.getElementById('wi-bus-dbl');

  if (routeSel) {
    routeSel.onchange = function() {
      S.wi.route = routeSel.value;
      S.wi.addBuses = 0;
      if (addVal) addVal.textContent = '0';
      updateWhatIfHours();
    };
  }

  if (hourSel) {
    hourSel.onchange = function() {
      S.wi.hour = Number(hourSel.value);
      updateDonorRoutes();
      computeWhatIf();
    };
  }

  if (donorSel) {
    donorSel.onchange = function() {
      S.wi.donor = donorSel.value;
      computeWhatIf();
    };
  }

  if (minusBtn) {
    minusBtn.onclick = function() {
      S.wi.addBuses = Math.max(-10, S.wi.addBuses - 1);
      if (addVal) addVal.textContent = S.wi.addBuses;
      computeWhatIf();
    };
  }

  if (plusBtn) {
    plusBtn.onclick = function() {
      S.wi.addBuses = Math.min(20, S.wi.addBuses + 1);
      if (addVal) addVal.textContent = S.wi.addBuses;
      computeWhatIf();
    };
  }

  function setBusType(useDouble) {
    S.wi.useDouble = useDouble;
    if (stdBtn) {
      stdBtn.setAttribute('aria-pressed', useDouble ? 'false' : 'true');
      stdBtn.classList.toggle('btn-active', !useDouble);
    }
    if (dblBtn) {
      dblBtn.setAttribute('aria-pressed', useDouble ? 'true' : 'false');
      dblBtn.classList.toggle('btn-active', useDouble);
    }
    computeWhatIf();
  }

  if (stdBtn) {
    stdBtn.onclick = function() { setBusType(false); };
  }
  if (dblBtn) {
    dblBtn.onclick = function() { setBusType(true); };
  }
}

// ── Keyboard navigation ────────────────────────────────────────────────
// ── Presenter guide ───────────────────────────────────────────────────
// Per-tab notes are populated by each renderer into this object.
var _presenterData = {
  day: {say:"We studied one service day. Compare the morning and evening boardings with the share of late departures. The difference led us to investigate the time allowed in the timetable.",point:"The two boarding totals, then the red lateness line.",next:"Open tab 2, Planner's worklist."},
  worklist: {say:"This is what the planner gets: a route, a direction, an hour, and the extra minutes the recorded trips needed. The headline adds those minutes across many trips and expresses the total in bus-hours. It is measured from that day; it is not time saved by our model. The list below keeps groups with enough trips to inspect. Accept records a proposal for review; it does not change a timetable.",point:"Read the evening bus-hours headline. Then follow the first row from Planned min to Median actual, 85th pct and Add min. The 85th percentile is enough time for 85 of every 100 recorded trips in that group.",next:"Select Accept or Set aside on one row, explain the choice, then open tab 3, Passenger demand."},
  demand: {say:"These are boardings: occasions when a passenger got on a bus. They are not a count of people waiting, or unique people. We use the hour, route and stop to see where service matters most. This gives the timetable problem a passenger context.",point:"The morning and evening peaks. Select a route and point to the stops with the most recorded boardings.",next:"Open tab 4, Service reliability, to see where departures fell behind."},
  reliability: {say:"Here we compare recorded stop departures with the timetable. A late departure is at least five minutes behind schedule. Look across the routes and hours to see whether the evening pattern is widespread. Different bus types serve different routes, so a difference between types does not prove that one type causes delay.",point:"The evening columns in the route-and-hour chart. Read the selected route and hour before quoting its value.",next:"Open tab 5, Supply and capacity, to compare service with boardings."},
  supply: {say:"This is the planning rule described by the scheduling engineer: compare boardings in an hour with seats supplied. It is a screening rule, not a measurement of how many passengers were on each bus at once. We use seats because standing capacity was not verified. A shortfall identifies a route and hour to investigate; it does not prove a spare bus is available elsewhere.",point:"Choose an evening hour. Point to the routes marked short, then show the boardings and seat assumptions behind one row.",next:"Open tab 6, Forecast. Now ask whether a model estimates trip time better than the timetable."},
  forecast: {say:"The question is simple: how long will this trip take? The model learns from earlier records, then we compare its answer with trips held out from training. Read the test window and the average error in minutes. Lower is better. Compare the timetable, the simple rule and the model on the same rows. A gain on this evening peak is not proof about another day, and the simpler methods can win under a stricter next-hour test.",point:"The test window first, then the average-error table and the simple-rule comparison. Show the late-evening limitation before moving on.",next:"Open tab 7, What if. Keep the measured result separate from the simulated change."},
  whatif: {say:"We can now explore a possible service change. This is a simulation: changing the control changes our calculation, not a real bus service. Watch the selected route and hour, and compare the result with its starting point. A planner still needs to check vehicle availability, duties and access before acting. We do not claim a saving in money.",point:"The SIMULATED label, the route and hour, then the value that changes when you add a bus. Return to the starting point once to make the comparison clear.",next:"Open tab 8, How it is built, and show where the figures come from."},
  build: {say:"The work runs inside Dataiku. We prepare the supplied tables, examine demand and reliability, test the running-time forecast, and publish the results for a planner. The tabs match the Flow so each claim can be traced to its table and recipe. Most importantly, the worklist is measured and the forecast is tested separately. The next step is to validate more service days with RTA before any operational trial.",point:"The live recipe counts and named Flow zones. Open the Forecast zone and show the preparation, training and evaluation steps, including the comparison methods.",next:"Return to The day for the conclusion. If time permits, open the separate, labelled control-room drill: reports, a human decision, then acknowledgements."}
};

function _updatePresenterPanel(tabId) {
  var panel = document.getElementById('presenter-panel');
  if (!panel || panel.dataset.hidden !== 'false') return;
  var d = _presenterData[tabId] || {};
  var say   = document.getElementById('pn-say-text');
  var point = document.getElementById('pn-point-text');
  var next  = document.getElementById('pn-next-text');
  if (say)   say.textContent   = d.say   || '';
  if (point) point.textContent = d.point || '';
  if (next)  next.textContent  = d.next  || '';
}

function _togglePresenter() {
  var panel = document.getElementById('presenter-panel');
  var btn   = document.getElementById('presenter-btn');
  if (!panel) return;
  var isShown = panel.dataset.hidden === 'false';
  panel.dataset.hidden = isShown ? 'true' : 'false';
  if (btn) {
    btn.setAttribute('aria-pressed', String(!isShown));
    btn.textContent = isShown ? 'Presenter notes' : 'Hide notes';
  }
  if (!isShown) {
    // Populate for current tab
    var active = document.querySelector('.tab-btn.active');
    if (active) _updatePresenterPanel(active.dataset.tab);
  }
}

function wireKeyboard() {
  // Tab-bar arrow navigation (focus movement within tab strip)
  var tabBar = document.getElementById('tab-bar');
  if (tabBar) {
    tabBar.addEventListener('keydown', function(e) {
      var btns = Array.from(tabBar.querySelectorAll('.tab-btn:not([hidden])'));
      var idx  = btns.indexOf(document.activeElement);
      if (idx < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        btns[(idx + 1) % btns.length].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        btns[(idx + btns.length - 1) % btns.length].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        document.activeElement.click();
      }
    });
  }

  // Global: Left/Right arrow = previous/next tab; P = toggle presenter
  document.addEventListener('keydown', function(e) {
    // Skip when typing in an input or select
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    var allBtns = Array.from(document.querySelectorAll('#tab-bar .tab-btn'));
    var activeBtn = document.querySelector('#tab-bar .tab-btn.active');
    var idx = allBtns.indexOf(activeBtn);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      var next = allBtns[(idx + 1) % allBtns.length];
      if (next) switchTab(next.dataset.tab);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      var prev = allBtns[(idx + allBtns.length - 1) % allBtns.length];
      if (prev) switchTab(prev.dataset.tab);
    } else if (e.key === 'p' || e.key === 'P') {
      // Only if not in a form field (already guarded above)
      e.preventDefault();
      _togglePresenter();
    }
  });

  // Presenter button click
  var presBtn = document.getElementById('presenter-btn');
  if (presBtn) {
    presBtn.addEventListener('click', _togglePresenter);
  }

  // Initialise panel state
  var panel = document.getElementById('presenter-panel');
  if (panel) panel.dataset.hidden = 'true';
}

// Forecast tab is always shown; no probe needed.

// ── Init ──────────────────────────────────────────────────────────────
(function init() {
  // Tab click handlers
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });

  wireWhatIf();
  wireKeyboard();

  // Load first tab
  LOADED['day'] = true;
  renderDay().catch(function(e) { console.error('Day tab error:', e); });

  // No background probe needed — forecast tab is always visible.
})();

// How it is built: the counts in the headline come from the Flow itself.
async function renderBuild() {
  const words = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
  try {
    const d = await apiFetch('/api/flow-steps');
    if (!d || d.error) throw new Error(d && d.error || 'no answer');
    const z = document.getElementById('bld-hl-zones'), st = document.getElementById('bld-hl-steps'), u = document.getElementById('bld-hl-unit'), src = document.getElementById('bld-hl-src');
    if (z) z.textContent = words[d.zones] || String(d.zones);
    if (st) st.textContent = String(d.steps);
    if (u) u.textContent = ' steps.';
    if (src) src.textContent = d.visual + ' visual recipes and ' + d.code + ' short Python recipes, in ' + d.zones + ' zones. Counted live from the Flow in Dataiku.';
  } catch (e) {
    const src = document.getElementById('bld-hl-src');
    if (src) src.textContent = 'The Flow could not be counted just now. The zones below are listed by hand.';
  }
}

