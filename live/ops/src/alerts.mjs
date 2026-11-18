export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function renderAlerts(data, bundle) {
  document.querySelector('#fixture-banner').hidden = !data.fixture;
  const alert = data.alerts[0];
  const now = document.querySelector('#now'), suggested = document.querySelector('#suggested'), next = document.querySelector('#next');
  now.replaceChildren(element('h2','NOW'));
  suggested.replaceChildren(element('h2','Suggested'));
  next.replaceChildren(element('summary', `NEXT · ${Math.max(0,data.alerts.length-1)} alerts`));
  if (!alert) {now.append(element('p','No open alerts.'));return null;}
  now.append(element('p', `${alert.severity.toUpperCase()} · Raised ${alert.raised_at}`, 'eyebrow'));
  now.append(element('h3', `Route ${alert.route} · ${alert.trip_departure}`));
  const riskText = alert.headline.split(': ').slice(1).join(': ') || alert.headline;
  now.append(element('p', riskText, 'risk risk-headline'),element('p', alert.why, 'why'));
  const evidence = alert.evidence;
  if (Number.isFinite(evidence.range_low_min) && Number.isFinite(evidence.range_high_min)) {
    now.append(element('p', `Range ${evidence.range_low_min} to ${evidence.range_high_min} min · ${evidence.promise}`, 'range-note'));
  }
  now.append(element('p', `${data.fixture?'Stand-in · ':''}${evidence.kind.replaceAll('_',' ')} · ${data.service_day}`, 'source-note'));
  suggested.append(element('p', alert.suggestion.text, 'suggestion-title'));
  const options = element('div', undefined, 'options'); options.id='options';
  for (const option of alert.suggestion.options) {
    const button = element('button');button.type='button';button.dataset.option=option.id;
    button.setAttribute('aria-pressed','false');
    button.append(element('span',option.label,'option-label'),element('span',`Likely effect (estimate): ${option.likely_effect}`,'option-effect'));
    options.append(button);
  }
  suggested.append(options);
  if (alert.suggestion.dss_pick_is_simulated) {
    suggested.append(element('p', "Simulated pick: RTA's system is not connected", 'source-note'));
    const pick = alert.suggestion.options.find(o=>o.id===alert.suggestion.dss_pick);
    if (pick) options.querySelector(`[data-option="${CSS.escape(pick.id)}"] .option-label`).append(element('span', ' · simulated pick', 'pick-label'));
  }
  const confirmation = element('div');confirmation.id='confirmation';suggested.append(confirmation);
  for (const upcoming of data.alerts.slice(1)) {
    const row=element('div',undefined,'next-row');
    row.append(element('p',`Route ${upcoming.route} · ${upcoming.trip_departure}`),element('p',upcoming.headline, 'muted'), element('p', `${data.fixture?'Stand-in · ':''}${upcoming.evidence.kind.replaceAll('_',' ')}`, 'source-note'));
    next.append(row);
  }
  const sources=element('details',undefined,'sources');sources.append(element('summary','Sources and limits'),element('p',data.sources.join(' · '),'source-note'));now.append(sources);
  if (!bundle['network.json'].routes.some(r=>r.route_id===alert.route)) {
    document.querySelector('#map-note').append(element('span',`Route ${alert.route}: alert location only; no trajectory in this replay.`, 'trajectory-note'));
  }
  return alert;
}
