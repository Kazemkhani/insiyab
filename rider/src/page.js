// The Khutwa page's screen. The rules are in logic.js (window.Khutwa); everything shown comes from KHUTWA_DATA,
// written into the page by rider/build.mjs. The only thing asked for at run time is the room, and the page works without it.
(function () {
  'use strict';
  var D = window.KHUTWA_DATA, K = window.Khutwa;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var show = function (id) { ['s-usual', 's-offer', 's-done', 's-none', 's-stop'].forEach(function (s) { $(s).hidden = s !== id; }); window.scrollTo(0, 0); };
  var whole = function (x) { return Math.max(0, Math.round(x)); };

  $('band').hidden = !D.fixture;
  var day = (function () {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(D.service_date || '');
    if (!m) return D.service_date || 'the day';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()] + ' ' + (+m[3]) + ' ' +
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1] + ' ' + m[1];
  })();
  var credit = [D.credit, D.fixture ? D.invented : null].filter(Boolean).join('. ');
  $('credit').textContent = credit; $('credit').hidden = !credit;
  var onTheDay = D.fixture ? 'On the stand-in day' : 'On the day';

  // "I cannot walk further" is remembered on this phone, so no later choice involves a walk either.
  var cannotWalk = false;
  try { cannotWalk = window.localStorage.getItem('khutwa-cannot-walk') === '1'; } catch (e) { /* private mode: remembered for this visit only */ }
  var remember = function () { try { window.localStorage.setItem('khutwa-cannot-walk', cannotWalk ? '1' : '0'); } catch (e) { /* as above */ } };

  // ---------- one stop's next buses: ?stop=<stop_id>
  var asked = K.stopAsked(window.location.search);
  function stopPage(id) {
    var name = D.stops[id];
    $('morning-link').setAttribute('href', window.location.pathname);
    $('stop-eyebrow').textContent = 'Stop ' + (name ? id : 'not found');
    if (!name) {
      $('stop-name').textContent = 'This stop is not in the day the page holds.';
      $('stop-when').textContent = 'The address asked for a stop the bundle does not have.';
      $('board').hidden = true; $('stop-note').hidden = true; show('s-stop'); return;
    }
    $('stop-name').textContent = name;
    $('stop-when').textContent = 'The next buses from ' + K.clock(D.now) + ' on ' + day + ', the day this prototype replays.';
    var buses = K.nextBuses(D.boards[id], D.now, 6), list = $('board'); list.textContent = '';
    buses.forEach(function (b) {
      var li = el('li'), top = el('div', 'top');
      top.appendChild(el('span', 'time', K.clock(b.scheduled)));
      top.appendChild(el('span', 'route', 'Route ' + D.routes[b.route]));
      var late = K.lateness(b.late); top.appendChild(el('span', 'late' + (b.late >= 60 ? ' is' : ''), late === 'on time' ? 'left on time' : 'left ' + late));
      li.appendChild(top);
      var bar = el('div', 'bar' + (b.load > b.seats ? ' over' : '')), fill = el('b'); fill.style.width = Math.min(100, b.seats ? 100 * b.load / b.seats : 0) + '%'; bar.appendChild(fill); li.appendChild(bar);
      li.appendChild(el('div', 'words', b.load > b.seats
        ? b.load + ' on board, ' + b.seats + ' seats: ' + K.plural(b.load - b.seats, 'passenger', 'passengers') + ' without a seat'
        : b.load + ' on board, ' + b.seats + ' seats: ' + K.plural(b.seats - b.load, 'seat', 'seats') + ' free'));
      list.appendChild(li);
    });
    $('board-none').hidden = buses.length > 0;
    var f = D.forecasts[id] || [], fl = $('stop-forecast-list'); fl.textContent = '';
    f.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }).forEach(function (r) {
      var li = el('li'); li.appendChild(el('span', 'tag forecast', 'Forecast'));
      li.appendChild(document.createTextNode('Route ' + D.routes[r[0]] + ', ' + K.clock(r[1]) + ' to ' + K.clock(r[2]) + ': about ' + K.plural(whole(r[3]), 'boarding', 'boardings') +
        ' (between ' + whole(r[4]) + ' and ' + whole(r[5]) + '), forecast at ' + K.clock(r[6]) + '.'));
      fl.appendChild(li);
    });
    $('stop-forecast').hidden = f.length === 0;
    $('stop-note').textContent = onTheDay + ', each bus left this stop with the load shown: the passengers on board, against its seats. ' +
      'The forecast is of boardings at the stop, an hour ahead; the bundle holds no forecast of each bus\u2019s load.';
    show('s-stop');
  }

  // ---------- one passenger's morning
  var offer = D.offers[0] || null, viaRoom = false, taken = null;
  function usualPage() {
    if (!offer) { show('s-none'); return; }
    var u = offer.usual, f = K.fullness(u);
    $('where').textContent = 'A fictional passenger \u00b7 ' + u.stop + ' \u00b7 ' + K.clock(D.now);
    $('headline').textContent = f.full ? 'Your usual ' + K.clock(u.depart) + ' bus on route ' + u.route + ' is full.' : 'Your usual ' + K.clock(u.depart) + ' bus on route ' + u.route + '.';
    var bus = $('usual-bus'); bus.textContent = '';
    bus.setAttribute('aria-label', u.load + ' passengers on board, ' + u.seats + ' seats');
    var seats = el('div', 'seats'); for (var i = 0; i < u.seats; i++) seats.appendChild(el('i', i < u.load ? 'taken' : '')); bus.appendChild(seats);
    if (f.over > 0) { var st = el('div', 'standing'); for (var j = 0; j < f.over; j++) st.appendChild(el('i')); bus.appendChild(st); }
    bus.appendChild(el('p', 'legend', u.load + ' on board \u00b7 ' + u.seats + ' seats'));
    $('usual-load').textContent = Math.abs(f.over); $('usual-words').textContent = f.words;
    $('usual-load').parentNode.className = 'count ' + (f.full ? 'full' : 'room');
    var facts = $('usual-facts'); facts.textContent = '';
    var fact = function (tag, cls, text) { var li = el('li'); li.appendChild(el('span', 'tag ' + cls, tag)); li.appendChild(document.createTextNode(text)); facts.appendChild(li); };
    fact('How full', '', onTheDay + ' it left this stop with ' + u.load + ' passengers on board and ' + u.seats + ' seats.');
    if (u.left != null) fact('How late', '', onTheDay + ' it left ' + K.lateness(u.left - u.depart) + (Math.abs(u.left - u.depart) >= 60 ? ', at ' + K.clock(u.left) : '') + '.');
    if (u.forecast_late) fact('Forecast', 'forecast', 'Lateness, forecast ' + K.plural(u.forecast_late.stops_ahead, 'stop', 'stops') + ' before it arrived: ' + K.lateness(u.forecast_late.seconds) + '.');
    if (u.forecast_boardings) fact('Forecast', 'forecast', 'Boardings here on this route, ' + K.clock(u.forecast_boardings.from) + ' to ' + K.clock(u.forecast_boardings.to) + ', forecast at ' + K.clock(u.forecast_boardings.made) + ': about ' +
      whole(u.forecast_boardings.forecast) + ' (between ' + whole(u.forecast_boardings.lo) + ' and ' + whole(u.forecast_boardings.hi) + ').');
    $('stop-link').setAttribute('href', '?stop=' + encodeURIComponent(u.stop_id));
    show('s-usual');
  }

  function offerPage() {
    var list = $('choices'), choices = K.choicesFor(offer, cannotWalk); list.textContent = '';
    $('no-walk').checked = cannotWalk; $('walk-note').hidden = !cannotWalk;
    choices.forEach(function (c) {
      var d = K.describe(c, offer.usual), li = el('li', 'choice');
      li.appendChild(el('h2', '', d.what)); li.appendChild(el('p', 'earn', 'Earn ' + d.earns));
      var ul = el('ul'); d.costs.forEach(function (t) { ul.appendChild(el('li', '', t.charAt(0).toUpperCase() + t.slice(1))); }); li.appendChild(ul);
      if (d.room) li.appendChild(el('p', 'roomline', D.fixture ? d.room.replace('On the day', 'On the stand-in day') : d.room));
      var b = el('button', '', 'I\u2019ll take it'); b.setAttribute('aria-label', 'I\u2019ll take it: ' + d.what);
      b.addEventListener('click', function () { answer(c); }); li.appendChild(b); list.appendChild(li);
    });
    $('no-choices').hidden = choices.length > 0;
    $('decline').textContent = choices.length ? 'No thanks, I will take my usual bus' : 'I will take my usual bus';
    show('s-offer');
  }

  function donePage() {
    var u = offer.usual;
    if (taken) {
      var d = K.describe(taken, u);
      $('done-eyebrow').textContent = 'You took the offer';
      $('done-headline').textContent = 'You earn ' + d.earns + '.';
      $('done-words').textContent = d.what + (taken.walk_metres > 0 ? ', from ' + taken.stop + '.' : ', from this stop.') + ' The fare is the same, and a seat is not reserved.';
      var list = $('buys-list'); list.textContent = '';
      K.whatPointsBuy(taken.points).forEach(function (r) {
        var li = el('li'); li.appendChild(el('span', '', r.name));
        li.appendChild(el('span', '', r.points + ' points \u00b7 ' + (r.mornings === 1 ? 'this morning' : r.mornings + ' mornings')));
        list.appendChild(li);
      });
      $('buys').hidden = false;
      $('simulated').textContent = 'Simulated. Nothing was booked and no points were paid: this page shows what an offer could look like. ' +
        (offer.assumption ? 'The expected effect is an assumption: ' + offer.assumption : '');
      $('simulated').hidden = false;
    } else {
      $('done-eyebrow').textContent = 'You kept your usual bus';
      $('done-headline').textContent = 'Your ' + K.clock(u.depart) + ' bus on route ' + u.route + ', as always.';
      $('done-words').textContent = 'Nothing changes: the same bus, the same fare. Saying no costs nothing.';
      $('buys').hidden = true; $('simulated').hidden = true;
    }
    roomCount(); show('s-done');
  }

  function answer(choice) {
    taken = choice || null;
    if (seat != null) call('answer', { seat: seat, accept: !!choice }).then(poll, function () { /* the room is gone: the page carries on alone */ });
    donePage();
  }

  // ---------- the room (docs/CONTRACT.md, "The live room"). A phone is a seat number and nothing else.
  var seat = null, state = null, misses = 0, timer = null, wasOffer = false;
  function call(pathName, body) {
    var c = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (c) c.abort(); }, 2000);     // no answer within two seconds: the room is absent
    return fetch('../api/room/' + pathName, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: c ? c.signal : undefined,
      headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('room ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function roomAbsent() {
    seat = null; state = null; if (timer) { clearTimeout(timer); timer = null; }
    $('waiting').hidden = true; $('show').hidden = false; $('room-count').hidden = true;
  }
  function roomCount() {
    var ok = seat != null && state && typeof state.joined === 'number' && typeof state.accepted === 'number';
    $('room-count').hidden = !ok;
    if (ok) $('room-count').textContent = 'In this room: ' + state.accepted + ' of ' + state.joined + ' took the offer. A room of visitors is not a morning commute, and this count is not a result.';
  }
  function poll() {
    if (seat == null) return;
    if (timer) { clearTimeout(timer); timer = null; }
    call('state').then(function (s) {
      misses = 0; state = s;
      if (s.phase === 'offer' && !wasOffer) {
        wasOffer = true; viaRoom = true;
        var named = D.offers.filter(function (o) { return o.decision_id === s.decision_id; })[0]; if (named) offer = named;
        if (!$('s-usual').hidden) { buzz(); offerPage(); }
      } else if (s.phase === 'waiting' && wasOffer) {         // the presenter started again
        wasOffer = false; taken = null; usualPage(); $('waiting').hidden = false; $('show').hidden = true;
      }
      if (s.phase === 'closed' && !wasOffer) { $('waiting').hidden = true; $('show').hidden = false; }   // the room has finished: the page carries on alone
      roomCount(); timer = setTimeout(poll, 1000);
    }, function () {
      misses += 1; if (misses >= 2) roomAbsent(); else timer = setTimeout(poll, 1000);
    });
  }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* not allowed here: the offer is on screen anyway */ } }
  function joinRoom() {
    if (typeof fetch !== 'function') { roomAbsent(); return; }
    call('join', {}).then(function (j) {
      if (!j || typeof j.seat !== 'number') { roomAbsent(); return; }
      seat = j.seat; $('show').hidden = true;
      $('waiting').textContent = 'You are in the room, in seat ' + seat + '. The offer will appear here.'; $('waiting').hidden = false;
      poll();
    }, roomAbsent);
  }

  // ---------- controls
  $('show').addEventListener('click', offerPage);
  $('decline').addEventListener('click', function () { answer(null); });
  $('again').addEventListener('click', offerPage);
  $('no-walk').addEventListener('change', function () { cannotWalk = $('no-walk').checked; remember(); offerPage(); });

  if (asked !== null) stopPage(asked);
  else { usualPage(); if (offer) joinRoom(); }
})();
