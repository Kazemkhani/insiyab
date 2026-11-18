import {element} from './alerts.mjs';
export function validateJudge(data) {
  if (typeof data.fixture!=='boolean' || !Array.isArray(data.rows) || !data.unit || !data.source || !data.tested_on || !data.service_day) throw Error('Judge-pick metadata is incomplete');
  const seen=new Set();
  for(const row of data.rows) {
    const key=`${row.route}/${row.hour}`;
    if(typeof row.route!=='string' || !/^(16|17|18|19|20):00$/.test(row.hour) || !Number.isInteger(row.n) || row.n<0 || !['forecast','baseline','actual'].every(k=>row[k]===null||Number.isFinite(row[k])) || seen.has(key)) throw Error('Invalid or duplicate judge-pick row');
    seen.add(key);
  }
  return data;
}
export function mountJudge(input) {
  const data=validateJudge(input), host=document.querySelector('#judge-pick');
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
  host.append(element('p',`${data.rows.length} available route-hours · ${data.service_day} · ${data.source}. ${data.tested_on}`,'source-note'));
  function render() {
    const row=data.rows.find(r=>r.route===route.value && r.hour===hour.value);
    values.replaceChildren();
    for(const key of ['forecast','baseline','actual','n']) values.append(element('td',row?.[key]===undefined||row[key]===null?'Not available':`${row[key]}${key==='n'?'':` ${data.unit}`}`));
    if(!row) result.textContent='No held-out row for this route and hour. No value is inferred.';
    else if(row.n===0 || [row.forecast,row.baseline,row.actual].some(v=>v===null)) result.textContent='Comparison unavailable. The missing result stays visible.';
    else {
      const error=Math.abs(row.forecast-row.actual), baseline=Math.abs(row.baseline-row.actual);
      const verdict=error>baseline?'The simple rule was closer.':error<baseline?'The forecast was closer.':'Both were equally close.';
      result.textContent=`Forecast miss: ${Number(error.toFixed(2))} ${data.unit}. Simple-rule miss: ${Number(baseline.toFixed(2))} ${data.unit}. ${verdict}`;
    }
  }
  if(data.rows.length){route.value=data.rows[0].route;hour.value=data.rows[0].hour;}
  route.addEventListener('change',render);hour.addEventListener('change',render);render();
}
