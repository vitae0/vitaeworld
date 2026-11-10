import {ROOM_TYPES,ROOM_NAMES,ROOM_THEMES,FURNITURE,FURNITURE_BY_ID,furnitureScore} from './semantics.js';

// Pure geometry + semantics. The renderer never chooses a room or an item position.
export {ROOM_NAMES,ROOM_THEMES};
export const TILE=2.0, GRID_W=21, GRID_H=15, WALL_HEIGHT=3.35;
const DOOR_WIDTH=1.58;
const HALL=0, OUTSIDE=-1;
const dirs=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function seededRandom(seed) {
 let state=2166136261;
 for(const ch of String(seed)){state^=ch.charCodeAt(0);state=Math.imul(state,16777619);}
 return ()=>{state+=0x6d2b79f5;let t=state;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
const shuffled=(arr,rng)=>{
 const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
};
const gridIndex=(gx,gz)=>gz*GRID_W+gx;
const inside=(gx,gz)=>gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H;
export const cellWorld=(gx,gz)=>({
 x:(gx-(GRID_W-1)/2)*TILE,z:(gz-(GRID_H-1)/2)*TILE
});
export const worldCell=(x,z)=>({
 gx:Math.floor(x/TILE+GRID_W/2),
 gz:Math.floor(z/TILE+GRID_H/2)
});
const edgeKey=(gx,gz,dx,dz)=>{
 const nx=gx+dx,nz=gz+dz;
 const p=gridIndex(gx,gz),q=gridIndex(nx,nz);
 return p<q?p+':'+q:q+':'+p;
};
function rectNear(a,b,margin=0) {
 return Math.abs(a.x-b.x)<(a.w+b.w)/2+margin &&
        Math.abs(a.z-b.z)<(a.d+b.d)/2+margin;
}
function pointBoxDistance(x,z,r){
 const cx=clamp(x,r.x-r.w/2,r.x+r.w/2);
 const cz=clamp(z,r.z-r.d/2,r.z+r.d/2);
 return Math.hypot(x-cx,z-cz);
}
export function isWalkable(layout,x,z,radius=.31) {
 const {gx,gz}=worldCell(x,z);
 if (!inside(gx,gz) || layout.grid[gridIndex(gx,gz)]===OUTSIDE) return false;
 return !layout.obstacles.some(o=>pointBoxDistance(x,z,o)<radius);
}
function outline(layout){
 const result=[],keys=new Set(layout.doors.map(d=>d.edgeKey));
 function wall(x,z,w,d,height=WALL_HEIGHT,y=0.1+height/2,kind='wall'){
   result.push({x,z,w,d,height,y,kind});
 }
 for(let gz=0;gz<GRID_H;gz++)for(let gx=0;gx<GRID_W;gx++){
   const cell=layout.grid[gridIndex(gx,gz)];
   if(cell===OUTSIDE)continue;
   const c=cellWorld(gx,gz);
   for(const {dx,dz} of dirs){
     const nx=gx+dx,nz=gz+dz;
     const neighbor=inside(nx,nz)?layout.grid[gridIndex(nx,nz)]:OUTSIDE;
     if(neighbor===cell || (neighbor!==OUTSIDE && cell>neighbor))continue;
     const x=c.x+dx*TILE/2,z=c.z+dz*TILE/2;
     const alongX=dz!==0,thickness=.16;
     const key=edgeKey(gx,gz,dx,dz);
     if(keys.has(key)){
       const rem=(TILE-DOOR_WIDTH)/2;
       const tangent={x:Math.abs(dz),z:Math.abs(dx)};
       for(const sign of [-1,1]){
         const offset=sign*(DOOR_WIDTH/2+rem/2);
         wall(x+tangent.x*offset,z+tangent.z*offset,
           alongX?rem:thickness,alongX?thickness:rem);
       }
       const headerH=.42;
       wall(x,z,alongX?TILE:thickness,alongX?thickness:TILE,
         headerH,0.1+WALL_HEIGHT-headerH/2,'lintel');
     }else{
       wall(x,z,alongX?TILE:thickness,alongX?thickness:TILE);
     }
   }
 }
 return result;
}
function initialGrid(rng) {
 const grid=new Array(GRID_W*GRID_H).fill(OUTSIDE);
 const mids=[];
 const direction=rng()<.5?-1:1;
 const phase=rng()*1.6;
 for(let x=0;x<GRID_W;x++){
   const wave=Math.round(1.6*Math.sin(x*.38+phase)) * direction;
   mids[x]=clamp(7+wave,5,9);
 }
 // Two-tile-wide serpentine passage, widened at bends and at a shared social bay.
 const hallCells=new Set();
 const hallAt=(gx,gz)=>{if(inside(gx,gz)){grid[gridIndex(gx,gz)]=HALL;hallCells.add(gridIndex(gx,gz));}};
 for(let x=0;x<GRID_W;x++){
   const low=Math.min(mids[x],mids[Math.max(0,x-1)]);
   const high=Math.max(mids[x],mids[Math.max(0,x-1)]);
   for(let z=low-1;z<=high;z++)hallAt(x,z);
 }
 const hubX=9+Math.floor(rng()*3);
 for(let x=hubX-1;x<=hubX+1;x++){
   hallAt(x,mids[x]-2);hallAt(x,mids[x]+1);
 }
 // Orthogonal spurs make T-junctions, niches and asymmetrical room entrances.
 for(const [x,towardsNorth] of [[6,true],[14,false]]){
   if(towardsNorth)for(let z=2;z<=mids[x];z++)hallAt(x,z);
   else for(let z=mids[x]-1;z<=GRID_H-3;z++)hallAt(x,z);
 }
 // Keep the room partitions on either side of the two corridor spurs.
 // Jagged interior footprint comes from the meandering hall and outer facades.
 // Offsetting these cuts past a spur can isolate a room into two unconnected islands.
 const b1=new Array(GRID_H).fill(6),b2=new Array(GRID_H).fill(14);
 const northMargin=Array.from({length:GRID_W},(_,x)=>
   clamp(Math.round(.85+.92*Math.sin(x*.52+phase*1.7)+.3*Math.sin(x*1.9)),0,2));
 const southMargin=Array.from({length:GRID_W},(_,x)=>
   clamp(Math.round(.85+.95*Math.cos(x*.49+phase)),0,2));
 for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++){
   const i=gridIndex(x,z);
   if(hallCells.has(i))continue;
   const hallMid=mids[x];
   let side;
   if(z<hallMid-1)side=0;
   else if(z>hallMid)side=1;
   else continue;
   if(side===0&&z<northMargin[x])continue;
   if(side===1&&z>GRID_H-1-southMargin[x])continue;
   const segment=x<b1[z]?0:x<b2[z]?1:2;
   grid[i]=1+side*3+segment;
 }
 // Punch a small outdoor inset into one room, only if its interior remains connected.
 const holeRoom=1+Math.floor(rng()*6);
 const eligible=[];
 for(let z=2;z<GRID_H-2;z++)for(let x=2;x<GRID_W-2;x++){
   const i=gridIndex(x,z);
   if(grid[i]!==holeRoom)continue;
   if(dirs.every(d=>grid[gridIndex(x+d.dx,z+d.dz)]===holeRoom))eligible.push(i);
 }
 if(eligible.length){
   const i=eligible[Math.floor(rng()*eligible.length)];
   grid[i]=OUTSIDE; // tiny skylight courtyard / architectural void.
   if(!isRoomConnected(grid,holeRoom))grid[i]=holeRoom;
 }
 return {grid,mids};
}
function isRoomConnected(grid,id) {
 const cells=[];
 for(let i=0;i<grid.length;i++)if(grid[i]===id)cells.push(i);
 if(!cells.length)return false;
 const pending=[cells[0]],visited=new Set(pending);
 while(pending.length){
   const i=pending.pop(),x=i%GRID_W,z=Math.floor(i/GRID_W);
   for(const {dx,dz} of dirs){
     const nx=x+dx,nz=z+dz;if(!inside(nx,nz))continue;
     const j=gridIndex(nx,nz);
     if(grid[j]===id&&!visited.has(j)){visited.add(j);pending.push(j);}
   }
 }
 return visited.size===cells.length;
}
function roomInfo(grid,rng) {
 const names=shuffled(Object.keys(ROOM_TYPES),rng).slice(0,6);
 const rooms=[];
 for(let id=1;id<=6;id++){
   const cells=[];
   for(let z=0;z<GRID_H;z++)for(let x=0;x<GRID_W;x++)
     if(grid[gridIndex(x,z)]===id)cells.push({gx:x,gz:z,...cellWorld(x,z)});
   if(cells.length<7||!isRoomConnected(grid,id))return null;
   const x=cells.reduce((s,c)=>s+c.x,0)/cells.length,
         z=cells.reduce((s,c)=>s+c.z,0)/cells.length;
   const type=names[id-1];
   rooms.push({id,type,kind:type,name:ROOM_TYPES[type].name,side:id<=3?'north':'south',
     x,z,xMin:Math.min(...cells.map(c=>c.x-TILE/2)),
     xMax:Math.max(...cells.map(c=>c.x+TILE/2)),
     zMin:Math.min(...cells.map(c=>c.z-TILE/2)),
     zMax:Math.max(...cells.map(c=>c.z+TILE/2)),
     cells,area:cells.length*TILE*TILE});
 }
 return rooms;
}
function chooseDoors(grid,rooms,rng){
 const doors=[];
 for(const room of rooms){
   const candidates=[];
   for(const c of room.cells){
     for(const {dx,dz} of dirs){
       const nx=c.gx+dx,nz=c.gz+dz;
       if(!inside(nx,nz)||grid[gridIndex(nx,nz)]!==HALL)continue;
       const sameNeighbors=dirs.filter(d=>{
         const a=c.gx+d.dx,b=c.gz+d.dz;
         return inside(a,b)&&grid[gridIndex(a,b)]===room.id;
       }).length;
       const t=cellWorld(c.gx,c.gz);
       const location={x:t.x+dx*TILE/2,z:t.z+dz*TILE/2};
       const approxDistance=Math.hypot((c.x-room.x)*.5,(c.z-room.z)*.3);
       const score=(sameNeighbors>=2?1.8:0)+(dz!==0?.45:0)-
         approxDistance*.12 + rng()*.07;
       candidates.push({...location,roomId:room.id,roomCell:{x:c.x,z:c.z},
         hallCell:cellWorld(nx,nz),edgeKey:edgeKey(c.gx,c.gz,dx,dz),
         axis:dz!==0?'x':'z',dx,dz,score,side:room.side});
     }
   }
   candidates.sort((a,b)=>b.score-a.score);
   if(!candidates.length)return null;
   doors.push(candidates[0]);
 }
 return doors;
}
function placeFurniture(layout,rng) {
 const placed=[],obstacles=[...layout.walls.filter(w=>w.kind==='wall').map(w=>({
   x:w.x,z:w.z,w:w.w,d:w.d,kind:'wall'
 }))];
 // Model footprint collision dimensions include 90-degree rotation.
 const actualDims=(a,angle)=>{
   const quarter=Math.abs(Math.sin(angle))>.5;
   return {w:quarter?a.d:a.w,d:quarter?a.w:a.d};
 };
 function footprintAllowed(room,x,z,w,d,includeDoor=true){
   // Dense footprint sampling rejects any part intruding into a corridor,
   // missing cell or neighbouring room; AABBs are buffered by 19cm.
   for(let sx=-w/2-.19;sx<=w/2+.20;sx+=.42){
     for(let sz=-d/2-.19;sz<=d/2+.20;sz+=.42){
       const {gx,gz}=worldCell(x+sx,z+sz);
       if(!inside(gx,gz)||layout.grid[gridIndex(gx,gz)]!==room.id)return false;
     }
   }
   // Ensure the exact last corners are checked, even for non-multiple dimensions.
   for(const sx of [-w/2-.19,w/2+.19])
     for(const sz of [-d/2-.19,d/2+.19]){
       const {gx,gz}=worldCell(x+sx,z+sz);
       if(!inside(gx,gz)||layout.grid[gridIndex(gx,gz)]!==room.id)return false;
     }
   if(includeDoor){
     const d0=layout.doors.find(d=>d.roomId===room.id);
     if(d0){
       const entry={x:d0.roomCell.x,z:d0.roomCell.z};
       if(pointBoxDistance(d0.x,d0.z,{x,z,w,d})<1.22 ||
          pointBoxDistance(entry.x,entry.z,{x,z,w,d})<.85) return false;
     }
   }
   return true;
 }
 function generatePositions(room,a){
   const positions=[];
   const aim=a.anchor;
   // Wall furniture is wall-aligned, never rolled into arbitrary room centres.
   if(aim==='wall'||aim==='corner'){
     for(const c of room.cells)for(const {dx,dz} of dirs){
       const nx=c.gx+dx,nz=c.gz+dz;
       if(inside(nx,nz)&&layout.grid[gridIndex(nx,nz)]===room.id)continue;
       const angle=dx>0?Math.PI/2:dx<0?-Math.PI/2:dz>0?Math.PI:0;
       const sz=actualDims(a,angle);
       const outward=dz!==0?sz.d:sz.w;
       const near=TILE/2-outward/2-.28;
       for(const delta of [-.38,0,.38]){
         const x=c.x+dx*near+(dz!==0?delta:0);
         const z=c.z+dz*near+(dx!==0?delta:0);
         positions.push({x,z,angle,...sz,kind:aim});
       }
     }
   }
   if(aim!=='wall'){
     for(const c of room.cells){
       for(const off of [[0,0],[.37,0],[-.37,0],[0,.37],[0,-.37]]){
         positions.push({x:c.x+off[0],z:c.z+off[1],angle:0,...actualDims(a,0),kind:'center'});
       }
     }
   }
   return positions;
 }
 function placementScore(room,a,p,siblings){
   const nearest= siblings.reduce((m,q)=>Math.min(m,Math.hypot(p.x-q.x,p.z-q.z)),20);
   let score=(p.kind===a.anchor?.45:0)+Math.min(2,nearest)*.16;
   if(a.anchor==='center')score-=Math.hypot(p.x-room.x,p.z-room.z)*.065;
   if(a.companion){
     const matches=siblings.filter(q=>q.role===a.companion);
     if(matches.length){
       const dist=Math.min(...matches.map(q=>Math.hypot(p.x-q.x,p.z-q.z)));
       const ideal=a.role==='coffee'?1.9:a.role==='diningChair'?1.55:
         a.role==='deskChair'?1.0:a.role==='screen'?2.3:1.2;
       score-=Math.abs(dist-ideal)*.45;
     }else score-=.4;
   }
   return score+rng()*.018;
 }
 function add(room,a,semanticScore,mandatory=false){
   const siblings=placed.filter(p=>p.roomId===room.id);
   // Small objects with a clear support relationship are placed ON the parent mesh.
   // The parent's footprint, not an unrelated random floor location, determines x/z.
   const supports=a.role==='computer'?
     siblings.filter(p=>p.role==='desk'):
     a.role==='kitchenTool'?siblings.filter(p=>p.role==='counter'||p.role==='storage'):
     a.model==='lampsquaretable'?siblings.filter(p=>p.role==='sidetable'):[];
   const surface=supports.find(p=>p.w>a.w*.9&&p.d>a.d*.9);
   if(surface){
     placed.push({id:room.id+'-'+placed.length,model:a.model,
       x:surface.x,z:surface.z,w:a.w,d:a.d,modelW:a.w,modelD:a.d,
       h:a.h,angle:surface.angle,solid:false,roomId:room.id,role:a.role,
       semanticScore:+semanticScore.toFixed(3),
       y:surface.y+surface.h*.96,mandatory,supportedBy:surface.id});
     return true;
   }
   // An unsupported computer/coffee-maker would float, so omit it.
   if(a.role==='computer'||a.role==='kitchenTool'||a.model==='lampsquaretable')return false;
   let best=null,bestScore=-Infinity;
   for(const p of generatePositions(room,a)){
     if(!footprintAllowed(room,p.x,p.z,p.w,p.d))continue;
     const isRug=a.role==='rug';
     if(!isRug && siblings.some(q=>q.role!=='rug'&&rectNear({...p},q,.19)))continue;
     if(!isRug && obstacles.some(o=>rectNear(p,o,.17)))continue;
     if(isRug && siblings.some(q=>q.role==='rug'&&rectNear(p,q,.4)))continue;
     const score=placementScore(room,a,p,siblings);
     if(score>bestScore){best=p;bestScore=score;}
   }
   if(!best)return false;
   const floatingRole=a.role==='computer'||a.role==='kitchenTool'||a.role==='mirror';
   const y=floatingRole?(a.role==='mirror'?1.08:0.86):0.1;
   const spec={id:room.id+'-'+placed.length,model:a.model,x:best.x,z:best.z,
     w:best.w,d:best.d,modelW:a.w,modelD:a.d,h:a.h,angle:best.angle,solid:a.solid,
     roomId:room.id,role:a.role,semanticScore:+semanticScore.toFixed(3),y,
     mandatory};
   placed.push(spec);
   if(spec.solid)obstacles.push({...spec,kind:'furniture'});
   return true;
 }
 for(const room of layout.rooms){
   const definition=ROOM_TYPES[room.type];
   const counts={};const used=new Set();
   const success=()=>placed.filter(p=>p.roomId===room.id);
   for(const model of definition.required){
     const item=FURNITURE_BY_ID[model];
     const score=furnitureScore(item,definition,counts);
     // Keep a room's essential functional objects; compact them if space is tight.
     // The visual GLB and its reserved footprint shrink together.
     const fitted=[1,.85,.7].some(scale=>{
       const adjusted=scale===1?item:{...item,w:item.w*scale,d:item.d*scale};
       return add(room,adjusted,score,true);
     });
     if(fitted){used.add(model);counts[item.role]=(counts[item.role]||0)+1;}
   }
   const candidates=FURNITURE.map(a=>({a,score:furnitureScore(a,definition,counts)}))
     .filter(({a,score})=>!used.has(a.model)&&score>1.12)
     .sort((a,b)=>b.score-a.score);
   for(const {a} of candidates){
     if(success().length>=definition.capacity)break;
     const score=furnitureScore(a,definition,counts);
     if(score<1.07||counts[a.role]>=2)continue;
     if(add(room,a,score)){
       used.add(a.model);counts[a.role]=(counts[a.role]||0)+1;
     }
   }
 }
 layout.props=placed;
 layout.obstacles=obstacles;
}
export function generateLayout(seed='vitae-001'){
 const rng=seededRandom(seed);
 let grid,rooms,doors,mids;
 for(let attempt=0;attempt<16;attempt++){
   ({grid,mids}=initialGrid(rng));
   rooms=roomInfo(grid,rng);
   if(!rooms)continue;
   doors=chooseDoors(grid,rooms,rng);
   if(doors)break;
 }
 if(!rooms||!doors)throw Error('Failed to generate connected building for seed: '+seed);
 const floors=[];
 for(let gz=0;gz<GRID_H;gz++)for(let gx=0;gx<GRID_W;gx++){
   const roomId=grid[gridIndex(gx,gz)];
   if(roomId!==OUTSIDE)floors.push({...cellWorld(gx,gz),gx,gz,roomId});
 }
 const hallCells=floors.filter(c=>c.roomId===HALL);
 const spawn=hallCells.reduce((best,c)=>!best||Math.hypot(c.x,c.z)<Math.hypot(best.x,best.z)?c:best,null);
 const layout={seed:String(seed),grid,rooms,doors,floors,props:[],walls:[],
   obstacles:[],tile:TILE,mids,spawn:{x:spawn.x,z:spawn.z},
   bounds:{minX:-GRID_W*TILE/2,maxX:GRID_W*TILE/2,
     minZ:-GRID_H*TILE/2,maxZ:GRID_H*TILE/2},geometryVersion:2};
 layout.walls=outline(layout);
 placeFurniture(layout,rng);
 return layout;
}
