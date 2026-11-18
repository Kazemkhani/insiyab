import {element} from './alerts.mjs';
export const HEAT_THRESHOLD=160;
export function validateHeat(data) {
  if(typeof data.fixture!=='boolean' || data.month!=='July' || !/^\d\d:\d\d$/.test(data.hour) || !Array.isArray(data.stops) || !data.method) throw Error('Heat layer needs a labelled July scenario');
  for(const stop of data.stops) if(!['pole','ac_shelter','',null].includes(stop.stop_kind)||!Number.isFinite(stop.priority)||stop.priority<0||!Number.isFinite(stop.lat)||Math.abs(stop.lat)>90||!Number.isFinite(stop.lon)||Math.abs(stop.lon)>180)throw Error('Invalid heat stop');
  return data;
}
export function mountHeat(input,replay) {
  const data=validateHeat(input), heading=document.querySelector('.map-heading');
  const button=element('button','July scenario');button.id='heat';button.type='button';button.setAttribute('aria-pressed','false');heading.insertBefore(button,document.querySelector('#replay-clock'));
  const info=element('div',undefined,'heat-info');info.id='heat-info';info.hidden=true;
  info.append(element('p',`July scenario · ${data.hour} · ${data.fixture?'Stand-in heat · STAND-IN DATA, NOT A RESULT':'Priority rule, not a measured heat emergency'}`));
  const legend=element('p',undefined,'heat-legend');
  for(const [kind,label] of [['pole','Pole'],['shelter','Air-conditioned shelter'],['unknown','Unknown kind']]) {
    const item=element('span');item.append(element('i',undefined,`stop-key ${kind}`),document.createTextNode(label));legend.append(item);
  }
  info.append(legend,element('p',`Larger marks mean higher priority. Red outline: above ${HEAT_THRESHOLD} priority points (illustrative threshold).`, 'source-note'));
  const details=element('details');details.append(element('summary','Heat source and method'),element('p',`${data.source||'Public stop kinds and weather scenario supplied by the watcher stream'}. ${data.method}. December 2025 is not shown as a heat emergency.`,'source-note'));info.append(details);
  heading.after(info);
  button.addEventListener('click',()=>{
    const enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));info.hidden=!enabled;replay.setHeat(enabled?data.stops:[]);
  });
}
