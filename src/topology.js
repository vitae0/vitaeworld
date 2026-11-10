// Small-room floorplan grammar: two longitudinal and two transverse circulation
// spines, additional cross-links, central courtyard ring, 16 compact room parcels.
// All world/physics data is independent from Three.js.
import {ROOM_TYPES} from './semantics.js';

export const TILE=1.3, GRID_W=25, GRID_H=19, WALL_HEIGHT=3.25;
export const HALL=0, OUTSIDE=-1;
const DOOR_WIDTH=1.10, WALL_THICKNESS=.13;
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
 compact:{name:'Compact Residence',description:'Small footprint, short cross circulation',targetRooms:8,maxRoomCells:31},
 central:{name:'Central Atrium',description:'Large shared centre and radial circulation',targetRooms:11,maxRoomCells:29},
 grid:{name:'Urban Grid',description:'Regular intersecting streets and corridors',targetRooms:16,maxRoomCells:27},
 courtyard:{name:'Courtyard Loop',description:'Rings around an open-air courtyard',targetRooms:14,maxRoomCells:27},
 branched:{name:'Connected Wings',description:'Short side wings with a connected spine',targetRooms:12,maxRoomCells:29}
});
export const BUILDING_TYPE_IDS=Object.freeze(Object.keys(BUILDING_TYPES));
function topologicalGrid(rng,style){
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
  fillRect(8,15,5,12); // spacious central lobby instead of another corridor
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
  x0=1;x1=23;z0=2;z1=16;
  fillRect(x0,x1,8,9);
  fillRect(6,7,4,13);fillRect(16,17,4,13);
  fillRect(7,16,4,5);fillRect(7,16,12,13);
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
 function trySplit(cells){
  const xs=cells.map(c=>c.gx),zs=cells.map(c=>c.gz);
  const rangeX=Math.max(...xs)-Math.min(...xs),rangeZ=Math.max(...zs)-Math.min(...zs);
  const options=[];
  for(const axis of (rangeX>rangeZ?['gx','gz']:['gz','gx'])){
   const values=cells.map(c=>c[axis]),a=Math.min(...values),b=Math.max(...values);
   for(let cut=a+1;cut<b;cut++){
    const left=cells.filter(c=>c[axis]<=cut),right=cells.filter(c=>c[axis]>cut);
    if(Math.min(left.length,right.length)<8 || !hasDoor(left)||!hasDoor(right))continue;
    if(!connected(left)||!connected(right))continue;
    // Balance room sizes and prefer to avoid skinny one-cell strips.
    const sizeBias=Math.abs(left.length-right.length)*.06;
    const widthPenalty=Math.max(0,2-(cut-a))*1.2+Math.max(0,2-(b-cut))*1.2;
    options.push({left,right,score:sizeBias+widthPenalty+rng()*.1});
   }
  }
  options.sort((a,b)=>a.score-b.score);
  return options[0]||null;
 }
 let roomsCells=components;
 for(let attempt=0;attempt<36;attempt++){
  const eligible=roomsCells.map((cells,index)=>({cells,index}))
   .filter(o=>o.cells.length>cfg.maxRoomCells && roomsCells.length<cfg.targetRooms+5)
   .sort((a,b)=>b.cells.length-a.cells.length);
  if(!eligible.length && roomsCells.length>=cfg.targetRooms)break;
  const option=(eligible.length?eligible:roomsCells.map((cells,index)=>({cells,index}))
      .filter(x=>x.cells.length>=18).sort((a,b)=>b.cells.length-a.cells.length))
    .map(entry=>({...entry,split:trySplit(entry.cells)}))
    .find(entry=>entry.split);
  if(!option)break;
  roomsCells.splice(option.index,1,option.split.left,option.split.right);
 }
 if(roomsCells.length<5||roomsCells.length>22)throw Error('Building grammar produced invalid room count');
 const chosen=shuffle(Object.keys(ROOM_TYPES),rng),rooms=[];
 for(let i=0;i<roomsCells.length;i++){
  const cells=roomsCells[i].map(c=>({...c,...cellWorld(c.gx,c.gz)}));
  const id=i+1,type=chosen[i%chosen.length];
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
 return rooms.map(room=>{
  const options=[];
  for(const c of room.cells)for(const {dx,dz} of DIRS){
   const nx=c.gx+dx,nz=c.gz+dz;
   if(!inside(nx,nz)||grid[idx(nx,nz)]!==HALL)continue;
   const shared=DIRS.filter(d=>inside(c.gx+d.dx,c.gz+d.dz)&&
       grid[idx(c.gx+d.dx,c.gz+d.dz)]===room.id).length;
   const score=2*(shared>=2)+.1*rng()-
      .18*Math.hypot(c.x-room.x,c.z-room.z);
   options.push({x:c.x+dx*TILE/2,z:c.z+dz*TILE/2,
      roomId:room.id,roomCell:{x:c.x,z:c.z},
      hallCell:cellWorld(nx,nz),edgeKey:edgeKey(c.gx,c.gz,dx,dz),
      axis:dx?'z':'x',dx,dz,score,side:room.side});
  }
  options.sort((a,b)=>b.score-a.score);
  if(!options.length)throw Error('No corridor doorway for room '+room.id);
  return options[0];
 });
}
function wallsFromGrid(grid,doors){
 const out=[],doorEdges=new Set(doors.map(d=>d.edgeKey));
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
     wall(px,pz,horizontal?TILE:WALL_THICKNESS,
        horizontal?WALL_THICKNESS:TILE,'lintel',.34,
        .10+WALL_HEIGHT-.17);
   }else wall(px,pz,horizontal?TILE:WALL_THICKNESS,
       horizontal?WALL_THICKNESS:TILE);
  }
 }
 return out;
}
function bevelCorners(grid,rooms,doors,walls,rng){
 const out=[],used=new Set(),doorKeys=new Set(doors.map(d=>d.edgeKey));
 const near=(a,b)=>Math.abs(a-b)<.002;
 for(const room of shuffle(rooms,rng)){
  const eligible=[];
  for(const c of room.cells)for(const sx of [-1,1])for(const sz of [-1,1]){
   const aX=c.gx+sx,aZ=c.gz+sz;
   if(!inside(aX,c.gz)||!inside(c.gx,aZ))continue;
   const nX=grid[idx(aX,c.gz)],nZ=grid[idx(c.gx,aZ)];
   if(nX===room.id||nZ===room.id)continue;
   if(doorKeys.has(edgeKey(c.gx,c.gz,sx,0))||
      doorKeys.has(edgeKey(c.gx,c.gz,0,sz)))continue;
   const wx=c.x+sx*TILE/2,wz=c.z+sz*TILE/2;
   const wallX=walls.findIndex((w,i)=>!used.has(i)&&w.kind==='wall'&&
     near(w.x,wx)&&near(w.z,c.z)&&near(w.w,WALL_THICKNESS)&&near(w.d,TILE));
   const wallZ=walls.findIndex((w,i)=>!used.has(i)&&w.kind==='wall'&&
     near(w.x,c.x)&&near(w.z,wz)&&near(w.w,TILE)&&near(w.d,WALL_THICKNESS));
   if(wallX<0||wallZ<0)continue;
   const quality=(nX===OUTSIDE?3:0)+(nZ===OUTSIDE?3:0)+rng()*.8;
   eligible.push({c,sx,sz,wallX,wallZ,quality});
  }
  eligible.sort((a,b)=>b.quality-a.quality);
  const pick=eligible[0];
  if(!pick)continue;
  const {c,sx,sz,wallX,wallZ}=pick;
  if(used.has(wallX)||used.has(wallZ))continue;
  const cut=.62;
  walls[wallX].z-=sz*cut/2;walls[wallX].d-=cut;
  walls[wallZ].x-=sx*cut/2;walls[wallZ].w-=cut;
  used.add(wallX);used.add(wallZ);
  const cornerX=c.x+sx*TILE/2,cornerZ=c.z+sz*TILE/2;
  const ax=cornerX-sx*cut,az=cornerZ;
  const bx=cornerX,bz=cornerZ-sz*cut;
  const angle=-Math.atan2(bz-az,bx-ax);
  walls.push({x:(ax+bx)/2,z:(az+bz)/2,w:cut*Math.SQRT2,d:WALL_THICKNESS,
    height:WALL_HEIGHT,y:.10+WALL_HEIGHT/2,kind:'diagonal',
    angle,ax,az,bx,bz});
  out.push({roomId:room.id,cornerX,cornerZ,ax,az,bx,bz,cut,angle});
 }
 return out;
}
function pointBoxDistance(x,z,o){
 const cx=clamp(x,o.x-o.w/2,o.x+o.w/2),
       cz=clamp(z,o.z-o.d/2,o.z+o.d/2);
 return Math.hypot(x-cx,z-cz);
}
function segmentDistance(x,z,o){
 const vx=o.bx-o.ax,vz=o.bz-o.az,den=vx*vx+vz*vz;
 const t=clamp(((x-o.ax)*vx+(z-o.az)*vz)/(den||1),0,1);
 return Math.hypot(x-o.ax-t*vx,z-o.az-t*vz);
}
export function isWalkable(layout,x,z,radius=.29){
 const {gx,gz}=worldCell(x,z);
 if(!inside(gx,gz)||layout.grid[idx(gx,gz)]===OUTSIDE)return false;
 return !(layout.obstacles||[]).some(o=>o.kind==='diagonal'?
   segmentDistance(x,z,o)<radius+WALL_THICKNESS/2 :
   pointBoxDistance(x,z,o)<radius);
}
export function generateTopology(seed='vitae-001',requestedType='auto'){
 const rng=seededRandom(String(seed)+'::architecture');
 const style=requestedType==='auto'?
  BUILDING_TYPE_IDS[Math.floor(rng()*BUILDING_TYPE_IDS.length)]:requestedType;
 const {grid,rooms,atrium,footprint}=topologicalGrid(rng,style);
 const doors=chooseDoors(grid,rooms,rng);
 const walls=wallsFromGrid(grid,doors);
 const chamfers=bevelCorners(grid,rooms,doors,walls,rng);
 const floors=[];
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++){
  const roomId=grid[idx(x,z)];
  if(roomId!==OUTSIDE)floors.push({gx:x,gz:z,...cellWorld(x,z),roomId});
 }
 const hall=floors.filter(c=>c.roomId===HALL);
 const center=hall.reduce((a,c)=>!a||Math.hypot(c.x,c.z)<Math.hypot(a.x,a.z)?c:a,null);
 const layout={seed:String(seed),grid,rooms,doors,walls,chamfers,floors,
  props:[],obstacles:walls.filter(w=>w.kind==='wall'||w.kind==='diagonal').map(w=>({...w})),
  tile:TILE,buildingType:style,buildingName:BUILDING_TYPES[style].name,
  footprint,atrium,
  spawn:{x:center.x,z:center.z},bounds:{
   minX:-GRID_W*TILE/2,maxX:GRID_W*TILE/2,
   minZ:-GRID_H*TILE/2,maxZ:GRID_H*TILE/2},
  geometryVersion:4};
 return layout;
}
