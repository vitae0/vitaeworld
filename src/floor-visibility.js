// Pure rendering policy. Upper floors keep only their structural slab
// visible while the player is on the lower floor; upper walls, props,
// windows and interaction scenes remain culled for browser performance.
export function floorVisibilityPlan(building,current,firstPerson,playerY){
 const stairs=building.stairs||[];
 const onStairs=stairs.some(s=>
  playerY>s.from*building.levelHeight+.14&&
  playerY<s.to*building.levelHeight-.14);
 return building.stories.map((_,i)=>{
  const rooms=i===current||onStairs;
  return {
   rooms,
   // The NEXT floor's deck serves as the physical overhead slab while
   // standing below, but the rest of that story stays invisible.
   deck:i===current||i===current+1||onStairs,
   ceiling:firstPerson&&rooms
  };
 });
}


// Shared 2D coverage tests prevent an opaque lower-floor ceiling from hiding
// the independently rendered upper-floor slab. Preserve a local roof only
// where no upper floor exists, e.g. an overhanging or offset plan.
import {TILE,GRID_W,GRID_H,cellWorld} from './topology.js';
const cellKey=c=>c.gz*GRID_W+c.gx;
export function renderedDeckCells(layout){
 return (layout?.floors||[]).filter(c=>!layout.floorHoles?.has(cellKey(c)));
}
export function visibleCeilingCells(layout,aboveLayout=null){
 const overhead=new Set(renderedDeckCells(aboveLayout).map(cellKey));
 return (layout.floors||[]).filter(c=>
  !layout.ceilingHoles?.has(cellKey(c))&&!overhead.has(cellKey(c)));
}
// A small under-slab rim follows only the true edges of the stair opening.
// It is visual trim and never changes the staircase navigation/collision.
export function stairwellRimSegments(layout){
 if(!layout.floorHoles?.size)return [];
 const realDeck=new Set(renderedDeckCells(layout).map(cellKey));
 const segments=[];
 for(const hole of layout.floorHoles){
  const gx=hole%GRID_W,gz=Math.floor(hole/GRID_W);
  if(gz<0||gz>=GRID_H)continue;
  const c=cellWorld(gx,gz);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=gx+dx,nz=gz+dz;
   if(nx<0||nx>=GRID_W||nz<0||nz>=GRID_H||
      !realDeck.has(nz*GRID_W+nx))continue;
   segments.push({
    x:c.x+dx*TILE/2,z:c.z+dz*TILE/2,
    w:dx===0?TILE:.084,d:dz===0?TILE:.084
   });
  }
 }
 return segments;
}
