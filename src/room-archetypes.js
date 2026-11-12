// Deterministic room-composition grammar layered atop the classic 40D
// semantic placer. Variants influence only the FINAL legal shortlist.
import {seededRandom} from './topology.js';
import {facingScore} from './orientation.js';
const RECIPES=Object.freeze({
 lounge:['mediaWall','conversation','cornerSofa','quietSeating'],
 dining:['compactFour','longTable','banquette','galleryDining'],
 suite:['centredBed','offsetBed','hotelSuite','quietBedroom'],
 kitchen:['singleLine','galley','lShape','island'],
 office:['focusDesk','collaborative','libraryOffice'],
 studio:['workshop','artStudio','flexibleStudio'],
 library:['readingCorner','studyLibrary'],
 gallery:['openDisplay','featureGallery'],
 games:['mediaCluster','gameLounge'],
 bath:['spa','compactBath'],
 wellness:['spa','quietWellness']
});
export const ROOM_ARCHETYPES=RECIPES;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function assignRoomArchetypes(layout,seed=layout.seed){
 for(const room of layout.rooms){
  const choices=RECIPES[room.type];
  if(!choices){room.archetype='utility';continue;}
  const rng=seededRandom(String(seed)+':archetype:'+room.id+':'+layout.interiorStyle?.id);
  room.archetype=choices[Math.floor(rng()*choices.length)];
 }
 return layout;
}
function nearest(others,role,p){
 return others.filter(x=>x.role===role).sort((a,b)=>dist(a,p)-dist(b,p))[0];
}
export function archetypePlacementBonus(room,asset,p,others){
 if(!room.archetype||!asset.role)return 0;
 const w=room.xMax-room.xMin,d=room.zMax-room.zMin;
 const central=clamp(1-dist(p,room)/(Math.hypot(w,d)*.5||1),0,1);
 const edge=clamp(1-Math.min(p.x-room.xMin,room.xMax-p.x,
  p.z-room.zMin,room.zMax-p.z)/1.6,0,1);
 const longAxis=w>=d?'x':'z';
 const longOffset=Math.abs(p[longAxis]-room[longAxis])/(Math.max(w,d)||1);
 const value=room.archetype;
 let bonus=0;
 if(asset.role==='bed'){
  if(value==='centredBed'||value==='hotelSuite')bonus=.22*central+.08*edge;
  else if(value==='offsetBed')bonus=.22*longOffset;
  else if(value==='quietBedroom')bonus=.20*edge;
 }else if(asset.role==='sofa'){
  if(value==='mediaWall')bonus=.19*edge;
  if(value==='conversation')bonus=.22*central;
  if(value==='cornerSofa')bonus=.25*edge;
  if(value==='quietSeating')bonus=.14*edge;
 }else if(asset.role==='diningTable'){
  if(value==='compactFour')bonus=.24*central;
  if(value==='longTable')bonus=.20*longOffset+.10*central;
  if(value==='banquette')bonus=.28*edge;
  if(value==='galleryDining')bonus=.18*central;
 }else if(['counter','sink','cooking','coldStorage'].includes(asset.role)){
  if(value==='singleLine')bonus=.24*edge;
  if(value==='galley')bonus=.25*edge;
  if(value==='lShape')bonus=.20*edge;
  if(value==='island'&&asset.role==='counter')bonus=.23*central;
  if(value==='island'&&asset.role!=='counter')bonus=.16*edge;
 }else if(asset.role==='desk'){
  if(value==='focusDesk')bonus=.23*edge;
  if(value==='collaborative')bonus=.22*central;
  if(value==='libraryOffice')bonus=.17*edge;
 }
 // Orientation always faces existing companions where plausible. This
 // never relaxes footprint collision or navigation clearance checks.
 const match=({
  screen:'sofa',deskChair:'desk',diningChair:'diningTable',
  coffee:'sofa',sidetable:'bed'
 })[asset.role];
 const peer=match&&nearest(others,match,p);
 if(peer)bonus+=.08*facingScore(p.angle,p,peer);
 return clamp(bonus,0,.36);
}
export function roomGenerationReport(layout){
 const patterns={};
 for(const room of layout.rooms)patterns[room.archetype]=(patterns[room.archetype]||0)+1;
 const decorated=(layout.decorations||[]).length;
 const rooms=layout.rooms.length;
 return {style:layout.interiorStyle?.id||'none',
  roomArchetypes:patterns,rooms,decorations:decorated,
  decorationPerRoom:rooms?+(decorated/rooms).toFixed(2):0,
  completedEnsembles:layout.compositionReport?.complete||0,
  accessible:layout.rooms.filter(r=>r.accessibility>=.82).length};
}
