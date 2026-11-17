// The rules of the Khutwa page, with no screen in them, so they can be tested without a browser.
// Used by the page (as window.Khutwa) and by rider/tests/logic.test.mjs.
(function (root) {
  'use strict';

  // A walking offer is never made for a long walk: more than this many metres is never shown to anyone.
  var LONGEST_WALK_METRES = 400;

  // What points buy. Everyday things, no shop and no brand. The prices in points are this prototype's example.
  var REWARDS = [
    { key: 'bread', name: 'A loaf of bread', points: 30 },
    { key: 'fare', name: 'One bus fare', points: 40 },
    { key: 'topup', name: 'A small phone top-up', points: 60 },
    { key: 'rice', name: 'A kilo of rice', points: 80 }
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Seconds since the start of the service day, as a clock time. 25:10 on the service day is 01:10.
  function clock(seconds) {
    var s = Math.round(seconds);
    return pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor((s % 3600) / 60));
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function isNumber(x) { return typeof x === 'number' && isFinite(x); }

  // An offer the page may show at all: it earns points, it costs no money, and it is not a long walk.
  function allowed(choice) {
    return !!choice && isNumber(choice.points) && choice.points > 0 &&
      isNumber(choice.walk_metres) && choice.walk_metres >= 0 && choice.walk_metres <= LONGEST_WALK_METRES;
  }

  // The choices put to this passenger. After "I cannot walk further", none involves any walk beyond her own stop.
  function choicesFor(offer, cannotWalk) {
    if (!offer || !offer.choices) return [];
    return offer.choices.filter(function (c) { return allowed(c) && (!cannotWalk || c.walk_metres === 0); });
  }

  // The words for one choice: what it is, what it costs her (time and walking, never money), what she earns.
  function describe(choice, usual) {
    var what, costs = [];
    if (choice.kind === 'earlier') what = 'The ' + clock(choice.depart) + ' bus on route ' + choice.route + ', ' + plural(choice.minutes_earlier, 'minute', 'minutes') + ' earlier';
    else if (choice.kind === 'later') what = 'The ' + clock(choice.depart) + ' bus on route ' + choice.route + ', ' + plural(choice.minutes_later, 'minute', 'minutes') + ' later';
    else what = 'The ' + clock(choice.depart) + ' bus on route ' + choice.route;
    var sameStop = !usual || choice.stop_id === usual.stop_id;
    if (choice.walk_metres > 0) costs.push('a walk of ' + choice.walk_metres + ' metres, about ' + plural(choice.walk_minutes, 'minute', 'minutes') + ', to ' + choice.stop);
    else costs.push(sameStop ? 'no extra walk: it leaves from this stop' : 'no extra walk');
    if (choice.kind === 'earlier') costs.push('you leave ' + plural(choice.minutes_earlier, 'minute', 'minutes') + ' sooner');
    if (choice.kind === 'later') costs.push('you wait ' + plural(choice.minutes_later, 'minute', 'minutes') + ' longer');
    costs.push(choice.extra_minutes > 0 ? 'the journey takes ' + plural(choice.extra_minutes, 'minute', 'minutes') + ' longer' : 'the journey takes no longer');
    costs.push('the fare is the same');
    var room = null;
    if (isNumber(choice.load) && isNumber(choice.seats)) {
      var free = choice.seats - choice.load;
      room = free > 0 ? 'On the day it left with ' + choice.load + ' on board and ' + choice.seats + ' seats: ' + plural(free, 'seat', 'seats') + ' free. A seat is not reserved.'
        : 'On the day it left with ' + choice.load + ' on board and ' + choice.seats + ' seats.';
    }
    return { what: what, costs: costs, earns: plural(choice.points, 'Khutwa point', 'Khutwa points'), room: room };
  }

  // What the points are worth: for each everyday thing, how many mornings like this one it takes.
  function whatPointsBuy(points) {
    if (!isNumber(points) || points <= 0) return [];
    return REWARDS.map(function (r) {
      var mornings = Math.ceil(r.points / points);
      return { key: r.key, name: r.name, points: r.points, mornings: mornings, enough: points >= r.points };
    });
  }

  // How full the usual bus was: the words and numbers for the first screen.
  function fullness(usual) {
    var over = usual.load - usual.seats;
    return { over: over, full: over > 0,
      words: over > 0 ? (over === 1 ? 'passenger' : 'passengers') + ' without a seat' : (over === -1 ? 'seat' : 'seats') + ' free' };
  }

  function lateness(seconds) {
    var m = Math.round(seconds / 60);
    if (m >= 1) return plural(m, 'minute', 'minutes') + ' late';
    if (m <= -1) return plural(-m, 'minute', 'minutes') + ' early';
    return 'on time';
  }

  // The next buses at one stop after a time, soonest first. A row is [route, scheduled, left, load, seats].
  function nextBuses(rows, after, howMany) {
    return (rows || []).filter(function (r) { return r[1] >= after; })
      .sort(function (a, b) { return a[1] - b[1]; }).slice(0, howMany || 6)
      .map(function (r) { return { route: r[0], scheduled: r[1], left: r[2], load: r[3], seats: r[4], late: r[2] - r[1] }; });
  }

  // The stop asked for in the address: ?stop=<stop_id>. Only letters, digits, dash and underscore are accepted.
  function stopAsked(search) {
    var m = /[?&]stop=([^&#]*)/.exec(search || '');
    if (!m) return null;
    var id; try { id = decodeURIComponent(m[1]); } catch (e) { return ''; }
    return /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : '';
  }

  var api = { LONGEST_WALK_METRES: LONGEST_WALK_METRES, REWARDS: REWARDS, clock: clock, plural: plural, allowed: allowed,
    choicesFor: choicesFor, describe: describe, whatPointsBuy: whatPointsBuy, fullness: fullness, lateness: lateness,
    nextBuses: nextBuses, stopAsked: stopAsked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Khutwa = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
