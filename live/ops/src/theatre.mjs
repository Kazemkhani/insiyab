/** Call theatre: five people on the map with calling, talking and relay states.
 *  Demo mode only. Zero network calls. Labelled "Simulated · drill words, 18 Nov 2026".
 *  Returns onState(lifecycleState) for control.mjs to call on every lifecycle change. */
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
  img.src = `icons/${ICON[role]}.svg`; img.alt = ''; img.width = 22; img.height = 22;
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
  if (reduced.matches) { bubble.textContent = text; return Promise.resolve(); }
  return new Promise(resolve => {
    const words = text.split(' '); let i = 0;
    const id = setInterval(() => {
      bubble.textContent = words.slice(0, ++i).join(' ');
      if (i >= words.length) { clearInterval(id); resolve(); }
    }, 180);
  });
}

export function mountTheatre(map, alert) {
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

  function startCallingSequence(roles) {
    panToIncident();
    for (const role of ['driver','depot','station','planning','controller']) show(role);
    // Controller shows decided state if already decided (will be set by onState)
    // The four calling roles animate talking in a staggered sequence; guard against lifecycle
    // advancing the role to 'sent' before the timer fires.
    for (const role of ['driver','depot','station','planning']) {
      const delay = TALK_DELAY_MS[role];
      later(() => {
        const cur = markers[role].el.dataset.state;
        if (cur === 'calling') {
          setState(role, 'talking');
          streamWords(bubble(role), DRILL_WORDS[role], reduced);
        }
      }, delay + 200);
    }
  }

  function onState(state) {
    const phase = state.phase;

    // Controller decision: show their speech bubble
    if (phase === 'decided' && lastPhase !== 'decided') {
      if (!markers.controller.added) { markers.controller.mk.addTo(map); markers.controller.added = true; }
      setState('controller','decided');
      streamWords(bubble('controller'), DRILL_WORDS.controller, reduced);
    }

    // Start calling all four roles
    if (phase === 'relaying' && lastPhase !== 'relaying') {
      clearTimers();
      startCallingSequence(['driver','depot','station','planning']);
    }

    // Role transitions from calling → sent / received
    for (const role of ['driver','depot','station','planning']) {
      const rec = state.roles[role];
      const prev = lastRoles[role]?.status;
      if (rec.status === 'sent' && prev !== 'sent' && prev !== 'received') {
        // Delay sent state so it doesn't interrupt the talk animation
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

    // Reset on new run
    if (state.phase === 'predicted' && lastPhase === null) {
      clearTimers();
      for (const role of Object.keys(markers)) {
        const m = markers[role];
        if (m.added) { m.mk.remove(); m.added = false; }
        m.el.dataset.state = 'hidden';
        bubble(role).textContent = '';
      }
      lastPhase = null; lastRoles = {};
    }
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
