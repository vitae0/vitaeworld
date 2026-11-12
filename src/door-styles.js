// Seed-stable door materials: wet rooms are NEVER glass, even when a
// neighboring room is public circulation. No random style changes on reload.
function hash(s){
 let v=2166136261;
 for(const c of String(s)){v=Math.imul(v^c.charCodeAt(0),16777619);}
 return (v>>>0)/4294967296;
}
const PRIVATE=new Set(['bath','utility']);
export function doorStyleFor(layout,door){
 if(door.exterior){
  // Exterior entrance is intentionally decorative and non-interactable.
  // Retail glazing is visual only; it is always locked.
  const cat=layout.buildingProgram?.category;
  return {finish:cat==='ticaret'?'glazed':'opaque',locked:true,exterior:true};
 }
 const source=layout.rooms.find(r=>r.id===door.roomId);
 const dest=layout.rooms.find(r=>r.id===door.toRoomId);
 if(PRIVATE.has(source?.type)||PRIVATE.has(dest?.type))
  return {finish:'opaque',locked:false,exterior:false};
 const n=hash(layout.seed+':'+door.roomId+':'+door.toRoomId+':door-style');
 const finish=n<.49?'opaque':n<.82?'glazed':'frosted';
 return {finish,locked:false,exterior:false};
}
export const DOOR_FINISHES=Object.freeze(['opaque','glazed','frosted']);
