/* options.js: prices the options of a drill incident against doing nothing, and names who approves each one.
   Pure functions, no network, no names or numbers. Everything here is SIMULATED: the incident is a drill and the
   standby-bus time and the hold are invented for rehearsal. The tool advises; the named person decides.

   The model, in one line: the passengers who were waiting for the late bus each wait some extra minutes.
   Passengers affected = boardings this hour x (minutes to the next bus / 60), because the hour's boardings are
   spread over the buses in it. Waiting = passengers x extra minutes each. Compared with doing nothing, as Marsad does.
   Assumption: those passengers turned up for the planned time. */
'use strict';

const STANDBY_ETA_MIN = 8;   // invented for the drill: minutes for a standby bus to reach the stop
const HOLD_MIN = 2;          // the hold in the incident's own wording: "hold the next departure two minutes"

const APPROVERS = {
  send_spare: { role: 'depot', title: 'Depot controller' },
  hold: { role: 'station', title: 'Station supervisor' },
  none: { role: 'manager', title: 'Duty manager' },
};

const n = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null);
const fmt = v => Math.round(v).toLocaleString('en-GB');
const pct = (a, b) => Math.round((a / b) * 1000) / 10;

function priceOptions(incident) {
  const out = JSON.parse(JSON.stringify(incident));
  const late = n(incident.minutes_late_now), gap = n(incident.next_bus_in_minutes), board = n(incident.boardings_this_hour);
  if (late === null || gap === null || board === null || late === 0) return out;   // fail closed: invent nothing
  const P = Math.round(board * gap / 60);
  const base = P * late;
  if (!P || !base) return out;

  out.options = (out.options || []).map(o => {
    if (o.impact) return o;
    const who = APPROVERS[o.key];
    let after, helps, cost, how;
    if (o.key === 'send_spare') {
      after = Math.min(late, STANDBY_ETA_MIN);
      helps = `About ${fmt(P)} passengers wait ${after} minutes instead of ${late}.`;
      cost = 'One standby bus and driver, for one trip.';
      how = `SIMULATED. Passengers affected: ${fmt(board)} boardings this hour x ${gap}/60 = ${fmt(P)}. Waiting: ${fmt(P)} x ${after} = ${fmt(P * after)} passenger-minutes, against ${fmt(base)} for doing nothing. Assumes the standby bus is ${STANDBY_ETA_MIN} minutes away: invented for the drill and not confirmed by any staff report.`;
    } else if (o.key === 'hold') {
      after = late + HOLD_MIN;
      helps = 'Passengers further along the route, if the two buses would have bunched. That benefit is not priced: the data holds no stop-by-stop gaps for this incident.';
      cost = `The ${fmt(P)} passengers on the next bus wait ${HOLD_MIN} minutes longer.`;
      how = `SIMULATED. Waiting: ${fmt(P)} x ${after} = ${fmt(P * after)} passenger-minutes, against ${fmt(base)} for doing nothing. The hold is ${HOLD_MIN} minutes, from the incident's own wording. The gain from evening out the gap is not counted.`;
    } else if (o.key === 'none') {
      after = late;
      helps = 'Nobody gets help now.';
      cost = 'No extra waiting is added, and none is removed.';
      how = `SIMULATED. Baseline: ${fmt(P)} passengers x ${late} minutes late = ${fmt(base)} passenger-minutes.`;
    } else return o;
    const pm = P * after, ch = pct(pm - base, base);
    const headline = ch < 0 ? `${Math.abs(ch)}% less waiting` : ch > 0 ? `${ch}% more waiting` : 'The baseline';
    return Object.assign({}, o, {
      impact: { passengers: P, minutes_each_before: late, minutes_each_after: after, passenger_minutes: pm, baseline_passenger_minutes: base, change_pct: ch, headline },
      approver_role: who.role, approver: who.title, who_it_helps: helps, what_it_costs: cost, how_worked_out: how, simulated: true,
    });
  });
  return out;
}

const approverRole = (incident, key) => { const o = (incident.options || []).find(x => x.key === key); return o && o.approver_role || null; };

function optionsText(options) {
  return (options || []).map((o, i) => {
    let s = `${i + 1}. ${o.say} (key: ${o.key})`;
    if (o.impact) s += `. Against doing nothing: ${o.impact.headline}${o.key === 'none' ? '' : ' (' + o.who_it_helps.split('. ')[0].replace(/\.$/, '') + ')'}. Approved by: ${o.approver}. Costs: ${o.what_it_costs.replace(/\.$/, '')}. This is a simulation`;
    return s;
  }).join('; ');
}

module.exports = { priceOptions, optionsText, approverRole, STANDBY_ETA_MIN, HOLD_MIN };
