// Small-room floorplan grammar: two longitudinal and two transverse circulation
// spines, additional cross-links, central courtyard ring, 16 compact room parcels.
// All world/physics data is independent from Three.js.
import {ROOM_TYPES} from './semantics.js';
import {selectProgramRoomTypes} from './building-programs.js';

export const TILE=1.26, GRID_W=25, GRID_H=19, WALL_HEIGHT=3.25;
export const HALL=0, OUTSIDE=-1;
export const DOOR_WIDTH=1.10, DOOR_HEIGHT=2.38;
const WALL_THICKNESS=.13;
const DIRS=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const idx=(x,z)=>z*GRID_W+x;
const inside=(x,z)=>x>=0&&x<GRID_W&&z>=0&&z<GRID_H;
export const cellWorld=(gx,gz)=>({x:(gx-(GRID_W-1)/2)*TILE,z:(gz-(GRID_H-1)/2)*TILE});
export const worldCell=(x,z)=>({gx:Math.floor(x/TILE+GRID_W/2),gz:Math.floor(z/TILE+GRID_H/2)});
export function seededRandom(seed){
 let state=2166136261;
 for(const c of String(seed)){state^=c.charCodeAt(0);state=Math.imul(state,16777619);}
 return ()=>{state+=0x6d2b79f5;let t=state;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
const shuffle=(input,rng)=>{
 const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
};
const edgeKey=(x,z,dx,dz)=>{
 const a=idx(x,z),b=idx(x+dx,z+dz);
 return a<b?a+':'+b:b+':'+a;
};
function reachableCells(grid,id){
 const cells=[];
 for(let i=0;i<grid.length;i++)if(grid[i]===id)cells.push(i);
 if(!cells.length)return 0;
 const seen=new Set([cells[0]]),q=[cells[0]];
 for(let p=0;p<q.length;p++){
  const i=q[p],x=i%GRID_W,z=Math.floor(i/GRID_W);
  for(const {dx,dz} of DIRS){
   const nx=x+dx,nz=z+dz;if(!inside(nx,nz))continue;
   const n=idx(nx,nz);
   if(grid[n]===id&&!seen.has(n)){seen.add(n);q.push(n);}
  }
 }
 return seen.size;
}
export const BUILDING_TYPES=Object.freeze({
 compact:{name:'Compact Residence',description:'Small footprint, short cross circulation',targetRooms:10,maxRoomCells:25},
 central:{name:'Central Atrium',description:'Large shared centre and radial circulation',targetRooms:14,maxRoomCells:24},
 grid:{name:'Urban Grid',description:'Regular intersecting streets and corridors',targetRooms:18,maxRoomCells:23},
 courtyard:{name:'Courtyard Loop',description:'Rings around an open-air courtyard',targetRooms:17,maxRoomCells:23},
 branched:{name:'Connected Wings',description:'Short side wings with a connected spine',targetRooms:14,maxRoomCells:24},
 rowhouse:{name:'Narrow Rowhouse',description:'Narrow frontage, long rooms and a compact corridor spine',targetRooms:10,maxRoomCells:23},
 loft:{name:'Industrial Loft',description:'Perimeter galleries and open central studio zones',targetRooms:11,maxRoomCells:30},
 villa:{name:'Villa with Galleries',description:'Central living hall and side galleries',targetRooms:15,maxRoomCells:24}
});
export const BUILDING_TYPE_IDS=Object.freeze(Object.keys(BUILDING_TYPES));
function topologicalGrid(rng,style,program=null){
 const grid=new Array(GRID_W*GRID_H).fill(OUTSIDE);
 const hall=(x,z)=>{if(inside(x,z))grid[idx(x,z)]=HALL;};
 const fillRect=(x0,x1,z0,z1,fn=hall)=>{
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)fn(x,z);
 };
 const cfg=BUILDING_TYPES[style];
 if(!cfg)throw Error('Unknown building style: '+style);
 let x0=0,x1=GRID_W-1,z0=0,z1=GRID_H-1,atrium=null;
 if(style==='compact'){
  x0=4;x1=20;z0=3;z1=15;
  fillRect(11,12,z0,z1);fillRect(x0,x1,8,9);
 }else if(style==='central'){
  x0=1;x1=23;z0=1;z1=17;
  fillRect(11,12,z0,z1);fillRect(x0,x1,8,9);
  fillRect(9,14,6,11); // compact atrium lobby keeps the adjacent rooms usable
  atrium={x:0,z:0,kind:'lobby'};
 }else if(style==='grid'){
  fillRect(7,8,z0,z1);fillRect(16,17,z0,z1);
  fillRect(x0,x1,5,6);fillRect(x0,x1,12,13);
 }else if(style==='courtyard'){
  fillRect(7,8,z0,z1);fillRect(16,17,z0,z1);
  fillRect(x0,x1,5,6);fillRect(x0,x1,12,13);
  // A genuine outdoor opening surrounded by a corridor ring.
  fillRect(9,15,7,11);
  fillRect(10,14,8,10,(x,z)=>{grid[idx(x,z)]=OUTSIDE;});
  atrium={x:0,z:0,kind:'open-air'};
 }else if(style==='branched'){
  // The wings should frame 3-5 tile-deep rooms. The former closely
  // spaced cross-halls left 2x8 bedroom strips with no usable proportions.
  x0=1;x1=23;z0=3;z1=14;
  fillRect(x0,x1,8,9);
  fillRect(6,7,3,14);fillRect(16,17,3,14);
  fillRect(7,16,3,4);fillRect(7,16,13,14);
 }else if(style==='rowhouse'){
  // Narrow street front, deep parcels and a single cross-hall.
  x0=6;x1=18;z0=1;z1=17;
  fillRect(11,12,z0,z1);fillRect(x0,x1,8,9);
 }else if(style==='loft'){
  x0=2;x1=22;z0=4;z1=14;
  fillRect(x0,x1,4,5);fillRect(x0,x1,13,14);
  fillRect(2,3,5,13);fillRect(21,22,5,13);
  fillRect(11,12,5,13);
  atrium={x:0,z:0,kind:'studio-hall'};
 }else if(style==='villa'){
  x0=2;x1=22;z0=2;z1=16;
  fillRect(10,12,z0,z1);
  fillRect(x0,x1,8,9);
  fillRect(7,15,6,7);
  fillRect(7,15,10,11);
  atrium={x:0,z:0,kind:'lobby'};
 }
 // Each component not already circulation is a room candidate.
 // Subdivide oversized bays only when BOTH resulting rooms can open on a corridor.
 const components=[],seen=new Set();
 for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
  const i=idx(x,z);
  if(grid[i]!==OUTSIDE||seen.has(i))continue;
  const nodes=[{gx:x,gz:z}],queue=[i];
  seen.add(i);
  for(let at=0;at<queue.length;at++){
   const k=queue[at],px=k%GRID_W,pz=Math.floor(k/GRID_W);
   for(const {dx,dz} of DIRS){
    const nx=px+dx,nz=pz+dz;
    if(nx<x0||nx>x1||nz<z0||nz>z1)continue;
    const n=idx(nx,nz);
    if(grid[n]===OUTSIDE&&!seen.has(n)){
     seen.add(n);queue.push(n);nodes.push({gx:nx,gz:nz});
    }
   }
  }
  components.push(nodes);
 }
 const connected=(cells)=>{
  if(!cells.length)return false;
  const ids=new Set(cells.map(c=>idx(c.gx,c.gz)));
  const visited=new Set([idx(cells[0].gx,cells[0].gz)]),todo=[cells[0]];
  for(let p=0;p<todo.length;p++){
   const c=todo[p];
   for(const {dx,dz} of DIRS){
    const key=idx(c.gx+dx,c.gz+dz);
    if(ids.has(key)&&!visited.has(key)){
     visited.add(key);todo.push({gx:c.gx+dx,gz:c.gz+dz});
    }
   }
  }
  return visited.size===cells.length;
 };
 const hasDoor=(cells)=>cells.some(c=>DIRS.some(({dx,dz})=>{
  const x=c.gx+dx,z=c.gz+dz;
  return inside(x,z)&&grid[idx(x,z)]===HALL;
 }));
 // Compact, entirely orthogonal room grammar. Every rectangular bounding box
 // must have an aspect ratio <= 5:3. The old size-only splitter made 2x8
 // bedrooms; a small room with an internal connecting door is preferable.
 const ROOM_RATIO=5/3, MAX_ROOM_CELLS=30;
 const geom=(cells)=>{
  const xs=cells.map(c=>c.gx),zs=cells.map(c=>c.gz);
  const width=Math.max(...xs)-Math.min(...xs)+1,
        depth=Math.max(...zs)-Math.min(...zs)+1;
  return {width,depth,ratio:Math.max(width,depth)/Math.min(width,depth),
   fill:cells.length/(width*depth)};
 };
 const qualifies=cells=>{
  const g=geom(cells);
  return g.ratio<=ROOM_RATIO+1e-9&&cells.length<=MAX_ROOM_CELLS;
 };
 function trySplit(cells){
  const g=geom(cells);
  const axes=g.width>=g.depth?['gx','gz']:['gz','gx'];
  const options=[];
  for(const axis of axes){
   const vs=cells.map(c=>c[axis]),a=Math.min(...vs),b=Math.max(...vs);
   for(let cut=a;cut<b;cut++){
    const left=cells.filter(c=>c[axis]<=cut),
          right=cells.filter(c=>c[axis]>cut);
    if(Math.min(left.length,right.length)<4)continue;
    if(!connected(left)||!connected(right))continue;
    const l=geom(left),r=geom(right);
    // Never create a one-cell-wide room or a wall-less diagonal parcel.
    if(Math.min(l.width,l.depth,r.width,r.depth)<2)continue;
    const over=x=>Math.max(0,x.ratio-ROOM_RATIO);
    const score=14*(over(l)+over(r))
      +.065*(Math.max(0,left.length-MAX_ROOM_CELLS)+
              Math.max(0,right.length-MAX_ROOM_CELLS))
      +.028*Math.abs(left.length-right.length)
      +1.9*((1-l.fill)+(1-r.fill))
      +(hasDoor(left)&&hasDoor(right)?-1.1:0)
      +rng()*.0001;
    options.push({left,right,score});
   }
  }
  options.sort((a,b)=>a.score-b.score);
  return options[0]||null;
 }
 let roomsCells=components;
 for(let attempt=0;attempt<100;attempt++){
  const eligible=roomsCells.map((cells,index)=>({cells,index,g:geom(cells)}))
    .filter(o=>!qualifies(o.cells))
    .sort((a,b)=>Math.max(0,b.g.ratio-ROOM_RATIO)*20+b.cells.length*.04-
       (Math.max(0,a.g.ratio-ROOM_RATIO)*20+a.cells.length*.04));
  if(!eligible.length)break;
  if(roomsCells.length>=65)throw Error('Excessive subdivision in '+style);
  const candidate=eligible.map(o=>({...o,split:trySplit(o.cells)}))
    .find(o=>o.split);
  if(!candidate)break; // asserted below with a diagnostic
  roomsCells.splice(candidate.index,1,candidate.split.left,candidate.split.right);
 }
 const unresolved=roomsCells.filter(c=>!qualifies(c));
 if(unresolved.length)throw Error('Cannot form 5:3 room without disconnecting parcels in '+style+
   ': '+unresolved.map(c=>JSON.stringify(geom(c))).join(', '));
 if(roomsCells.length<5||roomsCells.length>65)
  throw Error('Building grammar produced invalid room count: '+roomsCells.length);
 // Assign wide, furniture-heavy functions to naturally spacious parcels.
 // Purely shuffling room labels can put a dining table into a narrow L-shaped
 // passage even when an adjacent room is much more suitable.
 const allowed=Object.keys(ROOM_TYPES).filter(key=>!ROOM_TYPES[key].circulation&&
   (!ROOM_TYPES[key].micro||program?.weights[key]));
 const chosen=shuffle(allowed.filter(key=>!ROOM_TYPES[key].micro),rng),rooms=[];
 const selected=selectProgramRoomTypes(program,roomsCells.length,rng,allowed)||
   Array.from({length:roomsCells.length},(_,i)=>chosen[i%chosen.length]);
 const demand={dining:10,lounge:9,kitchen:8,suite:7,games:6,
   studio:5,library:4,wellness:3,office:2,gallery:1,bath:0};
 const spatialRank=roomsCells.map((cells,i)=>{
  const xs=cells.map(c=>c.gx),zs=cells.map(c=>c.gz);
  const width=Math.max(...xs)-Math.min(...xs)+1;
  const depth=Math.max(...zs)-Math.min(...zs)+1;
  const compactness=cells.length/(width*depth);
  const score=cells.length*(.45+.55*compactness)+Math.min(width,depth);
  return {i,score};
 }).sort((a,b)=>b.score-a.score);
 const typesRank=selected.map((type,i)=>({type,i}))
   .sort((a,b)=>(demand[b.type]??0)-(demand[a.type]??0)||a.i-b.i);
 const assigned=new Array(roomsCells.length);
 for(let j=0;j<typesRank.length;j++)
  assigned[spatialRank[j].i]=typesRank[j].type;
 for(let i=0;i<roomsCells.length;i++){
  const cells=roomsCells[i].map(c=>({...c,...cellWorld(c.gx,c.gz)}));
  const id=i+1,type=roomsCells[i].length<8?'utility':assigned[i];
  for(const c of cells)grid[idx(c.gx,c.gz)]=id;
  const x=cells.reduce((s,c)=>s+c.x,0)/cells.length,z=cells.reduce((s,c)=>s+c.z,0)/cells.length;
  rooms.push({id,type,kind:type,name:ROOM_TYPES[type].name,
   side:z<-1?'north':z>1?'south':'middle',
   x,z,cells,area:cells.length*TILE*TILE,
   xMin:Math.min(...cells.map(c=>c.x-TILE/2)),
   xMax:Math.max(...cells.map(c=>c.x+TILE/2)),
   zMin:Math.min(...cells.map(c=>c.z-TILE/2)),
   zMax:Math.max(...cells.map(c=>c.z+TILE/2))});
 }
 if(reachableCells(grid,HALL)!==grid.filter(v=>v===HALL).length)
   throw Error('Hallway network disconnected for '+style);
 return {grid,rooms,atrium,style,footprint:{minGX:x0,maxGX:x1,minGZ:z0,maxGZ:z1}};
}
const rzSide=(z)=>z===0?'north':z===2?'south':'middle';
function chooseDoors(grid,rooms,rng){
 // BFS on room adjacency to circulation. A parcel that cannot open directly
 // on a corridor receives one connecting door to a room closer to the hall.
 // This prevents otherwise impossible 2x8 parcels without sealing rooms off.
 const neighbors=new Map(rooms.map(r=>[r.id,new Set()]));
 const distances=new Map();
 for(const room of rooms)for(const c of room.cells)for(const {dx,dz} of DIRS){
  const x=c.gx+dx,z=c.gz+dz;
  if(!inside(x,z))continue;
  const target=grid[idx(x,z)];
  if(target===HALL)distances.set(room.id,0);
  else if(target>0&&target!==room.id)neighbors.get(room.id).add(target);
 }
 const queue=[...distances.keys()];
 for(let at=0;at<queue.length;at++){
  const parent=queue[at],level=distances.get(parent);
  for(const near of neighbors.get(parent)){
   if(!distances.has(near)){distances.set(near,level+1);queue.push(near);}
  }
 }
 if(distances.size!==rooms.length)
  throw Error('Disconnected room-to-circulation graph');
 const doors=[];
 for(const room of rooms){
  const options=[],distance=distances.get(room.id);
  for(const c of room.cells)for(const {dx,dz} of DIRS){
   const nx=c.gx+dx,nz=c.gz+dz;
   if(!inside(nx,nz))continue;
   const target=grid[idx(nx,nz)];
   const corridor=target===HALL;
   if(!corridor && !(target>0&&distances.get(target)<distance))continue;
   const shared=DIRS.filter(d=>inside(c.gx+d.dx,c.gz+d.dz)&&
     grid[idx(c.gx+d.dx,c.gz+d.dz)]===room.id).length;
   const score=3*(corridor?1:0)+.8*(shared>=2)
      -.18*Math.hypot(c.x-room.x,c.z-room.z)+rng()*.03;
   options.push({x:c.x+dx*TILE/2,z:c.z+dz*TILE/2,
     roomId:room.id,toRoomId:corridor?HALL:target,
     roomCell:{x:c.x,z:c.z},hallCell:cellWorld(nx,nz),
     edgeKey:edgeKey(c.gx,c.gz,dx,dz),axis:dx?'z':'x',
     dx,dz,score,side:room.side});
  }
  options.sort((a,b)=>b.score-a.score);
  if(!options.length)throw Error('No connected doorway for '+room.id);
  doors.push(options[0]);
 }
 return doors;
}
function chooseExteriorDoor(grid,footprint,rng){
 const choices=[];
 for(let gz=footprint.minGZ;gz<=footprint.maxGZ;gz++)
 for(let gx=footprint.minGX;gx<=footprint.maxGX;gx++){
  if(grid[idx(gx,gz)]!==HALL)continue;
  const c=cellWorld(gx,gz);
  for(const {dx,dz} of DIRS){
   const nx=gx+dx,nz=gz+dz;
   // Only the OUTER envelope counts as the external door; never the
   // courtyard or an internal void. This door intentionally stays locked.
   if(nx>=footprint.minGX&&nx<=footprint.maxGX&&
      nz>=footprint.minGZ&&nz<=footprint.maxGZ)continue;
   const score=10*(dz===1?1:0)-Math.abs(c.x)*.28-
     Math.abs(c.z)*.065+rng()*.0001;
   choices.push({x:c.x+dx*TILE/2,z:c.z+dz*TILE/2,
    axis:dx?'z':'x',dx,dz,
    cell:{gx,gz,x:c.x,z:c.z},
    edgeKey:edgeKey(gx,gz,dx,dz),
    locked:true,exterior:true,score});
  }
 }
 choices.sort((a,b)=>b.score-a.score);
 const winner=choices[0]||null;
 if(!winner)throw new Error('No external entrance along the actual outer envelope');
 return winner;
}
const WINDOW_BOTTOM=1.02,WINDOW_HEIGHT=1.28,WINDOW_WIDTH=.84;
function stableFraction(seed,x,z,dx,dz){
 let h=2166136261;
 for(const char of String(seed)+':'+x+':'+z+':'+dx+':'+dz){
  h=Math.imul(h^char.charCodeAt(0),16777619);
 }
 return (h>>>0)/4294967296;
}
function wallsFromGrid(grid,doors,exteriorDoor,rooms=[],seed='world'){
 const out=[],windows=[],windowBlockers=[];
 const byRoom=new Map(rooms.map(r=>[r.id,r]));
 const doorEdges=new Set([...doors.map(d=>d.edgeKey),
   ...(exteriorDoor?[exteriorDoor.edgeKey]:[])]);
 function wall(x,z,w,d,kind='wall',height=WALL_HEIGHT,y=.10+height/2,angle=0){
  out.push({x,z,w,d,kind,height,y,angle});
 }
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++){
  const self=grid[idx(x,z)];
  if(self===OUTSIDE)continue;
  const c=cellWorld(x,z);
  for(const {dx,dz} of DIRS){
   const nx=x+dx,nz=z+dz;
   const other=inside(nx,nz)?grid[idx(nx,nz)]:OUTSIDE;
   if(other===self || (other!==OUTSIDE && self>other))continue;
   const px=c.x+dx*TILE/2,pz=c.z+dz*TILE/2;
   const horizontal=dz!==0;
   if(doorEdges.has(edgeKey(x,z,dx,dz))){
     const rem=(TILE-DOOR_WIDTH)/2;
     for(const sign of [-1,1]){
       const off=sign*(DOOR_WIDTH/2+rem/2);
       wall(px+(horizontal?off:0),pz+(horizontal?0:off),
            horizontal?rem:WALL_THICKNESS,horizontal?WALL_THICKNESS:rem);
     }
     // The complete region above the door leaf is SOLID wall, not a
     // decorative 34cm strip leaving a floating open gap.
     const lintelHeight=WALL_HEIGHT-DOOR_HEIGHT;
     wall(px,pz,horizontal?TILE:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:TILE,'lintel',lintelHeight,
       .10+DOOR_HEIGHT+lintelHeight/2);
   }else if(other===OUTSIDE){
     const room=byRoom.get(self),type=room?.type;
     const privacy=type==='bath'||type==='utility';
     const density=(type==='corridor'||self===HALL)?.34:
       type==='gallery'||type==='lounge'||type==='suite'?.78:.62;
     const shouldWindow=!privacy&&
       stableFraction(seed,x,z,dx,dz)<density;
     if(shouldWindow){
      // Split ONE exterior wall into actual masonry pieces. Glass only
      // occupies the resulting hole; it is not pasted over a solid wall.
      const pier=(TILE-WINDOW_WIDTH)/2;
      for(const sign of [-1,1]){
       const offset=sign*(WINDOW_WIDTH/2+pier/2);
       wall(px+(horizontal?offset:0),pz+(horizontal?0:offset),
        horizontal?pier:WALL_THICKNESS,
        horizontal?WALL_THICKNESS:pier);
      }
      wall(px,pz,horizontal?WINDOW_WIDTH:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:WINDOW_WIDTH,
       'windowSill',WINDOW_BOTTOM,.10+WINDOW_BOTTOM/2);
      const head=WALL_HEIGHT-WINDOW_BOTTOM-WINDOW_HEIGHT;
      wall(px,pz,horizontal?WINDOW_WIDTH:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:WINDOW_WIDTH,'windowHead',
       head,.10+WINDOW_BOTTOM+WINDOW_HEIGHT+head/2);
      windows.push({x:px,z:pz,axis:horizontal?'x':'z',
       dx,dz,roomId:self,width:WINDOW_WIDTH,
       bottom:.10+WINDOW_BOTTOM,height:WINDOW_HEIGHT,
       type:room?.type||'corridor',privacy:false});
      // Glass does not let actors clip through the façade. A separate,
      // invisible solid collision proxy preserves walkability tests.
      windowBlockers.push({x:px,z:pz,
       w:horizontal?TILE:WALL_THICKNESS,
       d:horizontal?WALL_THICKNESS:TILE,
       kind:'windowCollision'});
     }else wall(px,pz,horizontal?TILE:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:TILE);
   }else wall(px,pz,horizontal?TILE:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:TILE);
  }
 }
 return {walls:out,windows,windowBlockers};
}
// Multi-storey buildings have a single street entrance at ground level.
// Upper floors get a complete exterior wall instead of a door leading to
// empty air. Keep original private-room doors and all the floor plan data.
export function sealExteriorDoor(layout){
 if(!layout.exteriorDoor)return layout;
 layout.exteriorDoor=null;
 const envelope=wallsFromGrid(layout.grid,layout.doors,null,
   layout.rooms,layout.seed);
 layout.walls=envelope.walls;
 layout.windows=envelope.windows;
 layout.windowBlockers=envelope.windowBlockers;
 layout.obstacles=[
  ...layout.walls.filter(w=>w.kind==='wall').map(w=>({...w})),
  ...layout.windowBlockers,
  ...layout.props.filter(p=>p.solid).map(p=>({...p,kind:'furniture'}))
 ];
 return layout;
}
function pointBoxDistance(x,z,o){
 const cx=clamp(x,o.x-o.w/2,o.x+o.w/2),
       cz=clamp(z,o.z-o.d/2,o.z+o.d/2);
 return Math.hypot(x-cx,z-cz);
}
export function isWalkable(layout,x,z,radius=.29){
 const {gx,gz}=worldCell(x,z);
 if(!inside(gx,gz)||layout.grid[idx(gx,gz)]===OUTSIDE)return false;
 return !(layout.obstacles||[]).some(o=>pointBoxDistance(x,z,o)<radius);
}
export function generateTopology(seed='vitae-001',requestedType='auto',program=null){
 const rng=seededRandom(String(seed)+'::architecture');
 const style=requestedType==='auto'?
  BUILDING_TYPE_IDS[Math.floor(rng()*BUILDING_TYPE_IDS.length)]:requestedType;
 const {grid,rooms,atrium,footprint}=topologicalGrid(rng,style,program);
 const doors=chooseDoors(grid,rooms,rng);
 const exteriorDoor=chooseExteriorDoor(grid,footprint,rng);
 const envelope=wallsFromGrid(grid,doors,exteriorDoor,rooms,seed);
 const {walls,windows,windowBlockers}=envelope;
 const chamfers=[]; // Orthogonal walls only; no diagonal corner cuts.
 const floors=[];
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++){
  const roomId=grid[idx(x,z)];
  if(roomId!==OUTSIDE)floors.push({gx:x,gz:z,...cellWorld(x,z),roomId});
 }
 const hall=floors.filter(c=>c.roomId===HALL);
 const center=hall.reduce((a,c)=>!a||Math.hypot(c.x,c.z)<Math.hypot(a.x,a.z)?c:a,null);
 const layout={seed:String(seed),grid,rooms,doors,exteriorDoor,walls,
  windows,windowBlockers,chamfers,floors,
  props:[],obstacles:[...walls.filter(w=>w.kind==='wall').map(w=>({...w})),
   ...windowBlockers],
  tile:TILE,buildingType:style,buildingName:BUILDING_TYPES[style].name,
  buildingProgram:program||null,
  footprint,atrium,
  spawn:{x:center.x,z:center.z},bounds:{
   minX:-GRID_W*TILE/2,maxX:GRID_W*TILE/2,
   minZ:-GRID_H*TILE/2,maxZ:GRID_H*TILE/2},
  geometryVersion:4};
 return layout;
}
