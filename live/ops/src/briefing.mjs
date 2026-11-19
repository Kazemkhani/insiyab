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

// stamp converts a fake-clock absolute timestamp to the demo's simulated 18:xx:ss display.
// The formula mirrors control.mjs: 67980 seconds since midnight = 18:53:00 at demo start.
function stamp(at, startedAt) {
  if (!at || !startedAt) return '--:--';
  const demoSec = 67980 + (at - startedAt) / 1000;
  return new Date(demoSec * 1000).toISOString().slice(11, 19);
}

export function mountBriefing(alert) {
  const briefingEl = document.querySelector('#briefing');
  const reportEl   = document.querySelector('#incident-report');
  const learnEl    = document.querySelector('#learn');
  if (!briefingEl || !reportEl || !learnEl) return {onState(){}, reset(){}};

  const arrivedRoles = new Set();
  const roleAt = {};   // role -> absolute ms timestamp when addRoleReport was called
  let decisionRecord = null, startedAt = null, phaseAt = {};

  function resetPanels() {
    briefingEl.hidden = true; reportEl.hidden = true; learnEl.hidden = true;
    briefingEl.replaceChildren(element('h2','ONE BRIEFING'));
    reportEl.replaceChildren(element('h2','Incident report'));
    learnEl.replaceChildren(element('h2','What Insiyab learned'));
    arrivedRoles.clear(); Object.keys(roleAt).forEach(k => delete roleAt[k]);
    decisionRecord = null; startedAt = null; phaseAt = {};
  }
  resetPanels();

  // Add a report line to the briefing card, with a "fly in" CSS class.
  function addReport(role) {
    if (arrivedRoles.has(role)) return;
    arrivedRoles.add(role);
    roleAt[role] = Date.now();  // record when this role reported, for incident timeline
    briefingEl.hidden = false;
    const row = element('div', undefined, 'briefing-row');
    row.dataset.briefingRole = role;
    const lbl = element('strong', ROLE_LABEL[role] + ': ');
    const txt = element('span', DRILL_WORDS[role]);
    const src = element('span', ' (Simulated, drill words, 18 Nov 2026)', 'source-note');
    row.append(lbl, txt, src);
    // Trigger fly-in animation: setTimeout(fn,1) defers one tick after the DOM
    // is committed, so the CSS transition fires. Use setTimeout not requestAnimationFrame
    // so Playwright's fake clock can advance it in tests (rAF is not clock-controlled).
    briefingEl.append(row);
    setTimeout(() => row.classList.add('briefing-row--in'), 1);
  }

  function addBriefingOptions(state) {
    const existing = briefingEl.querySelector('.briefing-options');
    if (existing) return;
    const opts = element('div', undefined, 'briefing-options');
    opts.append(element('p','Options considered:','source-note'));
    for (const opt of alert.suggestion.options) {
      const p = element('p', `${opt.label}: likely effect (estimate): ${opt.likely_effect}`);
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
      ['Alert raised', phaseAt.predicted || startedAt, 'Route 310, 19:23: likely 13 min late'],
      ['Options shown', phaseAt.suggested, ''],
      ['Controller called', phaseAt.calling_duty || phaseAt.unacknowledged, 'Simulated call'],
    ];
    // Insert staff reports in the order they arrived, before Decision made
    for (const role of ['driver','depot','station','planning']) {
      if (roleAt[role]) rows.push([`${ROLE_LABEL[role]} reported`, roleAt[role], '']);
    }
    rows.push(
      ['Decision made', state.decision_at, `${OPTION_LABEL[state.decision] || state.decision}`],
      ['Decision relayed', phaseAt.relaying, 'Four roles called'],
    );
    for (const [role, roleRec] of Object.entries(state.roles)) {
      if (roleRec.at) rows.push([`${ROLE_LABEL[role] || role} received`, roleRec.at, '']);
    }
    // One row per event, in the order things happened; every row has exactly three cells so columns never shift.
    const timed = rows.filter(([, at]) => at).map((r, i) => [...r, i]).sort((a, b) => (a[1] - b[1]) || (a[3] - b[3]));
    for (const [label, at, detail] of timed) {
      const row = element('div',undefined,'report-row');
      row.append(element('time', stamp(at, startedAt), 'report-time'), element('span', label, 'report-event'),
        element('span', detail || '', 'report-detail'));
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

  // addRoleReport is called by theatre.mjs when a staff member finishes talking
  // (pre-decision, during 'unacknowledged' phase). Reports fly into ONE BRIEFING.
  function addRoleReport(role) { addReport(role); }

  function onState(state) {
    const p = state.phase;
    if (!startedAt) startedAt = state.started_at;
    if (p !== lastPhase) phaseAt[p] = state.phase_at;

    // Fallback: add reports via lifecycle status for the quick-decide path where
    // staff did not get time to talk (e.g. user clicked immediately).
    for (const role of ROLES) {
      if (state.roles[role].status === 'sent' || state.roles[role].status === 'received') {
        addReport(role);
      }
    }
    // Once all reports in and decision made, add the options summary.
    if (arrivedRoles.size === ROLES.length && state.decision) addBriefingOptions(state);

    // Build incident report and learn card when demo completes
    if (p === 'received' && lastPhase !== 'received') {
      decisionRecord = state;
      buildIncidentReport(state);
      setTimeout(() => buildLearnCard(), 1200);
    }

    lastPhase = p;
  }

  return {onState, reset: resetPanels, addRoleReport};
}
