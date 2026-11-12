// Physical furnishing constraints independent from the learned position model.
// Windows are genuine openings, so tall furniture must not cover their glass.
// Short desks, sofas and low cabinets remain eligible near daylight.
const OBSTRUCTIVE_ROLES=new Set([
 'storage','coldStorage','screen','mediaStorage','display','shower'
]);
export function blocksWindow(layout,room,asset,position){
 if(!asset||!position||!OBSTRUCTIVE_ROLES.has(asset.role)||
    asset.h<1.12)return false;
 const windows=layout.windows||[];
 for(const opening of windows){
  if(opening.roomId!==room.id)continue;
  // A height check covers furniture tall enough to cover the opening.
  // A low dresser that stays below the sill is permitted.
  if(asset.h+.10<=opening.bottom+.06)continue;
  const along=opening.axis==='x'?'x':'z';
  const normal=opening.axis==='x'?'z':'x';
  const length=along==='x'?position.w:position.d;
  const depth=normal==='x'?position.w:position.d;
  const tangential=Math.abs(position[along]-opening[along]);
  const closeToWall=Math.abs(position[normal]-opening[normal])-depth/2;
  if(tangential<(length+opening.width)/2+.08&&closeToWall<.42)
   return true;
 }
 return false;
}

 
// A small, deterministic objective for physically usable furniture. It is
// a SECONDARY tie-break in the existing 40D semantic system, not a new
// placement model. A chair facing a table must be accessible from behind;
// cupboards, appliances, beds and sofas need standing room nearby.
import {GRID_W,GRID_H,worldCell} from './topology.js';
import {forwardFromYaw} from './orientation.js';
const USE_ROLES=new Set([
 'bed','sofa','chair','bench','deskChair','diningChair',
 'desk','storage','coldStorage','cooking','sink','counter',
 'bath','toilet','shower'
]);
const BACK_APPROACH=new Set(['deskChair','diningChair']);
const SIDE_APPROACH=new Set(['bed','bath']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function accessibleFace(layout,room,position,neighbors,fx,fz){
 const sideways={x:-fz,z:fx};
 const half=Math.abs(fx)*position.w/2+Math.abs(fz)*position.d/2;
 let valid=0,count=0;
 for(const step of [.32,.66])for(const lateral of [-.20,0,.20]){
  count++;
  const x=position.x+fx*(half+step)+sideways.x*lateral;
  const z=position.z+fz*(half+step)+sideways.z*lateral;
  const {gx,gz}=worldCell(x,z);
  if(gx<0||gx>=GRID_W||gz<0||gz>=GRID_H||
   layout.grid[gz*GRID_W+gx]!==room.id)continue;
  if(neighbors.some(other=>{
   if(!other.solid||other.supportedBy||other.role==='rug')return false;
   const dx=Math.max(0,Math.abs(x-other.x)-other.w/2);
   const dz=Math.max(0,Math.abs(z-other.z)-other.d/2);
   return Math.hypot(dx,dz)<.26;
  }))continue;
  valid++;
 }
 return valid/count;
}
export function furnitureUseFrontage(layout,room,asset,position,neighbors=[]){
 if(!USE_ROLES.has(asset.role)||!asset.solid)return 0;
 const heading=forwardFromYaw(position.angle||0);
 let {x:fx,z:fz}=heading;
 if(BACK_APPROACH.has(asset.role)){fx=-fx;fz=-fz;}
 if(SIDE_APPROACH.has(asset.role)){
  const first=accessibleFace(layout,room,position,neighbors,-fz,fx);
  const second=accessibleFace(layout,room,position,neighbors,fz,-fx);
  return Math.max(first,second);
 }
 return accessibleFace(layout,room,position,neighbors,fx,fz);
}
