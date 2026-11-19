/* voice-options.test.js: each option in a drill incident is priced against doing nothing, names who approves it,
   and says how the figure is worked out. Pure functions, no network. Run: node live/voice/tests/voice-options.test.js */
'use strict';
const path = require('path');
const fs = require('fs');
let fails = 0;
const ok = (name, cond, info) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  [' + info + ']' : ''));
  if (!cond) fails++;
};

const { priceOptions, optionsText, approverRole } = require('../options');
const incident = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'incident-example.json'), 'utf8'));
const priced = priceOptions(incident);
const by = k => priced.options.find(o => o.key === k);

ok('three options kept, same keys and order', priced.options.map(o => o.key).join() === 'send_spare,hold,none');
ok('doing nothing is the baseline: 0 per cent', by('none').impact.change_pct === 0);
ok('baseline: 213 passengers wait 22 minutes = 4,686 passenger-minutes', by('none').impact.passengers === 213 && by('none').impact.passenger_minutes === 4686, JSON.stringify(by('none').impact));
ok('standby bus: waiting falls 63.6 per cent', by('send_spare').impact.change_pct === -63.6, by('send_spare').impact.change_pct);
ok('holding the next bus makes waiting go UP this hour (+9.1), and says so', by('hold').impact.change_pct === 9.1 && /more waiting/.test(by('hold').impact.headline), by('hold').impact.headline);
ok('standby is approved by the depot controller', by('send_spare').approver_role === 'depot' && approverRole(priced, 'send_spare') === 'depot');
ok('hold is approved by the station supervisor', by('hold').approver_role === 'station');
ok('no action stays with the duty manager', by('none').approver_role === 'manager');
ok('every priced option says how the figure is worked out and that it is simulated', priced.options.every(o => o.how_worked_out && /simulat/i.test(o.how_worked_out) && o.simulated === true));
ok('the standby assumption is stated as unconfirmed', /not confirmed|unconfirmed|assum/i.test(by('send_spare').how_worked_out), by('send_spare').how_worked_out);
ok('input incident is not changed', incident.options[0].impact === undefined);
ok('priced twice gives the same answer', JSON.stringify(priceOptions(priced)) === JSON.stringify(priced));

// fail closed: with a number missing, no figure is invented
const bare = priceOptions({ route: '310', drill: true, options: [{ key: 'send_spare', say: 'x' }] });
ok('missing inputs: no impact is invented', bare.options[0].impact === undefined);

const text = optionsText(priced.options);
ok('spoken text keeps each key (the manager tool needs it)', /key: send_spare/.test(text) && /key: hold/.test(text) && /key: none/.test(text));
ok('spoken text carries the headline figure and the approver for option 1', /63\.6% less waiting/.test(text) && /Depot controller/.test(text), text.slice(0, 260));
ok('spoken text contains no phone number', !/\+\d{8,15}/.test(text));

// The pitch page repeats these figures by hand; this stops it drifting from the module.
const page = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'story', 'index.html'), 'utf8');
ok('pitch page shows the standby figure', page.includes(by('send_spare').impact.headline), by('send_spare').impact.headline);
ok('pitch page shows the hold figure', page.includes(by('hold').impact.headline), by('hold').impact.headline);
ok('pitch page shows the baseline passenger-minutes', page.includes('4,686') && page.includes('213 passengers'));
ok('pitch page labels the options SIMULATED', /id="options"[\s\S]*SIMULATED DRILL/.test(page));

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
process.exit(fails ? 1 : 0);
