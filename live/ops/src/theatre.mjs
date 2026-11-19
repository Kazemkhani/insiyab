/** Call theatre: five people on the map with calling, talking, reported, sent and received states.
 *  Staff call BEFORE the decision (unacknowledged phase); controller speaks at decided;
 *  relay sweep drives sent→received. Demo mode only. Zero network calls.
 *  onRoleTalked(role) is called after each staff member finishes talking — used by
 *  briefing.mjs to add their report row to ONE BRIEFING before the decision. */
import maplibregl from 'maplibre-gl';

export const DRILL_WORDS = {
  driver:  'Driver says the bus is not ready to go and expects to return about twenty minutes late.',
  depot:   'Depot says a standby bus with a driver is likely available for route 310, but not fully confirmed. They estimate it could be ready in about fifteen minutes, though that number is a guess.',
  station: 'Station supervisor says the departure board can be checked and it is still showing the old time, not an updated one.',
  planning:'Planner recommends yes, route 310 at 18:00 should go on the timetable-review list.',
  controller:'I choose: send the standby bus.',
};

// Illustrative positions (not from GPS/roster; labelled as such).
const LOCS = {
  driver:     [55.2708, 25.2048], // near alert, labelled "on route 310 (illustrative)"
  depot:      [55.3200, 25.2290], // NE illustrative depot
  station:    [55.2650, 25.1960], // SW illustrative station
  planning:   [55.2900, 25.2010], // E illustrative planning desk
  controller: [55.3100, 25.2560], // N illustrative control centre
};
const ILLUSTRATIVE = {driver:'on route 310 (illustrative)', depot:'illustrative location',
  station:'illustrative location', planning:'illustrative location', controller:'illustrative location'};
const LABEL = {driver:'Driver', depot:'Depot', station:'Station',
  planning:'Planning desk', controller:'Duty controller'};
const ICON = {driver:'driver', depot:'depot', station:'station', planning:'planning', controller:'controller'};
const TALK_DELAY_MS = {driver:0, depot:800, station:1600, planning:2400}; // stagger per role

function makeEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
function makeMarkerEl(role) {
  const wrap = makeEl('div','theatre-marker');
  wrap.dataset.person = role; wrap.dataset.state = 'hidden';
  // Ring contains the icon (flex-centered; no position:absolute needed)
  const ring = makeEl('div','marker-ring'); ring.setAttribute('aria-hidden','true');
  const img = document.createElement('img');
  img.src = `icons/${ICON[role]}.svg`; img.alt = ''; img.width = 44; img.height = 44;
  ring.append(img);
  // Label: flex column so name and note are separate flex children (no text overlap)
  const lbl = makeEl('div','marker-label');
  const name = makeEl('span','marker-name', LABEL[role]);
  const note = makeEl('span','marker-note', ILLUSTRATIVE[role]);
  lbl.append(name, note);
  const wave = makeEl('div','voice-wave'); wave.setAttribute('aria-hidden','true');
  for (let i=0;i<5;i++) wave.append(document.createElement('span'));
  const bubble = makeEl('div','speech-bubble');
  bubble.setAttribute('role','log'); bubble.setAttribute('aria-live','polite');
  const src = makeEl('p','source-note','Simulated · drill words, 18 Nov 2026');
  wrap.append(ring, lbl, wave, bubble, src);
  return wrap;
}

function streamWords(bubble, text, reduced) {
  // Visual word-by-word stream. State transitions (reported, onRoleTalked) are
  // driven by a separate later() call in startStaffCalls at the same scheduler
  // depth as the talking timer — this lets them fire within one Playwright
  // fake-clock fast_forward regardless of how many word timeouts are queued.
  if (reduced.matches) { bubble.textContent = text; return; }
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    setTimeout(() => { bubble.textContent = words.slice(0, i + 1).join(' '); }, (i + 1) * 180);
  }
}

export function mountTheatre(map, alert, onRoleTalked) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const markers = {};
  let lastPhase = null, lastRoles = {}, theatreTimers = [], panDone = false;

  for (const role of Object.keys(LOCS)) {
    const el = makeMarkerEl(role);
    const mk = new maplibregl.Marker({element: el, anchor: 'bottom'})
      .setLngLat(LOCS[role]);
    markers[role] = {el, mk, added: false};
  }

  function show(role) {
    const m = markers[role];
    if (!m.added) { m.mk.addTo(map); m.added = true; }
    // Only set to 'calling' if the marker is still hidden; a marker that reached
    // 'decided' (controller) must not regress when relaying starts.
    if (m.el.dataset.state === 'hidden') m.el.dataset.state = 'calling';
  }
  function setState(role, state) { markers[role].el.dataset.state = state; }
  function bubble(role) { return markers[role].el.querySelector('.speech-bubble'); }

  function clearTimers() { theatreTimers.forEach(clearTimeout); theatreTimers = []; panDone = false; }
  function later(fn, ms) { theatreTimers.push(setTimeout(fn, ms)); }

  function panToIncident() {
    if (panDone || reduced.matches) { panDone = true; return; }
    panDone = true;
    map.flyTo({center: [alert.lon, alert.lat], zoom: 11.5, duration: 1200,
      easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t});
  }

  // Show four staff in calling state, then stagger their talking.
  // Called at 'unacknowledged' so reports fly into ONE BRIEFING BEFORE the decision.
  //
  // Two later() calls per role, both scheduled here (same depth as the lifecycle tick
  // that calls us). This means both fire within a single Playwright fake-clock
  // fast_forward — word timeouts inside streamWords can't cascade through the fake
  // clock, so the state transition must NOT live inside the streamWords callback.
  function startStaffCalls() {
    panToIncident();
    for (const role of ['driver','depot','station','planning']) show(role);
    for (const role of ['driver','depot','station','planning']) {
      const delay = TALK_DELAY_MS[role];
      // Talking: show voice-wave and start visual word stream.
      later(() => {
        if (markers[role].el.dataset.state === 'calling') {
          setState(role, 'talking');
          streamWords(bubble(role), DRILL_WORDS[role], reduced);
        }
      }, delay + 200);
      // Reported: fires after the last word would have finished streaming.
      // Scheduled at the same depth as the talking timer so it fires within
      // one fast_forward call in tests (depth-1 within-range timer).
      const wordMs = DRILL_WORDS[role].split(' ').length * 180;
      later(() => {
        if (markers[role].el.dataset.state === 'talking') {
          setState(role, 'reported');
          if (onRoleTalked) onRoleTalked(role);
        }
      }, delay + 200 + wordMs + 50);
    }
  }

  function onState(state) {
    const phase = state.phase;

    // unacknowledged: staff appear in calling state; staggered talking starts.
    // All reports land in ONE BRIEFING BEFORE the duty controller is called.
    if (phase === 'unacknowledged' && lastPhase !== 'unacknowledged') {
      clearTimers();
      startStaffCalls();
    }

    // decided: cancel any pending talking timers (quick-decide path), then show controller.
    if (phase === 'decided' && lastPhase !== 'decided') {
      clearTimers();
      if (!markers.controller.added) { markers.controller.mk.addTo(map); markers.controller.added = true; }
      setState('controller', 'decided');
      streamWords(bubble('controller'), DRILL_WORDS.controller, reduced);
    }

    // Relay sweep: lifecycle role statuses drive reported/calling → sent → received.
    for (const role of ['driver','depot','station','planning']) {
      const rec = state.roles[role];
      const prev = lastRoles[role]?.status;
      if (rec.status === 'sent' && prev !== 'sent' && prev !== 'received') {
        later(() => {
          if (markers[role].el.dataset.state !== 'received') setState(role, 'sent');
        }, 200);
      }
      if (rec.status === 'received' && prev !== 'received') {
        later(() => setState(role, 'received'), 150);
      }
    }

    lastPhase = phase;
    lastRoles = structuredClone(state.roles);
  }

  function reset() {
    clearTimers();
    for (const role of Object.keys(markers)) {
      const m = markers[role];
      if (m.added) { m.mk.remove(); m.added = false; }
      m.el.dataset.state = 'hidden';
      bubble(role).textContent = '';
    }
    lastPhase = null; lastRoles = {};
  }

  return {onState, reset};
}
