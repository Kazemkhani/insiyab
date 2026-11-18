import {mountControl} from './control.mjs';
import {renderAlerts} from './alerts.mjs';
import {mountReplay} from './replay.mjs';
async function start() {
document.documentElement.dataset.mode = 'demo';
const replay = await mountReplay(window.INSIYAB_OPS_DATA.bundle);
const alert = renderAlerts(window.INSIYAB_OPS_DATA.alerts, window.INSIYAB_OPS_DATA.bundle);
replay.setAlerts(window.INSIYAB_OPS_DATA.alerts.alerts);
if (alert) mountControl(alert, replay);
}
start().catch(error => {document.querySelector('#map-note').textContent = 'Replay unavailable: ' + error.message;});
