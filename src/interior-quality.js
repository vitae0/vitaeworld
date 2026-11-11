// Deterministic, renderer-independent guarantees for furnishing.
// Only floor solids obstruct circulation. Rugs and elevated accessories may share
// the same horizontal footprint when their vertical volumes do not intersect.
import {TILE,GRID_W,GRID_H,worldCell} from './topology.js';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function footprintOverlap(a,b,margin=0){
 return Math.abs(a.x-b.x)<(a.w+b.w)/2+margin &&
   Math.abs(a.z-b.z)<(a.d+b.d)/2+margin;
}
export function volumeOverlap(a,b,margin=.005){
 // y is the BOTTOM of each prop, not its centre.
 if(a.role==='rug'||b.role==='rug')return false;
 return footprintOverlap(a,b,margin) &&
   (a.y??.1)<(b.y??.1)+b.h-margin &&
   (b.y??.1)<(a.y??.1)+a.h-margin;
}
function pointToBox(x,z,o){
 const dx=x-clamp(x,o.x-o.w/2,o.x+o.w/2);
 const dz=z-clamp(z,o.z-o.d/2,o.z+o.d/2);
 return Math.hypot(dx,dz);
}
function pointToSegment(x,z,s){
 const vx=s.bx-s.ax,vz=s.bz-s.az;
 const t=clamp(((x-s.ax)*vx+(z-s.az)*vz)/(vx*vx+vz*vz||1),0,1);
 return Math.hypot(x-s.ax-vx*t,z-s.az-vz*t);
}

// A 4x4 subcell navigation grid catches furniture arrangements that leave
// isolated pockets. This is not a full navmesh, but is independent of 3D assets.
export function roomAccessibility(layout,room,props,options={}){
 const resolution=options.resolution??4, radius=options.radius??.23;
 const stride=GRID_W*resolution, owner=room.id;
 const solids=props.filter(p=>p.roomId===owner&&p.solid);
 const cuts=(layout.chamfers||[]).filter(c=>c.roomId===owner);
 const nodes=new Map();
 for(const cell of room.cells){
  for(let iz=0;iz<resolution;iz++)for(let ix=0;ix<resolution;ix++){
   const x=cell.x+((ix+.5)/resolution-.5)*TILE;
   const z=cell.z+((iz+.5)/resolution-.5)*TILE;
   // Character has a radius. Its full footprint must remain in the same
   // room; otherwise the grid would incorrectly permit wall-clipping.
   const clear=[[radius,0],[-radius,0],[0,radius],[0,-radius]]
     .every(([dx,dz])=>{
      const {gx,gz}=worldCell(x+dx,z+dz);
      return gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H&&
        layout.grid[gz*GRID_W+gx]===owner;
     });
   if(!clear || solids.some(p=>pointToBox(x,z,p)<radius) ||
      cuts.some(c=>pointToSegment(x,z,c)<radius+.065))continue;
   const key=(cell.gz*resolution+iz)*stride+cell.gx*resolution+ix;
   nodes.set(key,{key,x,z});
  }
 }
 if(!nodes.size)return {ratio:0,reachable:0,free:0,doorOpen:false};
 const door=layout.doors.find(d=>d.roomId===owner);
 if(!door)return {ratio:0,reachable:0,free:nodes.size,doorOpen:false};
 const entry=door.roomCell;
 let start=null,min=Infinity;
 for(const node of nodes.values()){
  const dist=Math.hypot(node.x-entry.x,node.z-entry.z);
  if(dist<min){min=dist;start=node.key;}
 }
 const doorOpen=min<=TILE*.75;
 if(!doorOpen)return {ratio:0,reachable:0,free:nodes.size,doorOpen:false};
 const seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){
  const key=queue[i],col=key%stride,row=Math.floor(key/stride);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=col+dx,nz=row+dz;
   if(nx<0||nx>=stride||nz<0||nz>=GRID_H*resolution)continue;
   const next=nz*stride+nx;
   if(nodes.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
  }
 }
 return {ratio:seen.size/nodes.size,reachable:seen.size,
   free:nodes.size,doorOpen:true};
}
export function collisionPairs(props){
 const collisions=[];
 for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++){
  const a=props[i],b=props[j];
  if(volumeOverlap(a,b))collisions.push([a.id,b.id]);
 }
 return collisions;
}
