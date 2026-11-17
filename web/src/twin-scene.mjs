import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// One local, inspectable scene. Geometry is illustrative; capacity comes only
// from the story. The animation changes presentation, never the story's data.
let active,graphics;
export function clearTwin(){active?.dispose();active=null;window.insiyabScene=null;}
export function showTwin(host,person,step,model,decision){
  active?.dispose();
  const css=getComputedStyle(document.documentElement),hex=n=>css.getPropertyValue('--'+n).trim();
  const palette=Object.fromEntries(['paper','ink','flow','over','spare','simulated','line','grey','muted'].map(n=>[n,hex(n)]));
  host.replaceChildren();host.dataset.role=person.id;host.dataset.kind=step.kind;
  const title=document.createElement('span');title.id='scene-title';title.className='scene-title';title.textContent=person.title;host.append(title);
  const canvas=graphics?.canvas??document.createElement('canvas');canvas.setAttribute('aria-label',`${person.title}. Interactive third-person illustration. Drag to look around. Seat counts come from the selected story.`);canvas.setAttribute('role','img');host.append(canvas);
  const tools=document.createElement('div');tools.className='scene-tools';tools.innerHTML='<button type="button" data-camera>See the seats</button><button type="button" data-replay>Replay arrival</button>';host.append(tools);
  let renderer=graphics?.renderer;
  try{if(!renderer){renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});graphics={canvas,renderer};}}catch{canvas.remove();tools.remove();const message=document.createElement('p');message.className='scene-failure';message.textContent='3D is unavailable on this graphics chip. The same seat counts and story are shown alongside.';host.append(message);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(palette.paper);
  renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,180),controls=new OrbitControls(camera,canvas);
  canvas.style.touchAction='pan-y pinch-zoom';controls.enablePan=false;controls.touches.ONE=null;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;controls.minDistance=9;controls.maxDistance=35;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.47;controls.enableDamping=false;
  const materials=new Map();
  function material(colour,opts={}){const key=colour+JSON.stringify(opts);if(!materials.has(key))materials.set(key,(['over','spare','simulated','flow'].includes(colour)||opts.unlit?new THREE.MeshBasicMaterial({color:palette[colour]??colour,...Object.fromEntries(Object.entries(opts).filter(([k])=>k!=='unlit'))}):new THREE.MeshStandardMaterial({color:palette[colour]??colour,roughness:.78,metalness:.04,...opts})));return materials.get(key);}
  function mesh(geometry,colour,parent=scene,position=[0,0,0],opts={}){const m=new THREE.Mesh(geometry,material(colour,opts));m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,colour,parent,position,opts){return mesh(new THREE.BoxGeometry(w,h,d),colour,parent,position,opts);}
  function cylinder(rt,rb,h,colour,parent,position){return mesh(new THREE.CylinderGeometry(rt,rb,h,24),colour,parent,position);}
  function line(points,colour,parent=scene,width=1){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:palette[colour],linewidth:width}));parent.add(l);return l;}
  function label(text,x,y,z,width=3){
    const c=document.createElement('canvas');c.width=768;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle=palette.paper;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=palette.ink;ctx.font='500 42px Plex';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,80,730);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.SpriteMaterial({map:texture,depthTest:false});const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(width,width*160/768,1);scene.add(s);return s;
  }
  function personFigure(role,parent,pos,colour='ink',seated=false,scale=1){
    const g=new THREE.Group();g.position.set(...pos);g.scale.setScalar(scale);parent.add(g);
    const torsoY=seated?.94:1.12,headY=seated?1.43:1.61;
    mesh(new RoundedBoxGeometry(.44,.60,.28,3,.07),colour,g,[0,torsoY,0]);
    cylinder(.065,.075,.13,'line',g,[0,headY-.19,0]);
    const head=mesh(new THREE.SphereGeometry(.15,20,16),'line',g,[0,headY,0]);head.scale.set(1,1.18,.88);
    function limb(radius,length,position,angle=0){const m=mesh(new THREE.CapsuleGeometry(radius,length,5,10),colour,g,position);m.rotation.x=angle;return m;}
    mesh(new RoundedBoxGeometry(.33,.17,.25,2,.04),'muted',g,[0,seated?.59:.78,0]);
    for(const side of [-1,1]){
      if(seated){limb(.07,.27,[side*.11,.53,.18],Math.PI/2);limb(.062,.30,[side*.11,.24,.38]);}
      else limb(.07,.56,[side*.11,.43,0]);
      mesh(new RoundedBoxGeometry(.16,.11,.28,2,.03),'ink',g,[side*.11,.06,seated?.44:.07]);
      limb(.058,.24,[side*.27,torsoY+.01,seated?.10:0],seated?-.55:0);
      limb(.050,.22,[side*.27,torsoY-.21,seated?.28:.04],seated?-1.0:-.25);
      mesh(new THREE.SphereGeometry(.063,12,8),'line',g,[side*.27,torsoY-.34,seated?.40:.085]);
    }
    if(role==='site_worker'){
      cylinder(.19,.19,.05,'paper',g,[0,headY+.13,0]);mesh(new THREE.SphereGeometry(.175,20,12,0,Math.PI*2,0,Math.PI/2),'paper',g,[0,headY+.13,0]);
      box(.45,.045,.29,'paper',g,[0,torsoY,0]);for(const x of [-.13,.13])box(.035,.47,.29,'paper',g,[x,torsoY,0]);
    }
    if(role==='office_worker'){mesh(new RoundedBoxGeometry(.26,.34,.13,2,.025),'muted',g,[.33,torsoY-.34,-.08]);line([[.25,torsoY+.18,-.1],[.38,torsoY-.14,-.1]],'muted',g);}
    if(role==='driver'){cylinder(.15,.17,.07,'ink',g,[0,headY+.16,0]);box(.28,.035,.15,'ink',g,[0,headY+.15,.12]);}
    return g;
  }
  const light=new THREE.DirectionalLight(palette.paper,3.3);light.position.set(-7,15,9);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-18;light.shadow.camera.right=18;light.shadow.camera.top=16;light.shadow.camera.bottom=-16;light.shadow.normalBias=.035;scene.add(light,new THREE.HemisphereLight(palette.paper,palette.grey,2.4));
  box(160,.12,140,'paper',scene,[0,-.15,0],{unlit:true});
  if(step.kind==='simulated'){const badge=document.createElement('span');badge.className='scene-simulation';badge.textContent='SIMULATED';host.append(badge);}
  const value=step.after??step.before??{},seatCount=Number.isInteger(value.seats)?value.seats:null,load=Number.isInteger(value.load)?value.load:null;
  if(seatCount!==null&&load!==null){const reading=document.createElement('div');reading.className='scene-reading';reading.innerHTML=`<strong>${load} passengers</strong><span>${seatCount} seats · cutaway view</span>`;host.append(reading);}
  const actors=[],moving=[],addedSeats=[];let requestDemo=null;
  function bus(parent,seats,passengers,position,scale=1){
    const g=new THREE.Group();g.name='bus';g.position.set(...position);g.scale.setScalar(scale);parent.add(g);
    const rows=Math.ceil((seats??32)/4),length=Math.max(8,rows*.58+2.2),state=passengers>seats?'over':step.kind==='simulated'?'simulated':'flow';
    box(length,.26,2.5,'ink',g,[0,.67,0]);box(length,.68,.12,'paper',g,[0,1.07,-1.2]);box(length,.68,.12,'paper',g,[0,1.07,1.2]);
    box(length,.10,.14,state,g,[0,1.38,-1.2]);box(length,.10,.14,state,g,[0,1.38,1.2]);
    mesh(new RoundedBoxGeometry(.24,2.05,2.5,3,.10),'paper',g,[length/2,.67+1.04,0]);
    box(.18,1.0,2.17,'ink',g,[length/2+.17,2.0,0],{transparent:true,opacity:.8});
    box(.14,.65,2.5,'paper',g,[-length/2,1.02,0]);
    box(.27,.12,2.38,'ink',g,[length/2,.67,0]);
    for(const z of [-.9,.9])box(.28,.12,.35,'paper',g,[length/2+.03,.9,z]);
    for(const x of [-length*.31,length*.31])for(const z of [-1.22,1.22]){const w=cylinder(.45,.45,.22,'ink',g,[x,.47,z]);w.rotation.x=Math.PI/2;const hub=cylinder(.22,.22,.23,'grey',g,[x,.47,z]);hub.rotation.x=Math.PI/2;}
    for(let i=0;i<(seats??0);i++){
      const row=Math.floor(i/4),col=i%4,x=-length/2+.78+row*.58,z=[-.88,-.42,.42,.88][col];
      const chair=new THREE.Group();chair.position.set(x,.82,z);chair.name='seat';chair.userData.occupied=i<(passengers??0);g.add(chair);if(step.motion==='capacity-change'&&i>=step.previousSeats)addedSeats.push(chair);
      box(.43,.10,.36,i<(passengers??0)?'ink':'spare',chair,[0,.30,0]);box(.10,.47,.36,i<(passengers??0)?'ink':'spare',chair,[-.20,.53,0]);
      if(i<(passengers??0)){const occupant=personFigure('passenger',chair,[0,-.02,0],'ink',true,.65);occupant.name='seated-passenger';occupant.rotation.y=Math.PI/2;}
    }
    const above=Math.max(0,(passengers??0)-(seats??0)),spacing=(length-1.6)/Math.max(1,above);
    for(let i=0;i<above;i++){const p=personFigure('passenger',g,[-length/2+.8+(i+.5)*spacing,.84,0],'over',false,.70);p.name='passenger-above-seats';p.rotation.y=Math.PI/2;}
    return g;
  }
  const planner=person.id==='planner',driver=person.id==='driver',phone=step.scene==='phone';
  let target=new THREE.Vector3(0,.5,0),streetCamera=new THREE.Vector3(12,10,15),seatCamera=new THREE.Vector3(1,18,8);
  if(planner){
    box(12,.18,8,'line',scene,[0,0,0]);box(5.2,.15,2.4,'paper',scene,[0,1.25,0]);
    for(const x of [-2.1,2.1])for(const z of [-.9,.9])box(.12,1.25,.12,'ink',scene,[x,.6,z]);
    const figure=personFigure('planner',scene,[.7,.18,2.1],'ink',true,1.25);figure.rotation.y=Math.PI;actors.push(figure);
    box(.9,.12,.85,'muted',scene,[.7,.63,2.1]);box(.85,.9,.12,'muted',scene,[.7,1.14,2.54]);
    box(4.6,2.4,.12,'ink',scene,[0,3,-1]);box(4.35,2.14,.13,'paper',scene,[0,3,-.98]);
    const pts=model.paths.find(p=>p.route_id===person.anchor.route_id)?.points??model.paths[0].points;
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),xmin=Math.min(...xs),ymin=Math.min(...ys),dx=Math.max(...xs)-xmin||1,dy=Math.max(...ys)-ymin||1;
    line(pts.map(p=>[-1.7+3.4*(p[0]-xmin)/dx,2.35+1.3*(p[1]-ymin)/dy,-.89]),'flow');
    const swap=decision?.swaps?.[0];
    if(swap){
      const after=step.kind==='simulated';bus(scene,after?swap.to.seats:swap.from.seats,swap.from.largest_load,[-1.5,1.35,.25],.22);bus(scene,after?swap.from.seats:swap.to.seats,swap.to.largest_load,[1.4,1.35,.25],.22);
      label(`${swap.from.largest_load} at trip peak`, -1.5,2.05,.25,2.1);label(`${swap.to.largest_load} at trip peak`,1.4,2.05,.25,2.1);
    }
    label(step.kind==='simulated'?'PROPOSED EXCHANGE':'FIND THE SEAT SHORTAGE',0,4.5,-1,5);
    streetCamera.set(8,7,11);seatCamera.set(0,9,9);target.set(0,1.5,0);
    tools.querySelector('[data-camera]').textContent='Look at the plan';tools.querySelector('[data-replay]').textContent='Replay change';
  }else if(driver){
    box(6,.16,28,'muted',scene,[0,0,-10]);for(let i=-1;i>-24;i-=3)box(.10,.02,1.5,'paper',scene,[.8,.1,i]);
    box(2,.25,27,'line',scene,[4,.04,-10]);
    box(4,.22,4.2,'line',scene,[0,.23,1]);box(4,.5,.45,'ink',scene,[0,1.1,-.8]);
    box(.15,1.25,4.2,'paper',scene,[-2,.92,1]);box(.15,1.25,4.2,'paper',scene,[2,.92,1]);
    box(4,.18,1.6,'paper',scene,[0,3.4,-.2]);
    box(.12,3.3,.12,'ink',scene,[-1.95,1.8,-1]);box(.12,3.3,.12,'ink',scene,[1.95,1.8,-1]);box(4,.12,.12,'ink',scene,[0,3.4,-1]);
    const p=personFigure('driver',scene,[-.8,.5,1],'ink',true,1.35);p.rotation.y=Math.PI;actors.push(p);
    box(.8,.15,.8,'muted',scene,[-.8,1.0,1]);box(.8,1.0,.12,'muted',scene,[-.8,1.55,1.42]);
    const wheel=mesh(new THREE.TorusGeometry(.34,.045,12,40),'ink',scene,[-.8,1.7,.08]);wheel.rotation.x=-.45;
    for(let i=0;i<4;i++)box(.16,.045,.12,'line',scene,[.3+i*.3,1.38,-.72]);
    const stop=new THREE.Group();scene.add(stop);stop.position.set(3.8,0,-9);
    cylinder(.045,.045,2.8,'ink',stop,[0,1.4,0]);box(.9,.5,.12,'paper',stop,[0,2.75,0]);
    const reading=document.createElement('div');reading.className='scene-reading';reading.innerHTML=`<strong>${step.kind==='simulated'?'Request-stop concept':'Illustrative cab'}</strong><span>${step.kind==='simulated'?'No request illustrated':'Whole-day records shown alongside'}</span>`;host.append(reading);
    if(step.kind==='simulated')requestDemo={stop,reading,requested:false};
    streetCamera.set(4.8,3.8,7.5);seatCamera.set(7,7,9);target.set(.3,1,-1.4);
    tools.querySelector('[data-camera]').textContent='View the stop';tools.querySelector('[data-replay]').textContent=requestDemo?'Illustrate a request':'Replay view';
  }else{
    box(32,.15,5,'muted',scene,[0,0,-.7]);box(32,.26,4.2,'line',scene,[0,.05,3.9]);
    for(let x=-14;x<16;x+=3)box(1.4,.015,.10,'paper',scene,[x,.09,-2.0]);
    for(const x of [-4.8,-.2])box(.10,2.9,.10,'ink',scene,[x,1.55,5]);
    box(5.3,.12,2.1,'paper',scene,[-2.5,3.05,4.7]);box(4.5,.7,.08,'grey',scene,[-2.5,1.8,5.1],{transparent:true,opacity:.25});
    box(3.0,.12,.48,'paper',scene,[-2.5,.7,4.7]);for(const x of [-3.7,-1.3])box(.08,.7,.40,'ink',scene,[x,.36,4.7]);
    cylinder(.045,.045,2.9,'ink',scene,[3.6,1.5,3]);box(.58,.65,.10,'paper',scene,[3.6,2.85,3]);
    const p=personFigure(person.id,scene,[1.8,.2,3.7],'ink',false,1.1);p.rotation.y=Math.PI;actors.push(p);
    const vehicle=bus(scene,seatCount,load,[-1,0,-.3]);if(step.motion!=='capacity-change')moving.push({object:vehicle,from:-17,to:-1});
    if(phone){
      const device=box(.28,.46,.05,'ink',p,[-.34,1.20,-.25]);device.rotation.x=-.25;box(.23,.36,.06,'paper',p,[-.34,1.20,-.25]);
      label('Voluntary choice · Khutwa',1.8,3.3,3.7,4.1);
    }
    target.set(-.7,.8,1.0);streetCamera.set(11,7.5,12.5);seatCamera.set(0,18,7);
  }
  camera.position.copy(streetCamera);controls.target.copy(target);controls.update();
  let raf=0,start=0,frames=0,isSeats=false,disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){if(disposed)return;renderer.render(scene,camera);frames++;}
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);
  function animate(now){
    const p=reduced?1:Math.min(1,(now-start)/1500),ease=1-Math.pow(1-p,3);
    for(const m of moving)m.object.position[m.axis??'x']=m.from+(m.to-m.from)*ease;
    for(const chair of addedSeats)chair.scale.setScalar(Math.max(.001,ease));
    for(const a of actors)a.rotation.y=(planner?Math.PI:driver?Math.PI:Math.PI)+(1-ease)*.18;
    draw();if(p<1)raf=requestAnimationFrame(animate);
  }
  function replay(){cancelAnimationFrame(raf);start=performance.now();raf=requestAnimationFrame(animate);}
  tools.querySelector('[data-replay]').onclick=e=>{if(requestDemo){requestDemo.requested=!requestDemo.requested;moving.length=0;moving.push({object:requestDemo.stop,axis:'z',from:requestDemo.stop.position.z,to:requestDemo.requested?-4.5:-9});requestDemo.reading.querySelector('span').textContent=requestDemo.requested?'Stop requested · illustration only':'No request illustrated';e.currentTarget.textContent=requestDemo.requested?'Clear illustrated request':'Illustrate a request';}replay();};
  tools.querySelector('[data-camera]').onclick=e=>{isSeats=!isSeats;camera.position.copy(isSeats?seatCamera:streetCamera);controls.target.copy(target);controls.update();e.currentTarget.textContent=isSeats?'Third-person view':planner?'Look at the plan':driver?'View the stop':'See the seats';draw();};
  canvas.onwebglcontextlost=event=>{event.preventDefault();title.textContent='3D paused · graphics context lost. Counts remain alongside.';};
  resize();replay();
  const api={scene,camera,renderer,role:person.id,kind:step.kind,get standingBounds(){scene.updateMatrixWorld(true);return scene.getObjectsByProperty('name','passenger-above-seats').map(p=>{const box=new THREE.Box3().setFromObject(p);return {min:box.min.toArray(),max:box.max.toArray()};});},get frames(){return frames;},get moving(){return moving.map(m=>m.object.position.x);},reduced};window.insiyabScene=api;
  active={dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();host.replaceChildren();scene.traverse(o=>{o.geometry?.dispose();o.shadow?.map?.dispose();if(o.material?.map)o.material.map.dispose();if(o.material)o.material.dispose?.();});for(const m of materials.values())m.dispose();renderer.renderLists.dispose();}};
}
