// The Khutwa page. Everything shown comes from window.KHUTWA, written in at build time from the bundle.
// The room (../api/room/) is asked for with a two-second limit and the page works the same without it.
(function () {
  'use strict';
  var D = window.KHUTWA, $ = function (id) { return document.getElementById(id); };
  var FARE = 100;                                   // in this prototype, 100 points stand for one bus fare. RTA would set the real value.
  var seat = null, inRoom = false, answered = false, timer = null;
  var clock = function (t) { t = ((t % 86400) + 86400) % 86400; return String(Math.floor(t / 3600)).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0'); };
  var show = function (id) { ['s-usual', 's-offer', 's-done', 's-none'].forEach(function (s) { $(s).hidden = s !== id; }); window.scrollTo(0, 0); };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  if (D.fixture) $('band').hidden = false;
  if (!D.offer) { show('s-none'); return; }
  var U = D.offer.usual, over = Math.max(0, U.load - U.seats);

  // One square a seat, four across with an aisle; a dot for each passenger with no seat.
  function drawBus(el, load, seats) {
    var taken = Math.min(load, seats), extra = Math.max(0, load - seats), html = '<figure><div class="seats">';
    for (var i = 0; i < seats; i++) html += '<i' + (i < taken ? ' class="taken"' : '') + '></i>';
    html += '</div><figcaption>' + plural(seats, 'seat', 'seats') + ', ' + (taken === seats ? 'all taken' : taken + ' taken') + '</figcaption></figure>';
    if (extra) { html += '<figure><div class="standing">'; for (var j = 0; j < extra; j++) html += '<i></i>'; html += '</div><figcaption class="over">' + extra + ' with no seat</figcaption></figure>'; }
    el.innerHTML = html;
    el.setAttribute('aria-label', plural(load, 'passenger', 'passengers') + ' on a bus with ' + plural(seats, 'seat', 'seats'));
  }

  $('where').textContent = U.stop + ' · route ' + U.route;
  $('headline').textContent = over > 0 ? 'Your ' + clock(U.depart) + ' bus is full.' : 'Your ' + clock(U.depart) + ' bus has room.';
  drawBus($('usual-bus'), U.load, U.seats);
  // one number, large, and its words beside it: the squares above already say how many seats and how many passengers
  $('usual-load').textContent = over > 0 ? over : (U.seats - U.load);
  $('usual-words').textContent = over > 0 ? 'without a seat' : 'seats free';
  $('usual-count').className = 'count' + (over > 0 ? ' over' : '');
  $('usual-source').textContent = 'From card taps on ' + D.service_date + '. Counts seats, not standing room.';

  function describe(o) {
    if (o.kind === 'earlier') return { title: 'Leave ' + plural(o.minutes_earlier, 'minute', 'minutes') + ' earlier', detail: clock(o.depart) + ' from this stop, route ' + o.route + '. No extra walk.' };
    if (o.kind === 'later') return { title: 'Leave ' + plural(o.minutes_later, 'minute', 'minutes') + ' later', detail: clock(o.depart) + ' from this stop, route ' + o.route + '. No extra walk.' };
    // another route may call at this very stop: then there is no walk to speak of, and none is mentioned
    if (!o.walk_metres) return { title: 'Take route ' + o.route + ' from this stop', detail: clock(o.depart) + ' from this stop. No extra walk.' + (o.extra_minutes ? ' About ' + plural(o.extra_minutes, 'minute', 'minutes') + ' longer in all.' : '') };
    return { title: 'Route ' + o.route + ', a ' + o.walk_minutes + '-minute walk', detail: clock(o.depart) + ' from ' + o.stop + ', ' + o.walk_metres + ' metres away. About ' + plural(o.extra_minutes, 'minute', 'minutes') + ' longer in all.' };
  }

  function drawChoices() {
    var noWalk = $('no-walk').checked, list = $('choices'); list.innerHTML = '';
    var open = D.offer.choices.filter(function (o) { return !(noWalk && o.walk_metres > 0); });      // never offered to someone who has said they cannot walk further
    var roomiest = open.slice().sort(function (a, b) { return ((b.seats || 0) - (b.load || 0)) - ((a.seats || 0) - (a.load || 0)); })[0];
    open.forEach(function (o, i) {
      var t = describe(o), li = document.createElement('li'), free = o.seats === null ? null : Math.max(0, o.seats - o.load);
      li.innerHTML = '<div class="choice-head"><h2></h2><span class="earn"></span></div><p class="detail"></p>' +
        (free === null ? '' : '<div class="meter"><b style="width:' + Math.min(100, Math.round(100 * o.load / o.seats)) + '%"></b></div><p class="room-left"></p>') + '<button type="button">I will take it</button>';
      li.querySelector('h2').textContent = t.title; li.querySelector('.earn').textContent = '+' + o.points + ' points'; li.querySelector('.detail').textContent = t.detail;
      if (free !== null) li.querySelector('.room-left').textContent = free > 0 ? o.load + ' on board and ' + free + ' of ' + o.seats + ' seats free on the day' : 'Full when it left on the day';
      if (o === roomiest) li.querySelector('button').className = 'primary';       // one obvious next step: the bus with the most room
      li.querySelector('button').addEventListener('click', function () { finish(o); });
      list.appendChild(li);
    });
    if (!list.children.length) list.innerHTML = '<li><p class="detail">Every other choice here needs a walk, so none is offered. Your usual bus still runs.</p></li>';
  }

  function finish(o) {
    answered = true; send(!!o);
    if (o) {
      var t = describe(o), filled = Math.max(1, Math.round(10 * o.points / FARE)), bars = '';
      for (var i = 0; i < 10; i++) bars += '<i' + (i < filled ? ' class="on"' : '') + '></i>';
      var free = o.seats === null ? null : Math.max(0, o.seats - o.load);
      $('done-eyebrow').textContent = t.title; $('done-headline').textContent = o.points + ' Khutwa points.';
      // The records show room on that bus on the day. That is not a reserved seat, and the page must not say it is.
      $('done-room').textContent = free === null ? '' : (free > 0 ? 'That bus left with ' + plural(free, 'seat', 'seats') + ' free on the day. A seat is likely, not reserved.' : 'That bus was full when it left on the day.');
      $('points').innerHTML = bars; $('points').hidden = false; $('points').setAttribute('aria-label', o.points + ' of ' + FARE + ' points');
      $('done-words').textContent = 'In this prototype ' + FARE + ' points stand for one bus fare, so this is ' + o.points + ' of the ' + FARE + '. RTA would set the real value.';
    } else {
      $('done-eyebrow').textContent = 'Your usual bus'; $('done-headline').textContent = 'No change. Your ' + clock(U.depart) + ' bus still runs.';
      $('points').hidden = true; $('done-room').textContent = ''; $('done-words').textContent = 'Nothing is charged and nothing is lost. The offer was only ever a way to earn points.';
    }
    $('simulated').textContent = D.offer.take_up ? 'Simulated: ' + D.offer.take_up.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.') : '';      // the planner's sentence is not for a passenger
    show('s-done');
  }

  $('show').addEventListener('click', function () { drawChoices(); show('s-offer'); });
  $('no-walk').addEventListener('change', drawChoices);
  $('decline').addEventListener('click', function () { finish(null); });
  $('again').addEventListener('click', function () { drawChoices(); show('s-offer'); });

  // ---- the room: a seat number and nothing else. Any failure, or two seconds of silence, and the page carries on alone.
  function ask(path, method, body) {
    var stop = new AbortController(), t = setTimeout(function () { stop.abort(); }, 2000);
    return fetch('../api/room/' + path, { method: method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: stop.signal, cache: 'no-store' })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('absent'); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function send(accept) { if (inRoom && seat) ask('answer', 'POST', { seat: seat, accept: accept }).catch(function () {}); }
  function alone() { inRoom = false; if (timer) clearInterval(timer); $('waiting').hidden = true; if (!answered && !$('s-usual').hidden) $('show').hidden = false; }
  function poll() {
    ask('state', 'GET').then(function (s) {
      if (s.store !== 'shared') return alone();                     // a room kept in one copy's memory cannot hold a room of phones: do not pretend to be in it
      if (s.phase === 'offer' && !answered && $('s-offer').hidden) { drawChoices(); show('s-offer'); if (navigator.vibrate) navigator.vibrate(120); }
      if (answered && s.joined) { $('room-count').hidden = false; $('room-count').textContent = s.accepted + ' of ' + s.joined + ' in this room took the offer.'; }
    }).catch(alone);
  }
  ask('state', 'GET').then(function (s) {
    if (s.store !== 'shared') throw new Error('not shared');
    return ask('join', 'POST', {});
  }).then(function (j) {
    seat = j.seat; inRoom = true; $('waiting').hidden = false; $('show').hidden = false; $('show').textContent = 'Show me the offer now';
    timer = setInterval(poll, 1500); poll();
  }).catch(alone);
})();
