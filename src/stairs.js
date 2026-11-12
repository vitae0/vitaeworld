// Deterministic two-storey link, entirely independent from Three.js.
// The ramp is an actual walkable height field; it is not a teleport trigger.
import {TILE,GRID_W,GRID_H,worldCell,isWalkable,HALL} from './topology.js';
export const STOREY_HEIGHT=3.65;
const key=(gx,gz)=>gz*GRID_W+gx;
const inside=(x,z)=>x>=0&&x<GRID_W&&z>=0&&z<GRID_H;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function chooseStaircase(stories){
 if(stories.length<2)return [];
 const base=stories[0].layout,upper=stories[1].layout;
 const directions=[[0,1],[1,0],[0,-1],[-1,0]];
 const possibilities=[];
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++)
 for(const [dx,dz] of directions){
  const cells=Array.from({length:7},(_,i)=>({gx:x+dx*i,gz:z+dz*i}));
  if(!cells.every(c=>inside(c.gx,c.gz)&&
   base.grid[key(c.gx,c.gz)]===HALL&&upper.grid[key(c.gx,c.gz)]===HALL))continue;
  const start=worldCell(x,z),end=worldCell(x+6*dx,z+6*dz);
  const mid=worldCell(x+3*dx,z+3*dz);
  // A real corridor stair should have reasonable end landings, not run
  // straight into another doorway or isolate the building's main entrance.
  const nearDoor=[...base.doors,...upper.doors].filter(d=>
   cells.slice(1,6).some(c=>{
    const p=worldCell(c.gx,c.gz);
    return Math.hypot(p.x-d.x,p.z-d.z)<TILE*.85;
   })).length;
  possibilities.push({cells,start,end,dx,dz,
   score:Math.hypot(mid.x,mid.z)+nearDoor*TILE*1.2+
    Math.hypot(start.x-base.spawn.x,start.z-base.spawn.z)*.06});
 }
 possibilities.sort((a,b)=>a.score-b.score);
 const selected=possibilities[0];
 if(!selected)throw Error('No safe continuous hallway run for stairs');
 const stair={id:'stair-0-1',from:0,to:1,
  start:selected.start,end:selected.end,
  dx:selected.dx,dz:selected.dz,cells:selected.cells,
  width:TILE*.86,run:6*TILE,rise:STOREY_HEIGHT,
  steps:20};
 // Geometry masks are rendering-only. The routing mask stays intact so
 // rooms and doors preserve their original 2D floorplan topology.
 stories[0].layout.ceilingHoles=new Set(stair.cells.map(c=>key(c.gx,c.gz)));
 stories[1].layout.floorHoles=new Set(stair.cells.slice(0,-1).map(c=>key(c.gx,c.gz)));
 for(const story of stories){
  story.layout.stairReservation=new Set(stair.cells.map(c=>key(c.gx,c.gz)));
 }
 return [stair];
}
function onRamp(stair,x,z){
 const vx=stair.end.x-stair.start.x,vz=stair.end.z-stair.start.z;
 const run=stair.run;
 const along=((x-stair.start.x)*vx+(z-stair.start.z)*vz)/run;
 const side=((x-stair.start.x)*(-vz)+(z-stair.start.z)*vx)/run;
 if(along<-.20||along>run+.20||Math.abs(side)>stair.width/2-.04)return null;
 const t=clamp(along/run,0,1);
 return {height:stair.from*STOREY_HEIGHT+t*stair.rise,
  level:t>=.5?stair.to:stair.from,onStair:true,t};
}
export function sampleWalkableGround(building,x,z,currentY,radius=.29){
 const candidates=[];
 for(const stair of building.stairs||[]){
  const sample=onRamp(stair,x,z);
  if(!sample)continue;
  const lower=building.stories[stair.from].layout;
  if(!isWalkable(lower,x,z,radius))continue;
  if(Math.abs(sample.height-currentY)<=.44)
   candidates.push(sample);
 }
 for(const story of building.stories){
  const height=story.elevation;
  if(Math.abs(height-currentY)>.44)continue;
  const {gx,gz}=worldCell(x,z),index=key(gx,gz);
  if(!inside(gx,gz)||story.layout.floorHoles?.has(index))continue;
  if(!isWalkable(story.layout,x,z,radius))continue;
  candidates.push({height,level:story.index,onStair:false,t:0});
 }
 candidates.sort((a,b)=>Math.abs(a.height-currentY)-Math.abs(b.height-currentY)||
  Number(b.onStair)-Number(a.onStair));
 return candidates[0]||null;
}
