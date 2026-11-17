/* script.js — Insiyab Dataiku webapp
 *
 * No external dependencies.  All charts are inline SVG built here.
 * getWebAppBackendUrl(path) is provided by Dataiku's runtime.
 *
 * Data sources and their tabs:
 *   Tab 1 "The day"            punctuality_by_hour, demand_by_hour
 *   Tab 2 "Service reliability" punctuality_by_route_hour, punctuality_by_bus_type
 *   Tab 3 "Passenger demand"   demand_by_hour, demand_by_route_hour, demand_by_stop
 *   Tab 4 "Supply and capacity" supply_vs_demand_by_route_hour, supply_status_by_hour
 *   Tab 5 "What if"            supply_vs_demand_by_route_hour (browser computation)
 *   Forecast                   forecast_boardings, forecast_lateness, model_metrics, insights
 */

// ── Colour tokens ───────────────────────────────────────────────────
const C = {
  paper: '#F6F5F1', ink: '#12263A', flow: '#0E5A5A',
  over: '#B23A2E', spare: '#2F6690', sim: '#8A5A00',
  g1: '#E6E8EA', g2: '#C3C9CF', g3: '#8C96A0', g4: '#5A6672',
};

// ── State ────────────────────────────────────────────────────────────
const S = {
  pHour: null, pRouteHour: null, pBusType: null,
  dHour: null, dRouteHour: null, dStop: null,
  supply: null, supplyStatus: null, forecast: null,
  supplyHour: null, demandRoute: null,
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
function buildDualLine(data) {
  // data: [{hour, late5, boardings}]
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

  // Lateness line
  let lPath = data.map(function(d, i) {
    return (i === 0 ? 'M' : 'L') + xS(d.hour).toFixed(1) + ',' + yL(d.late5 || 0).toFixed(1);
  }).join(' ');
  g.appendChild(se('path', { d: lPath, fill: 'none', stroke: C.over, 'stroke-width': 2.5 }));

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
  { key: 'short even with standing', color: '#7A1A14' },
  { key: 'short of seats',           color: C.over   },
  { key: 'in balance',               color: C.flow   },
  { key: 'under a fifth used',       color: C.spare  },
  { key: 'route not in the running-time table', color: C.g3 },
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
  const headlineEl = document.getElementById('day-headline');
  const chartEl    = document.getElementById('day-chart');
  const statsEl    = document.getElementById('day-stats');
  const whyEl      = document.getElementById('day-why');

  setLoading(headlineEl);
  setLoading(chartEl);

  try {
    const [ph, dh] = await Promise.all([
      S.pHour  || apiFetch('/api/punctuality-by-hour').then(function(d) { return (S.pHour = d); }),
      S.dHour  || apiFetch('/api/demand-by-hour').then(function(d) { return (S.dHour = d); }),
    ]);

    // Pick the worst evening peak hour (15:00-20:00, count >= 500) for
    // both the headline and the stat tile so they always agree.
    const candidateRows = ph.filter(function(r) {
      return r.hour >= 15 && r.hour <= 20 && Number(r.count || 0) >= 500;
    });
    const worstRow = candidateRows.reduce(function(best, r) {
      return (!best || Number(r.late_5min_avg) > Number(best.late_5min_avg)) ? r : best;
    }, null);
    // Compare specifically with the 07:00 hour
    const morningRow = ph.find(function(r) { return r.hour === 7; });

    if (worstRow && morningRow) {
      const pct = Math.round(Number(worstRow.late_5min_avg) * 100);
      const pct7 = Math.round(Number(morningRow.late_5min_avg) * 100);
      headlineEl.textContent = 'At ' + fmtHour(worstRow.hour) + ', ' + pct +
        '% of ' + fmtNum(worstRow.count) + ' departures left 5 or more minutes late, ' +
        'against ' + pct7 + '% of ' + fmtNum(morningRow.count) + ' at 07:00. ' +
        'The supply and capacity tab shows where buses ran short at the same hour.';
    } else if (worstRow) {
      const pct = Math.round(Number(worstRow.late_5min_avg) * 100);
      headlineEl.textContent = 'At ' + fmtHour(worstRow.hour) + ', ' + pct +
        '% of ' + fmtNum(worstRow.count) + ' departures left 5 or more minutes late.';
    } else {
      headlineEl.textContent = 'Evening peak lateness could not be computed from the available data.';
    }

    // Dual-axis chart
    const chartData = ph.map(function(r) {
      const dRow = dh.find(function(d) { return d.hour === r.hour; });
      return {
        hour: r.hour,
        late5: Number(r.late_5min_avg) || 0,
        boardings: dRow ? Number(dRow.boardings_sum) || 0 : 0,
      };
    }).sort(function(a,b) { return a.hour - b.hour; });

    chartEl.innerHTML = '';
    chartEl.appendChild(buildDualLine(chartData));

    // Stats — worst-hour tile uses the same worstRow as the headline
    const peakBoard = dh.reduce(function(best, r) {
      return (!best || Number(r.boardings_sum) > Number(best.boardings_sum)) ? r : best;
    }, null);
    const dtAvg = ph.reduce(function(s, r) { return s + (Number(r.drive_through_avg) || 0); }, 0) / ph.length;

    statsEl.innerHTML =
      stat(fmtPct(worstRow && worstRow.late_5min_avg, 0),
           'worst hour (' + fmtHour(worstRow && worstRow.hour) + ')',
           'punctuality_by_hour', 'over') +
      stat(fmtNum(peakBoard && peakBoard.boardings_sum),
           'boardings at peak (' + fmtHour(peakBoard && peakBoard.hour) + ')',
           'demand_by_hour', 'spare') +
      stat(fmtPct(dtAvg, 1),
           'drive-throughs (avg, all hours)',
           'punctuality_by_hour', '');

    // Why copy
    whyEl.innerHTML =
      '<strong>What this is:</strong> measured departures and nol card boardings on 15 December 2025. ' +
      '<strong>What is a finding:</strong> lateness and demand peak in the same hours. ' +
      '<strong>What is an open question:</strong> whether the shortage of buses causes the lateness, ' +
      'or whether lateness causes missed connections that inflate boardings, is not measured here.';

  } catch (e) {
    setError(headlineEl, e.message);
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

    // Boardings by hour
    hourEl.innerHTML = '';
    const hourData = S.dHour.slice().sort(function(a,b) { return a.hour - b.hour; });
    hourEl.appendChild(buildBar(hourData, 'hour', 'boardings_sum', {
      color: C.spare, yLabel: 'boardings',
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

    // Lead sentence: how many route-hours short vs spare at the selected hour
    const leadEl = document.getElementById('supply-lead-sentence');
    if (leadEl && S.supplyHour) {
      var shortN = 0, spareN = 0;
      S.supplyStatus.forEach(function(r) {
        if (r.hour !== S.supplyHour) return;
        if (r.status === 'short of seats' || r.status === 'short even with standing') {
          shortN += Number(r.count || 0);
        }
        if (r.status === 'under a fifth used') {
          spareN += Number(r.count || 0);
        }
      });
      var txt = 'At ' + fmtHour(S.supplyHour) + ', ' + shortN + ' route-hours ran short of buses';
      if (spareN > 0) {
        txt += ' while ' + spareN + ' had spare capacity in the same hour.';
        txt += ' The short routes and the spare routes were in different parts of the network at the same time.';
      } else {
        txt += '.';
      }
      leadEl.textContent = txt;
    } else if (leadEl) {
      leadEl.textContent = '';
    }

    selEl.onchange = function() {
      S.supplyHour = selEl.value ? Number(selEl.value) : null;
      // Update lead sentence when hour changes
      var leadEl2 = document.getElementById('supply-lead-sentence');
      if (leadEl2 && S.supplyHour) {
        var shortN2 = 0, spareN2 = 0;
        S.supplyStatus.forEach(function(r) {
          if (r.hour !== S.supplyHour) return;
          if (r.status === 'short of seats' || r.status === 'short even with standing') {
            shortN2 += Number(r.count || 0);
          }
          if (r.status === 'under a fifth used') {
            spareN2 += Number(r.count || 0);
          }
        });
        var txt2 = 'At ' + fmtHour(S.supplyHour) + ', ' + shortN2 + ' route-hours ran short of buses';
        if (spareN2 > 0) {
          txt2 += ' while ' + spareN2 + ' had spare capacity in the same hour.';
          txt2 += ' The short routes and the spare routes were in different parts of the network at the same time.';
        } else {
          txt2 += '.';
        }
        leadEl2.textContent = txt2;
      } else if (leadEl2) {
        leadEl2.textContent = '';
      }
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
async function renderForecast() {
  const el = document.getElementById('forecast-content');
  setLoading(el);
  try {
    if (!S.forecast) S.forecast = await apiFetch('/api/forecast');
    const f = S.forecast;
    let html = '';

    ['forecast_boardings', 'forecast_lateness', 'model_metrics', 'insights'].forEach(function(key) {
      const val = f[key];
      if (!val || val.error) {
        html += '<p class="not-built">The ' + key.replace(/_/g,' ') + ' step has not been built yet.</p>';
      } else {
        html += '<h3>' + key.replace(/_/g,' ') + '</h3>';
        html += '<p class="caption">Source: ' + key + ' (' + val.length + ' rows)</p>';
        // Simple table
        if (val.length) {
          const cols = Object.keys(val[0]);
          html += '<div style="overflow-x:auto"><table class="whatif-table"><thead><tr>';
          cols.forEach(function(c) { html += '<th>' + c + '</th>'; });
          html += '</tr></thead><tbody>';
          val.slice(0, 10).forEach(function(row) {
            html += '<tr>';
            cols.forEach(function(c) { html += '<td>' + (row[c] != null ? row[c] : '') + '</td>'; });
            html += '</tr>';
          });
          if (val.length > 10) html += '<tr><td colspan="' + cols.length + '" style="color:var(--g3)">... ' + (val.length-10) + ' more rows</td></tr>';
          html += '</tbody></table></div>';
        }
      }
    });

    el.innerHTML = html;
  } catch (e) {
    setError(el, e.message);
  }
}

// ── Tab switching ─────────────────────────────────────────────────────
const TAB_RENDERERS = {
  day:          renderDay,
  reliability:  renderReliability,
  demand:       renderDemand,
  supply:       renderSupply,
  whatif:       renderWhatIf,
  build:        function() {},  // static content
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
function wireKeyboard() {
  const tabBar = document.getElementById('tab-bar');
  if (!tabBar) return;
  tabBar.addEventListener('keydown', function(e) {
    const btns = Array.from(tabBar.querySelectorAll('.tab-btn:not([hidden])'));
    const idx  = btns.indexOf(document.activeElement);
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

// ── Forecast tab: show only when data exists ──────────────────────────
async function probeForecast() {
  try {
    const f = await apiFetch('/api/forecast');
    S.forecast = f;
    const hasAny = ['forecast_boardings','forecast_lateness','model_metrics','insights']
      .some(function(k) { return f[k] && !f[k].error; });
    if (hasAny) {
      const btn = document.getElementById('tbtn-forecast');
      if (btn) btn.removeAttribute('hidden');
    }
  } catch (e) {
    // Forecast datasets absent — tab stays hidden
  }
}

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

  // Probe forecast in background
  probeForecast();
})();
