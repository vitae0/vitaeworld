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
function topologicalGrid(rng){
 const grid=new Array(GRID_W*GRID_H).fill(OUTSIDE);
 const xc=[7+Math.floor(rng()*2),16+Math.floor(rng()*2)];
 const zc=[5+Math.floor(rng()*2),12+Math.floor(rng()*2)];
 const bx=[[0,xc[0]-1],[xc[0]+2,xc[1]-1],[xc[1]+2,GRID_W-1]];
 const bz=[[0,zc[0]-1],[zc[0]+2,zc[1]-1],[zc[1]+2,GRID_H-1]];
 const hall=(x,z)=>{if(inside(x,z))grid[idx(x,z)]=HALL;};
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++){
  if(x===xc[0]||x===xc[0]+1||x===xc[1]||x===xc[1]+1||
     z===zc[0]||z===zc[0]+1||z===zc[1]||z===zc[1]+1)hall(x,z);
 }
 // A central hall loop around an open air well is connected to every spine.
 for(let z=bz[1][0];z<=bz[1][1];z++)for(let x=bx[1][0];x<=bx[1][1];x++)hall(x,z);
 const xMid=Math.floor((bx[1][0]+bx[1][1])/2);
 const zMid=Math.floor((bz[1][0]+bz[1][1])/2);
 for(let z=zMid;z<=zMid+1;z++)for(let x=xMid;x<=xMid+1;x++)grid[idx(x,z)]=OUTSIDE;
 // Independent side connectors make additional route loops.
 const spurs=[];
 for(const col of [0,2]){
   const [minX,maxX]=bx[col],x=Math.floor((minX+maxX)/2);
   spurs.push(x);
   for(let z=bz[1][0];z<=bz[1][1];z++)hall(x,z);
 }
 const regions=[];
 for(let rz=0;rz<3;rz++)for(let rx=0;rx<3;rx++){
  if(rx===1&&rz===1)continue;
  const [x0,x1]=bx[rx], [z0,z1]=bz[rz];
  let ranges;
  if(rz===1){
    const cut=spurs[rx===0?0:1];
    ranges=[[x0,cut-1],[cut+1,x1]];
  }else{
    const width=x1-x0+1;
    const cut=x0+Math.floor(width/2)-1;
    ranges=[[x0,cut],[cut+1,x1]];
  }
  for(const [ax,bx1] of ranges){
   if(bx1-ax+1<2)throw Error('Room bay too narrow');
   regions.push({minGX:ax,maxGX:bx1,minGZ:z0,maxGZ:z1,rx,rz});
  }
 }
 const chosen=shuffle(Object.keys(ROOM_TYPES),rng);
 const rooms=[];
 regions.forEach((r,i)=>{
  const id=i+1,type=chosen[i%chosen.length];
  const cells=[];
  for(let z=r.minGZ;z<=r.maxGZ;z++)for(let x=r.minGX;x<=r.maxGX;x++){
   grid[idx(x,z)]=id;
   cells.push({gx:x,gz:z,...cellWorld(x,z)});
  }
  const x=cells.reduce((s,c)=>s+c.x,0)/cells.length,
        z=cells.reduce((s,c)=>s+c.z,0)/cells.length;
  rooms.push({id,type,kind:type,name:ROOM_TYPES[type].name,
   side:rzSide(r.rz),x,z,cells,area:cells.length*TILE*TILE,
   xMin:cellWorld(r.minGX,r.minGZ).x-TILE/2,
   xMax:cellWorld(r.maxGX,r.maxGZ).x+TILE/2,
   zMin:cellWorld(r.minGX,r.minGZ).z-TILE/2,
   zMax:cellWorld(r.maxGX,r.maxGZ).z+TILE/2,
   bay:r});
 });
 if(reachableCells(grid,HALL)!==grid.filter(v=>v===HALL).length)throw Error('Circulation network disconnected');
 return {grid,rooms,xc,zc,spurs,atrium:{x:cellWorld(xMid,zMid).x+TILE/2,z:cellWorld(xMid,zMid).z+TILE/2}};
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
export function generateTopology(seed='vitae-001'){
 const rng=seededRandom(String(seed)+'::architecture');
 const {grid,rooms,xc,zc,spurs,atrium}=topologicalGrid(rng);
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
  tile:TILE,xc,zc,spurs,atrium,
  spawn:{x:center.x,z:center.z},bounds:{
   minX:-GRID_W*TILE/2,maxX:GRID_W*TILE/2,
   minZ:-GRID_H*TILE/2,maxZ:GRID_H*TILE/2},
  geometryVersion:3};
 return layout;
}
