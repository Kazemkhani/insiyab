import {showTwin} from '../src/twin-scene.mjs';
import {createModel} from '../src/model.mjs';

const bundle=window.INSIYAB_BUNDLE,model=createModel(bundle);
const people=bundle['personas.json'].personas;
const decision=bundle['decisions.json'].decisions.find(d=>d.lever==='right_bus');
window.showFilmStage=name=>{
  const role=name==='office'?'office_worker':'site_worker';
  let person=people.find(p=>p.id===role),step=person.steps[name==='changed'||name==='office'?1:0];
  if(name==='spare'){
    const trip=decision.swaps[0].to;
    person={...person,id:'passenger',title:'Another trip',anchor:{route_id:trip.route_id}};
    step={kind:'measured',scene:'stop',before:{seats:trip.seats,load:trip.largest_load}};
  }
  if(name==='changed')step={...step,motion:'capacity-change',previousSeats:decision.swaps[0].from.seats};
  showTwin(document.getElementById('scene'),person,step,model,decision);
  if(name==='waiting'){
    for(const bus of window.insiyabScene.scene.getObjectsByProperty('name','bus'))bus.visible=false;
    window.insiyabScene.renderer.render(window.insiyabScene.scene,window.insiyabScene.camera);
  }
};
