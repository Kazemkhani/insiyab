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
 const load=step.after?.load??step.before?.load,seats=step.after?.seats??step.before?.seats;
 if(!Number.isInteger(load)||!Number.isInteger(seats)||load<0||seats<1||Math.max(load,seats)>220)return '';
 const count=Math.max(load,seats),columns=20,size=12,rows=Math.ceil(count/columns);
 const cells=Array.from({length:count},(_,i)=>{const x=i%columns*size+2,y=Math.floor(i/columns)*size+2;return i>=seats?`<path data-excess d="M${x+4} ${y}l5 9h-10Z" fill="var(--over)"/>`:`<rect data-seat="${i<load?'occupied':'empty'}" x="${x}" y="${y}" width="8" height="8" fill="${i<load?'var(--ink)':'none'}" stroke="var(--ink)"/>`;}).join('');
 return `<div class="seat-diagram"><p class="eyebrow">Passengers against seats · ${step.kind}</p><svg viewBox="0 0 ${columns*size+4} ${rows*size+4}" role="img" aria-label="${load} passengers for ${seats} seats. ${Math.max(0,load-seats)} passengers above seats.">${cells}</svg><p class="small">Each square is one seat. Filled: occupied. Outline: empty. Each triangle is one passenger above seats.</p></div>`;
}
