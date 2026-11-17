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
