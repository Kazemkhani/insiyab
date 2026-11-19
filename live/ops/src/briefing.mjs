/** Briefing panel, incident report and learning card for the call theatre.
 *  All sections are hidden until the relevant lifecycle phase activates them.
 *  Demo mode only; every visible element carries a "Simulated" label. */
import {element} from './alerts.mjs';
import {DRILL_WORDS} from './theatre.mjs';
import {ROLES} from './lifecycle.mjs';

const ROLE_LABEL = {driver:'Driver', depot:'Depot', station:'Station', planning:'Planning desk'};
const OPTION_LABEL = {send_spare:'Send the standby bus', hold:'Hold the next departure 2 min',
  monitor:'Monitor and request an update'};
let LABELLED_COUNT = 128; // simulated running counter

function stamp(at) {
  // Map demo relative time to 18:xx
  if (!at) return '--:--';
  return new Date(at).toLocaleTimeString('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'});
}

export function mountBriefing(alert) {
  const briefingEl = document.querySelector('#briefing');
  const reportEl   = document.querySelector('#incident-report');
  const learnEl    = document.querySelector('#learn');
  if (!briefingEl || !reportEl || !learnEl) return {onState(){}, reset(){}};

  const arrivedRoles = new Set();
  let decisionRecord = null, startedAt = null, phaseAt = {};

  function resetPanels() {
    briefingEl.hidden = true; reportEl.hidden = true; learnEl.hidden = true;
    briefingEl.replaceChildren(element('h2','ONE BRIEFING'));
    reportEl.replaceChildren(element('h2','Incident report'));
    learnEl.replaceChildren(element('h2','What Insiyab learned'));
    arrivedRoles.clear(); decisionRecord = null; startedAt = null; phaseAt = {};
  }
  resetPanels();

  // Add a report line to the briefing card, with a "fly in" CSS class.
  function addReport(role) {
    if (arrivedRoles.has(role)) return;
    arrivedRoles.add(role);
    briefingEl.hidden = false;
    const row = element('div', undefined, 'briefing-row');
    row.dataset.briefingRole = role;
    const lbl = element('strong', ROLE_LABEL[role] + ': ');
    const txt = element('span', DRILL_WORDS[role]);
    const src = element('span', ' (Simulated · drill words, 18 Nov 2026)', 'source-note');
    row.append(lbl, txt, src);
    // Trigger fly-in animation by adding class after append
    briefingEl.append(row);
    requestAnimationFrame(() => row.classList.add('briefing-row--in'));
  }

  function addBriefingOptions(state) {
    const existing = briefingEl.querySelector('.briefing-options');
    if (existing) return;
    const opts = element('div', undefined, 'briefing-options');
    opts.append(element('p','Options considered:','source-note'));
    for (const opt of alert.suggestion.options) {
      const p = element('p', `${opt.label}: likely effect (estimate) — ${opt.likely_effect}`);
      if (opt.id === alert.suggestion.dss_pick) {
        p.append(element('span',' · Simulated RTA system pick','source-note'));
      }
      opts.append(p);
    }
    briefingEl.append(opts);
  }

  function buildIncidentReport(state) {
    reportEl.hidden = false;
    reportEl.replaceChildren();
    const hdr = element('div',undefined,'report-header');
    hdr.append(element('h2','Incident report'));
    const src = element('p','Simulated drill · 18 Nov 2026 · NOT a real incident','source-note');
    hdr.append(src);
    reportEl.append(hdr);
    // Timeline
    const tl = element('div',undefined,'report-timeline');
    const rows = [
      ['Alert raised', phaseAt.predicted || startedAt, 'Route 310, 19:23 — likely 13 min late'],
      ['Options shown', phaseAt.suggested, ''],
      ['Controller called', phaseAt.calling_duty || phaseAt.unacknowledged, 'Simulated call'],
      ['Decision made', state.decision_at, `${OPTION_LABEL[state.decision] || state.decision}`],
      ['Decision relayed', phaseAt.relaying, 'Four roles called'],
    ];
    for (const [role, roleRec] of Object.entries(state.roles)) {
      if (roleRec.at) rows.push([`${ROLE_LABEL[role] || role} received`, roleRec.at, '']);
    }
    for (const [label, at, detail] of rows) {
      if (!at) continue;
      const row = element('div',undefined,'report-row');
      row.append(element('time', stamp(at), 'report-time'), element('span', label),
        detail ? element('span',' — ' + detail,'report-detail') : '');
      tl.append(row);
    }
    reportEl.append(tl);
    // Reports summary
    const rpts = element('div',undefined,'report-rpts');
    for (const role of ROLES) {
      const r = element('p', `${ROLE_LABEL[role]}: ${DRILL_WORDS[role]}`);
      r.append(element('span',' (Simulated · drill words, 18 Nov 2026)','source-note'));
      rpts.append(r);
    }
    reportEl.append(rpts);
    // Open items
    const open = element('p','Open: departure board update at station still pending confirmation.','source-note');
    reportEl.append(open);
    // PDF button
    const printBtn = element('button','Save as PDF','print-btn'); printBtn.type='button';
    printBtn.addEventListener('click', () => window.print());
    reportEl.append(printBtn);
  }

  function buildLearnCard() {
    learnEl.hidden = false;
    learnEl.replaceChildren();
    learnEl.append(element('h2','What Insiyab learned'));
    learnEl.append(element('p','This incident is now one labelled example: signal, prediction, decision, outcome.'));
    LABELLED_COUNT++;
    const counter = element('p',`Labelled incidents: ${LABELLED_COUNT - 1} → ${LABELLED_COUNT} (simulated)`, 'source-note');
    learnEl.append(counter);
    learnEl.append(element('p','The forecast retrains on outcomes every night (pilot).'));
    learnEl.append(element('p','Simulated · no model training in this demo.','source-note'));
  }

  let lastPhase = null;

  function onState(state) {
    const p = state.phase;
    if (!startedAt) startedAt = state.started_at;
    if (p !== lastPhase) phaseAt[p] = state.phase_at;

    // Add reports as roles become 'sent' (they've reported back in the theatre narrative)
    for (const role of ROLES) {
      if (state.roles[role].status === 'sent' || state.roles[role].status === 'received') {
        addReport(role);
      }
    }
    // Once all reports in and decision made, add options
    if (arrivedRoles.size === ROLES.length && state.decision) addBriefingOptions(state);

    // Build incident report and learn card when demo completes
    if (p === 'received' && lastPhase !== 'received') {
      decisionRecord = state;
      buildIncidentReport(state);
      setTimeout(() => buildLearnCard(), 1200);
    }

    lastPhase = p;
  }

  return {onState, reset: resetPanels};
}
