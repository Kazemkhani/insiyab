import {mountHeat} from './heat.mjs';
import {mountJudge} from './judge.mjs';
import {mountBuses} from './buses.mjs';
import {mountControl} from './control.mjs';
import {renderAlerts} from './alerts.mjs';
import {mountReplay} from './replay.mjs';
import {mountTheatre} from './theatre.mjs';
import {mountBriefing} from './briefing.mjs';
async function start() {
  document.documentElement.dataset.mode = 'demo';
  const replay = await mountReplay(window.INSIYAB_OPS_DATA.bundle);
  replay.setBusRenderer(mountBuses(replay.map, document.querySelector('#map')));
  const alert = renderAlerts(window.INSIYAB_OPS_DATA.alerts, window.INSIYAB_OPS_DATA.bundle);
  replay.setAlerts(window.INSIYAB_OPS_DATA.alerts.alerts);
  if (alert) {
    const theatre = mountTheatre(replay.map, alert);
    const briefing = mountBriefing(alert);
    mountControl(alert, replay, theatre, briefing);
  }
  mountJudge(window.INSIYAB_OPS_DATA.judge);
  mountHeat(window.INSIYAB_OPS_DATA.heat, replay);
}
start().catch(error => {document.querySelector('#map-note').textContent = 'Replay unavailable: ' + error.message;});
