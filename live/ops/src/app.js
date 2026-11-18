import {renderAlerts} from './alerts.mjs';
import {mountReplay} from './replay.mjs';
async function start() {
document.documentElement.dataset.mode = 'demo';
const replay = await mountReplay(window.INSIYAB_OPS_DATA.bundle);
renderAlerts(window.INSIYAB_OPS_DATA.alerts, window.INSIYAB_OPS_DATA.bundle);
replay.setAlerts(window.INSIYAB_OPS_DATA.alerts.alerts);
const demo = document.querySelector('#demo');
demo.disabled = false;
demo.addEventListener('click', () => {replay.stop();replay.setTime(67980);});

}
start().catch(error => {document.querySelector('#map-note').textContent = 'Replay unavailable: ' + error.message;});
