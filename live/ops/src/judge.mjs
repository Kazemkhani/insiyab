import {element} from './alerts.mjs';
// Stream C (model/) writes judge_pick.json as picks[] in seconds; the console reads rows[] in minutes.
// Convert here so both formats work and the producer's own label stays the source line.
const minutes = s => (s === null || s === undefined) ? null : Math.round(s / 6) / 10;
export function normaliseJudge(data) {
  if (!data || !Array.isArray(data.picks)) return data;
  return {
    version: data.version, fixture: data.fixture, service_day: data.service_day,
    unit: 'min', target: data.target || 'lateness',
    source: data.label || 'Model output',
    tested_on: [data.part, data.naive_label && `Simple rule: ${data.naive_label}`].filter(Boolean).join('. ') || 'Held-out part of the service day',
    // Each cell averages forecasts made in that hour over horizons of 1 to 20 stops. Signed means cancel, so the
    // miss must come from the producer's mean absolute errors, never from |mean forecast - mean actual|.
    horizons_note: 'Each cell averages the forecasts made in that hour; a miss is the mean absolute error',
    rows: data.picks.map(p => ({route: String(p.route), hour: p.hour, forecast: minutes(p.forecast_s), baseline: minutes(p.naive_s), actual: minutes(p.actual_s), n: p.n, forecast_mae: minutes(p.forecast_mae_s), baseline_mae: minutes(p.naive_mae_s)})),
  };
}
export function validateJudge(input) {
  const data = normaliseJudge(input);
  if (typeof data.fixture!=='boolean' || !Array.isArray(data.rows) || !data.unit || !data.source || !data.tested_on || !data.service_day) throw Error('Judge-pick metadata is incomplete');
  const seen=new Set();
  for(const row of data.rows) {
    const key=`${row.route}/${row.hour}`;
    if(typeof row.route!=='string' || !/^(16|17|18|19|20):00$/.test(row.hour) || !Number.isInteger(row.n) || row.n<0 || !['forecast','baseline','actual'].every(k=>row[k]===null||Number.isFinite(row[k])) || !['forecast_mae','baseline_mae'].every(k=>row[k]===undefined||row[k]===null||(Number.isFinite(row[k])&&row[k]>=0)) || seen.has(key)) throw Error('Invalid or duplicate judge-pick row');
    seen.add(key);
  }
  return data;
}
export function mountJudge(input) {
  const data=validateJudge(input), host=document.querySelector('#judge-pick');
  // Stand-in cells are never shown as proof (FACTS: stand-in tables never on screen). Until a real held-out file
  // arrives (fixture false), the section shows the one verified result and where it comes from.
  if(data.fixture){
    host.append(element('h2','Tested on trips it never saw'));
    host.append(element('p','On RTA\'s records in Dataiku, across 2,043 held-out evening trips, the forecast missed by 6.97 minutes on average against the timetable\'s 8.25: 15% closer.'));
    host.append(element('p','Source: RTA records, 15 Dec 2025 (opendata/onday/FORECAST-RETEST.md). The route-by-route cells in this build come from stand-in practice data, so they are not shown.','source-note'));
    return;
  }
  host.append(element('h2','Pick any route and hour'));
  const note=element('p',data.fixture?'Stand-in forecasts · STAND-IN DATA, NOT A RESULT':'Held-out forecasts','source-note');host.append(note);
  const controls=element('div',undefined,'judge-controls');
  const route=element('select');route.id='judge-route';const hour=element('select');hour.id='judge-hour';
  const routeLabel=element('label','Route ');routeLabel.htmlFor=route.id;const hourLabel=element('label','Hour ');hourLabel.htmlFor=hour.id;
  for(const value of [...new Set(data.rows.map(r=>r.route))]) {const opt=element('option',value);opt.value=value;route.append(opt);}
  for(let h=16;h<=20;h++){const opt=element('option',`${h}:00`);opt.value=`${h}:00`;hour.append(opt);}
  routeLabel.append(route);hourLabel.append(hour);controls.append(routeLabel,hourLabel);host.append(controls);
  const table=element('table');table.setAttribute('aria-label',`${data.target||'Forecast'} comparison in ${data.unit}`);
  const headings=element('tr');for(const text of ['Forecast','Simple rule','What happened','n']){const th=element('th',text);th.scope='col';headings.append(th);}
  const head=element('thead');head.append(headings);table.append(head);
  const body=element('tbody'), values=element('tr');body.append(values);table.append(body);host.append(table);
  const result=element('p',undefined,'judge-result');result.setAttribute('aria-live','polite');host.append(result);
  host.append(element('p',`${data.rows.length} available route-hours · ${data.service_day} · ${data.source}. ${data.tested_on}${data.horizons_note?`. ${data.horizons_note}.`:''}`,'source-note'));
  function render() {
    const row=data.rows.find(r=>r.route===route.value && r.hour===hour.value);
    values.replaceChildren();
    for(const key of ['forecast','baseline','actual','n']) values.append(element('td',row?.[key]===undefined||row[key]===null?'Not available':`${row[key]}${key==='n'?'':` ${data.unit}`}`));
    if(!row) result.textContent='No held-out row for this route and hour. No value is inferred.';
    else if(row.n===0 || [row.forecast,row.baseline,row.actual].some(v=>v===null)) result.textContent='Comparison unavailable. The missing result stays visible.';
    else {
      const hasMae=Number.isFinite(row.forecast_mae)&&Number.isFinite(row.baseline_mae);
      const error=hasMae?row.forecast_mae:Math.abs(row.forecast-row.actual), baseline=hasMae?row.baseline_mae:Math.abs(row.baseline-row.actual);
      const verdict=error>baseline?'The simple rule was closer.':error<baseline?'The forecast was closer.':'Both were equally close.';
      result.textContent=`Forecast miss: ${Number(error.toFixed(2))} ${data.unit}. Simple-rule miss: ${Number(baseline.toFixed(2))} ${data.unit}. ${verdict}`;
    }
  }
  if(data.rows.length){route.value=data.rows[0].route;hour.value=data.rows[0].hour;}
  route.addEventListener('change',render);hour.addEventListener('change',render);render();
}
