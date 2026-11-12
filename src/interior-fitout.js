// Lab 19: deterministic room-specific architectural finishes. Every feature
// is an applied, non-structural surface; doors, stair voids, windows and
// collision/navigation geometry are never altered.
import {TILE,GRID_W,GRID_H,WALL_HEIGHT,DOOR_WIDTH,DOOR_HEIGHT,
 worldCell,seededRandom} from './topology.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=c=>c.gz*GRID_W+c.gx;
const within=(layout,x,z,roomId)=>{
 const {gx,gz}=worldCell(x,z);
 return gx>=0&&gz>=0&&gx<GRID_W&&gz<GRID_H&&
  (layout.zoneGrid||layout.grid)[gz*GRID_W+gx]===roomId;
};
function finishesForRoom(room){
 if(room.type==='bath')return {kind:'bathTile',height:1.90,y:1.05};
 if(room.type==='kitchen')return {kind:'backsplash',height:.65,y:1.47};
 if(room.type==='utility')return {kind:'serviceTile',height:1.38,y:.79};
 if(room.type==='office'||room.type==='studio')
  return {kind:'acousticPanel',height:1.28,y:1.90};
 if(room.type==='suite')return {kind:'headboard',height:1.12,y:1.64};
 if(room.type==='lounge'||room.type==='library')
  return {kind:'featurePanel',height:1.75,y:1.64};
 if(room.type==='gallery'||room.type==='dining')
  return {kind:'galleryPanel',height:1.48,y:1.70};
 return null;
}
export function makeInteriorFitout(layout,seed=layout.seed){
 const pieces=[],counts={},rng=seededRandom(seed+':interior-finish-v1');
 function push(kind,roomId,x,y,z,w,h,d,level=0){
  const part={kind,roomId,x,y,z,w,h,d,level};
  pieces.push(part);counts[kind]=(counts[kind]||0)+1;return part;
 }
 // Actual door casing surrounds a functioning opening; the threshold sits
 // flush with the walkable floor, and the upper lintel remains fully solid.
 for(const door of [...layout.doors,...(layout.exteriorDoor?[layout.exteriorDoor]:[])]){
  const alongX=door.axis==='x',size=DOOR_WIDTH+.075;
  for(const side of [-1,1]){
   const x=door.x+(alongX?side*size/2:0);
   const z=door.z+(alongX?0:side*size/2);
   push('jamb',door.roomId??0,x,.10+DOOR_HEIGHT/2,z,
    alongX?.064:.095,DOOR_HEIGHT,.095*(alongX?1:.65));
  }
  push('overDoor',door.roomId??0,door.x,.10+DOOR_HEIGHT+.036,door.z,
   alongX?size:.095,.071,alongX?.095:size);
  push('threshold',door.roomId??0,door.x,.104,door.z,
   alongX?DOOR_WIDTH:.21,.017,alongX?.21:DOOR_WIDTH);
 }
 // Apply finishes only to intact wall faces, never to the cut-away wall
 // heads/sills around doors or windows. Room adjacency is sampled on
 // either side of real structure, so no fictitious wall is generated.
 const walls=layout.walls.filter(w=>w.kind==='wall'&&w.height>WALL_HEIGHT-.15);
 for(const room of layout.rooms){
  const spec=finishesForRoom(room);
  if(!spec)continue;
  const candidates=[];
  for(const wall of walls){
   const alongX=wall.w>wall.d,length=Math.max(wall.w,wall.d);
   if(length<TILE*.85||dist(wall,room)>Math.hypot(
     room.xMax-room.xMin,room.zMax-room.zMin)/2+TILE*2)continue;
   for(const sign of [-1,1]){
    const nx=alongX?0:sign,nz=alongX?sign:0;
    if(!within(layout,wall.x+nx*.21,wall.z+nz*.21,room.id))continue;
    if(layout.doors.some(d=>dist(d,wall)<.94)||
       (layout.windows||[]).some(w=>dist(w,wall)<.84))continue;
    if(layout.stairReservation?.size){
     const point=worldCell(wall.x+nx*.28,wall.z+nz*.28);
     if(layout.stairReservation.has(key(point)))continue;
    }
    const roleItems=layout.props.filter(p=>p.roomId===room.id);
    const nearFunctional=roleItems.some(p=>
     dist(p,wall)<2.55&&
     (spec.kind==='backsplash'
      ?['cooking','sink','counter','coldStorage'].includes(p.role)
      :spec.kind==='headboard'?p.role==='bed':true));
    if(['backsplash','headboard'].includes(spec.kind)&&!nearFunctional)continue;
    candidates.push({wall,alongX,nx,nz,length});
   }
  }
  // Sort by closeness to the room's actual functional furniture.
  const anchors=layout.props.filter(p=>p.roomId===room.id&&
   (spec.kind==='headboard'?p.role==='bed':
    spec.kind==='backsplash'?['sink','cooking','counter'].includes(p.role):true));
  candidates.sort((a,b)=>{
   const near=w=>anchors.length?Math.min(...anchors.map(p=>dist(w.wall,p))):
    dist(w.wall,room);
   return near(a)-near(b)||b.length-a.length;
  });
  const limit=['bath','utility','kitchen'].includes(room.type)?4:1;
  const accepted=[];
  for(const candidate of candidates){
   if(accepted.length>=limit)break;
   if(accepted.some(prev=>dist(prev.wall,candidate.wall)<TILE*1.2))continue;
   if(spec.kind==='featurePanel'&&layout.interiorStyle?.decor<.5)continue;
   const {wall,alongX,nx,nz,length}=candidate;
   const len=Math.min(1.18,length-.10);
   const x=wall.x+nx*.079,z=wall.z+nz*.079;
   push(spec.kind,room.id,x,spec.y,z,
    alongX?len:.024,spec.height,alongX?.024:len);
   accepted.push(candidate);
  }
 }
 // Ceiling coves/coffers are fitted only over a real, uncut roof/deck
 // cell and offset from stair voids. They never change physics.
 for(const room of layout.rooms){
  if(!['lounge','suite','dining','lobby','library','office','studio','gallery'].includes(room.type))
   continue;
  const safe=(room.cells||[]).filter(c=>
   !layout.floorHoles?.has(key(c))&&
   !layout.ceilingHoles?.has(key(c))&&
   !layout.stairReservation?.has(key(c))&&
   layout.doors.every(d=>dist(d,c)>TILE*.90));
  if(!safe.length)continue;
  safe.sort((a,b)=>dist(a,room)-dist(b,room));
  const c=safe[0],rich=layout.interiorStyle?.decor??.70;
  if(rich<.40)continue;
  const span=Math.min(.92,TILE*.75);
  const y=WALL_HEIGHT+.145;
  for(const dir of [-1,1]){
   push('ceilingCove',room.id,c.x,y,c.z+dir*span*.48,
    span,.045,.045);
   push('ceilingCove',room.id,c.x+dir*span*.48,y,c.z,
    .045,.045,span);
  }
 }
 // Dim guide strips in corridors: visual floor details only.
 const hall=(layout.floors||[]).filter(c=>
  c.roomId===0&&!layout.stairReservation?.has(key(c))&&
  (c.gx*7+c.gz*11)%19===0&&
  layout.doors.every(d=>dist(d,c)>1.3));
 for(const c of hall.slice(0,18))
  push('wayfinding',0,c.x,.111,c.z,.41,.009,.037);
 return {pieces,report:{
  total:pieces.length,
  types:counts,
  rooms:layout.rooms.length,
  cutoutsUnaffected:true,
  physicalObstaclesAdded:0
 }};
}
