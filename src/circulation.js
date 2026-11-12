// Treat circulation as first-class semantic rooms while preserving the legacy
// zero-valued hallway routing mask used by the floorplan and doorway solver.
import {TILE,GRID_W,GRID_H,HALL} from './topology.js';
import {ROOM_TYPES} from './semantics.js';

const key=(c)=>c.gz*GRID_W+c.gx;
const manhattan=(a,b)=>Math.abs(a.gx-b.gx)+Math.abs(a.gz-b.gz);
const adjacent=(c)=>[[1,0],[-1,0],[0,1],[0,-1]]
 .map(([x,z])=>({gx:c.gx+x,gz:c.gz+z}))
 .filter(c=>c.gx>=0&&c.gx<GRID_W&&c.gz>=0&&c.gz<GRID_H);
function chooseSeeds(hall,n){
 const seeds=[hall.reduce((best,c)=>!best||
   Math.hypot(c.x,c.z)<Math.hypot(best.x,best.z)?c:best,null)];
 while(seeds.length<n){
  let candidate=null,score=-1;
  for(const cell of hall){
   const d=Math.min(...seeds.map(s=>manhattan(s,cell)));
   if(d>score){candidate=cell;score=d;}
  }
  if(!candidate||score<3)break;
  seeds.push(candidate);
 }
 return seeds;
}
export function promoteCorridors(layout,level=0,stairCells=[]){
 const hall=layout.floors.filter(c=>c.roomId===HALL);
 const zoneGrid=layout.grid.slice();
 if(!hall.length){layout.zoneGrid=zoneGrid;layout.circulationRooms=[];return layout;}
 const n=Math.min(9,Math.max(3,Math.ceil(hall.length/32)));
 const seeds=chooseSeeds(hall,n);
 const region=new Int16Array(layout.grid.length).fill(-1);
 const q=[];
 seeds.forEach((c,i)=>{const k=key(c);region[k]=i;q.push(c);});
 for(let at=0;at<q.length;at++){
  const c=q[at],id=region[key(c)];
  for(const near of adjacent(c)){
   const k=key(near);
   if(layout.grid[k]===HALL&&region[k]<0){
    region[k]=id;q.push(near);
   }
  }
 }
 const groups=Array.from({length:seeds.length},()=>[]);
 for(const cell of hall)groups[region[key(cell)]].push(cell);
 const stairSet=new Set(stairCells.map(c=>key(c)));
 const corridors=[];
 for(const cells of groups){
  if(!cells.length)continue;
  const id=layout.rooms.length+corridors.length+1;
  const cx=cells.reduce((s,c)=>s+c.x,0)/cells.length;
  const cz=cells.reduce((s,c)=>s+c.z,0)/cells.length;
  const containsStairs=cells.some(c=>stairSet.has(key(c)));
  const type=containsStairs?'landing':
    (cells.length>=21&&Math.hypot(cx,cz)<TILE*5?'lobby':'corridor');
  const room={id,type,kind:'circulation',circulation:true,
   name:ROOM_TYPES[type].name,floor:level,cells,
   x:cx,z:cz,area:cells.length*TILE*TILE,
   xMin:Math.min(...cells.map(c=>c.x-TILE/2)),
   xMax:Math.max(...cells.map(c=>c.x+TILE/2)),
   zMin:Math.min(...cells.map(c=>c.z-TILE/2)),
   zMax:Math.max(...cells.map(c=>c.z+TILE/2)),
   entry:{x:seeds[corridors.length]?.x??cx,z:seeds[corridors.length]?.z??cz},
   furnitureCount:0,placementDensity:0,accessibility:1,
   missingEssentials:[],stairAccess:containsStairs};
  corridors.push(room);
  for(const cell of cells)zoneGrid[key(cell)]=id;
 }
 // This separate array makes corridor IDs queryable like any other room ID,
 // without inventing door panels between consecutive hallway zones.
 layout.zoneGrid=zoneGrid;
 layout.circulationRooms=corridors;
 layout.rooms.push(...corridors);
 for(const tile of layout.floors)if(tile.roomId===HALL)
  tile.roomId=zoneGrid[key(tile)];
 layout.qualityReport.roomCount=layout.rooms.length;
 return layout;
}
