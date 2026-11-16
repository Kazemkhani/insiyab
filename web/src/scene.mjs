import layout from '../assets/scenes/layout.json';
// Scripted Blender geometry is illustrative. Only the route drawn on the
// planner's screen and the separate seat diagram carry transport information.
export function sceneSVG(person,step,model,escape){
 const setting=person.id==='planner'?'control_room':person.id==='driver'?'bus':person.id==='site_worker'?(step.scene==='bus'?'bus':'stop'):(step.scene==='phone'?'phone':'stop');
 let route='';
 if(person.id==='planner'){
  const path=model.paths.find(p=>p.route_id===person.anchor.route_id&&p.direction===0),points=path.points,xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),dx=Math.max(...xs)-minX||1,dy=Math.max(...ys)-minY||1;
  const [a,b,c]=layout.planner;
  const mapped=points.map(p=>{const u=.12+.76*(p[0]-minX)/dx,v=.12+.76*(p[1]-minY)/dy;return [a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]),a[1]+u*(b[1]-a[1])+v*(c[1]-a[1])].join(',')}).join(' ');
  route=`<polyline points="${mapped}" fill="none" stroke="var(--${step.kind==='simulated'?'simulated':'flow'})" stroke-width="3"/>`;
 }
 return `<svg viewBox="0 0 710 426" role="img" aria-labelledby="scene-title scene-description"><title id="scene-title">${escape(person.title)}, a fictional faceless figure</title><desc id="scene-description">Blender-rendered illustrative ${escape(setting.replaceAll('_',' '))}. ${escape(step.kind)} context. Furniture and vehicle geometry are not surveyed records or a reconstruction of one person.</desc><image width="710" height="426" href="scenes/${escape(person.id)}-${setting}.png"/>${route}</svg>`;
}
export function seatDiagram(step){
 // The count, drawn: one square a seat, filled when taken, and one red mark for each passenger with no seat.
 // A step that changes the bus shows both, so "see what changes" changes the picture and not only a sentence.
 const one=(v,label)=>{
  const load=v?.load,seats=v?.seats;
  if(!Number.isInteger(load)||!Number.isInteger(seats)||load<0||seats<1||Math.max(load,seats)>220)return '';
  const count=Math.max(load,seats),columns=16,size=18,rows=Math.ceil(count/columns),over=Math.max(0,load-seats),free=Math.max(0,seats-load);
  const cells=Array.from({length:count},(_,i)=>{const x=i%columns*size+1,y=Math.floor(i/columns)*size+1;return i>=seats?`<rect data-excess x="${x}" y="${y}" width="14" height="14" fill="var(--over)"/>`:`<rect data-seat="${i<load?'occupied':'empty'}" x="${x}" y="${y}" width="14" height="14" fill="${i<load?'var(--ink)':'none'}" stroke="var(--ink)" stroke-width="1.5"/>`;}).join('');
  const says=over?`${over} without a seat`:free?`${free} ${free===1?'seat':'seats'} free`:'every seat taken';
  return `<figure class="seat-figure"><figcaption><span class="eyebrow">${label}</span><strong class="${over?'over':''}">${says}</strong><span>${load} passengers, ${seats} seats</span></figcaption><svg viewBox="0 0 ${columns*size} ${rows*size}" style="max-width:${columns*size}px" role="img" aria-label="${load} passengers for ${seats} seats. ${says}.">${cells}</svg></figure>`;
 };
 const simulated=step.kind==='simulated',both=step.before&&step.after&&Number.isInteger(step.after.seats);
 const parts=both?one(step.before,'On the day · measured')+one(step.after,'With the change · simulated'):one(step.after??step.before,simulated?'With the change · simulated':'On the day · measured');
 return parts?`<div class="seat-diagram${both?' pair':''}">${parts}</div>`:'';
}
