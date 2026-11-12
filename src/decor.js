// VitaeWorld dressing layer. Pure deterministic data, independent of Three.js.
// Wall anchors are checked against real furniture; tabletops use 3D volume tests
// against every furnished object and one another before being accepted.
import {TILE,GRID_W,GRID_H,worldCell,seededRandom} from './topology.js';
import {volumeOverlap} from './interior-quality.js';

const MOODS=Object.freeze([
 {name:'warm',ink:0x6d5143,paper:0xe7d4b9,accent:0xb8865e,leaf:0x64836c},
 {name:'botanical',ink:0x3e6458,paper:0xede3ce,accent:0xa8b59b,leaf:0x54775e},
 {name:'atelier',ink:0x515a74,paper:0xe6ddce,accent:0xc78976,leaf:0x6a896e},
 {name:'earth',ink:0x78564c,paper:0xf2dfc3,accent:0x9d9d75,leaf:0x6c8666},
 {name:'quiet',ink:0x556b71,paper:0xece3d6,accent:0xb7a4a0,leaf:0x6f947b}
]);
const TABLE_SURFACES=new Set(['desk','sidetable','diningTable','coffee',
 'counter','display','mediaStorage']);
const FLAT_KINDS=new Set(['tray','book-stack','plate','magazine']);
const R=(rng,values)=>values[Math.floor(rng()*values.length)];
const isInRoom=(layout,x,z,id)=>{
 const {gx,gz}=worldCell(x,z);
 return gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H&&
  (layout.zoneGrid||layout.grid)[gz*GRID_W+gx]===id;
};
function wallFaces(layout,room){
 const candidates=[];
 for(const wall of layout.walls){
  if(wall.kind!=='wall'||wall.angle||Math.max(wall.w,wall.d)<TILE*.84)continue;
  const alongX=wall.w>wall.d;
  for(const side of [-1,1]){
   const nx=alongX?0:side,nz=alongX?side:0;
   if(!isInRoom(layout,wall.x+nx*.22,wall.z+nz*.22,room.id))continue;
   if(isInRoom(layout,wall.x-nx*.22,wall.z-nz*.22,room.id))continue;
   // Door throats and turn corners stay bare.
   if(layout.doors.some(d=>Math.hypot(d.x-wall.x,d.z-wall.z)<TILE*.9))continue;
   candidates.push({x:wall.x+nx*.12,z:wall.z+nz*.12,
    angle:alongX?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2)});
  }
 }
 return candidates;
}
function kindsFor(roomType){
 if(roomType==='gallery'||roomType==='studio')return ['art','art','art','shelf','sconce'];
 if(roomType==='bath')return ['sconce','art','sconce'];
 if(roomType==='library')return ['shelf','art','shelf','art','sconce'];
 if(roomType==='kitchen')return ['shelf','sconce','art'];
 if(roomType==='suite')return ['art','art','sconce','shelf'];
 return ['art','art','shelf','sconce','art'];
}
function tabletopKinds(role,type){
 if(role==='desk')return ['book-stack','pencil-cup','succulent'];
 if(role==='sidetable')return ['book-stack','candle','succulent'];
 if(role==='diningTable')return ['vase','plate','plate'];
 if(role==='coffee')return ['tray','candle','vase'];
 if(role==='counter')return ['jar','bowl','succulent'];
 if(role==='display')return ['vase','sculpture','candle'];
 if(role==='mediaStorage')return ['book-stack','succulent'];
 return [];
}
function sizeFor(kind){
 return ({
  'book-stack':[.26,.18,.12],'pencil-cup':[.13,.13,.18],
  'succulent':[.19,.19,.24],candle:[.12,.12,.15],
  vase:[.19,.19,.31],plate:[.23,.23,.035],
  tray:[.29,.23,.045],jar:[.17,.17,.22],
  bowl:[.21,.21,.11],sculpture:[.20,.18,.26]
 })[kind]||[.18,.18,.2];
}
function shuffled(values,rng){
 const a=[...values];
 for(let i=a.length-1;i>0;i--){
  const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}
export function generateDecorations(layout,seed=layout.seed){
 const decorations=[], furniture=layout.props||[];
 const buildingRng=seededRandom(String(seed)+'::shared-interior-language');
 const commonMood=Math.floor(buildingRng()*MOODS.length);
 layout.decorLanguage=MOODS[commonMood].name;
 for(const room of layout.rooms){
  const rng=seededRandom(String(seed)+'::dressing::'+room.id);
  // Most rooms inherit the same design language; a few get subtle variations.
  // Uniformly random colour themes per room look like a showroom catalogue.
  const shift=rng()<.78?0:(rng()<.6?1:-1);
  const mood=MOODS[(commonMood+shift+MOODS.length)%MOODS.length];
  room.decorMood=mood.name;
  const walls=shuffled(wallFaces(layout,room),rng);
  const target=Math.min(5,Math.max(2,Math.round(room.area/11)));
  const accepted=[];
  for(const wall of walls){
   if(accepted.length>=target)break;
   if(accepted.some(p=>Math.hypot(p.x-wall.x,p.z-wall.z)<TILE*1.35))continue;
   const kind=R(rng,kindsFor(room.type));
   const d={id:'d-'+room.id+'-'+decorations.length,roomId:room.id,
    source:'wall',kind,x:wall.x,z:wall.z,angle:wall.angle,
    y:kind==='art'?1.91:kind==='shelf'?2.32:2.28,
    w:kind==='art'?.78:kind==='shelf'?.80:.25,
    h:kind==='art'?.65:kind==='shelf'?.42:.28,
    d:.11,mood:mood.name,color:mood.ink,paper:mood.paper,
    accent:mood.accent,leaf:mood.leaf,variant:Math.floor(rng()*5)};
   // Eye-level pictures read as a lived-in room. If a tall bookshelf is
   // directly underneath, mount above it or use a different wall segment.
   const occupied=()=>{
    const sa=Math.abs(Math.sin(d.angle)),ca=Math.abs(Math.cos(d.angle));
    const projected={...d,w:d.w*ca+d.d*sa,d:d.w*sa+d.d*ca,
     y:d.y-d.h/2};
    return furniture.some(p=>p.roomId===room.id&&volumeOverlap(projected,p,.06));
   };
   if(occupied()&&kind==='art')d.y=2.43;
   if(occupied())continue;
   decorations.push(d);accepted.push(d);
  }
  // Small lived-in details on real support surfaces. The rendering geometry
  // fits these footprints; their Y coordinates are bottom elevations.
  const roomProps=furniture.filter(p=>p.roomId===room.id);
  for(const parent of roomProps){
   if(!parent.solid||!TABLE_SURFACES.has(parent.role)||parent.h>1.35)continue;
   const recipes=shuffled(tabletopKinds(parent.role,room.type),rng);
   const maximum=parent.role==='diningTable'?3:parent.w>1.15?2:1;
   let count=0;
   const positions=shuffled([[0,0],[-.42,0],[.42,0],[0,-.45],[0,.45],
     [-.42,-.36],[.42,.36],[-.42,.36],[.42,-.36]],rng);
   for(const kind of recipes){
    if(count>=maximum)break;
    const [w,d,h]=sizeFor(kind);
    for(const [u,v] of positions){
     const x=parent.x+u*parent.w,z=parent.z+v*parent.d;
     if(Math.abs(x-parent.x)+w/2>parent.w/2-.055 ||
        Math.abs(z-parent.z)+d/2>parent.d/2-.055)continue;
     const item={id:'d-'+room.id+'-'+decorations.length,
      roomId:room.id,source:'surface',kind,x,z,angle:0,
      y:parent.y+parent.h+.018,w,d,h,supportedBy:parent.id,
      mood:mood.name,color:mood.ink,paper:mood.paper,
      accent:mood.accent,leaf:mood.leaf,variant:Math.floor(rng()*5)};
     if(furniture.some(p=>p.id!==parent.id&&volumeOverlap(item,p,.015)))continue;
     if(decorations.some(p=>p.source==='surface'&&volumeOverlap(item,p,.05)))continue;
     decorations.push(item);count++;break;
    }
   }
  }
  if(room.circulation){
   // Rugs are floor-level accents only. Keep stair shafts, doors and
   // intersections clear, and never introduce physical hallway colliders.
   const candidates=shuffled(room.cells,rng).filter(c=>
    !layout.stairReservation?.has(c.gz*GRID_W+c.gx)&&
    layout.doors.every(d=>Math.hypot(c.x-d.x,c.z-d.z)>TILE*1.45));
   const max=Math.min(3,Math.floor(candidates.length/9));
   const accepted=[];
   for(const c of candidates){
    if(accepted.length>=max)break;
    if(accepted.some(q=>Math.hypot(q.x-c.x,q.z-c.z)<TILE*2.1))continue;
    const kind='runner';
    const isLongX=[[-1,0],[1,0]].every(([dx,dz])=>{
     const gx=c.gx+dx,gz=c.gz+dz;
     return gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H&&
      layout.grid[gz*GRID_W+gx]===0;
    });
    const spec={id:'d-'+room.id+'-'+decorations.length,
     roomId:room.id,source:'floor',kind,x:c.x,z:c.z,y:.105,
     w:isLongX?TILE*.82:TILE*.58,
     d:isLongX?TILE*.58:TILE*.82,h:.018,
     angle:0,mood:mood.name,color:mood.ink,paper:mood.paper,
     accent:mood.accent,leaf:mood.leaf,variant:Math.floor(rng()*5)};
    decorations.push(spec);accepted.push(spec);
   }
  }
  room.decorationCount=decorations.filter(p=>p.roomId===room.id).length;
 }
 return decorations;
}
