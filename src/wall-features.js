// Lab 18: wall treatments are thin, deterministic panels affixed to actual
// solid masonry. No fake new collision walls, door/window obstruction or
// unreachable partitions. Generated in 2D independent of Three.js.
import {GRID_W,GRID_H,worldCell,seededRandom,TILE} from './topology.js';
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function generateWallFeatures(layout){
 const style=layout.interiorStyle;
 if(!style||style.wallFeature==='none')return [];
 const result=[];
 const rng=seededRandom(String(layout.seed)+':wallfeatures:'+style.id);
 const zone=layout.zoneGrid||layout.grid;
 for(const room of layout.rooms){
  if(room.circulation||room.type==='bath'||room.type==='utility')continue;
  const eligible=[];
  for(const wall of layout.walls){
   if(wall.kind!=='wall'||wall.height<2.9||
      Math.max(wall.w,wall.d)<TILE*.95)continue;
   const alongX=wall.w>wall.d;
   for(const side of [-1,1]){
    const normal=alongX?{x:0,z:side}:{x:side,z:0};
    const inside=worldCell(wall.x+normal.x*.24,wall.z+normal.z*.24);
    if(inside.gx<0||inside.gz<0||inside.gx>=GRID_W||inside.gz>=GRID_H||
      zone[inside.gz*GRID_W+inside.gx]!==room.id)continue;
    if(layout.doors.some(d=>near(d,wall)<1.12)||
       layout.windows?.some(w=>near(w,wall)<1.02))continue;
    eligible.push({wall,alongX,normal});
   }
  }
  // Up to three notable walls per space. Sparse styles deliberately
  // leave quiet walls free; no giant wall decals across every surface.
  const maximum=Math.min(3,Math.round((room.area/17)*
   (style.decor||1)*.78));
  if(maximum<1)continue;
  eligible.sort((a,b)=>Math.max(b.wall.w,b.wall.d)-
    Math.max(a.wall.w,a.wall.d)+rng()*.0001);
  let count=0;
  for(const e of eligible){
   if(count>=maximum)break;
   if(result.some(q=>q.roomId===room.id&&near(q,e.wall)<TILE*1.5))continue;
   const {wall,alongX,normal}=e;
   const len=Math.max(.4,Math.min(Math.max(wall.w,wall.d)*.76,1.45));
   const placement={x:wall.x+normal.x*.091,z:wall.z+normal.z*.091,
    alongX,normal,roomId:room.id,kind:style.wallFeature,
    thickness:.026,length:len};
   if(style.wallFeature==='slat'){
    const n=Math.max(5,Math.min(12,Math.floor(len/.13)));
    for(let k=0;k<n;k++){
     const offset=(k-(n-1)/2)*len/n;
     result.push({...placement,kind:'slat',
      x:placement.x+(alongX?offset:0),
      z:placement.z+(alongX?0:offset),
      w:alongX?.034:.026,d:alongX?.026:.034,
      y:1.60,h:2.55});
    }
   }else if(style.wallFeature==='industrial'){
    result.push({...placement,kind:'industrial',
      w:alongX?len:.028,d:alongX?.028:len,y:2.34,h:.085});
    result.push({...placement,kind:'industrial',
      w:alongX?len:.028,d:alongX?.028:len,y:.67,h:.085});
   }else if(style.wallFeature==='wainscot'){
    result.push({...placement,kind:'wainscot',
      w:alongX?len:.028,d:alongX?.028:len,y:.83,h:1.36});
   }else{
    // Shallow accent face on a real wall, not a collider or
    // transparent window pasted over opaque masonry.
    result.push({...placement,kind:'panel',
     w:alongX?len:.028,d:alongX?.028:len,y:1.65,h:2.55});
   }
   count++;
  }
 }
 return result;
}
export function wallFeatureReport(layout){
 const features=layout.wallFeatures||[];
 return {total:features.length,
  kinds:Object.fromEntries([...new Set(features.map(x=>x.kind))]
   .map(k=>[k,features.filter(f=>f.kind===k).length])),
  rooms:new Set(features.map(x=>x.roomId)).size};
}
