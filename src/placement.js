import {FURNITURE,FURNITURE_BY_ID,ROOM_TYPES,furnitureScore,LOCATION_DIMENSIONS} from './semantics.js';
import {TILE,GRID_W,GRID_H,seededRandom} from './topology.js';

// A 16D location vector and relational rules, independent of visual rendering.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const distance=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
const overlaps=(p,q,margin=0)=>Math.abs(p.x-q.x)<(p.w+q.w)/2+margin&&
 Math.abs(p.z-q.z)<(p.d+q.d)/2+margin;
const boxDistance=(x,z,p)=>{
 const px=clamp(x,p.x-p.w/2,p.x+p.w/2),pz=clamp(z,p.z-p.d/2,p.z+p.d/2);
 return Math.hypot(x-px,z-pz);
};
const dims=(a,angle)=>Math.abs(Math.sin(angle))>.5?
 {w:a.d,d:a.w}:{w:a.w,d:a.d};
const angleTowards=(p,q)=>Math.atan2(-(q.x-p.x),-(q.z-p.z));
const companion=(a)=>a.companion||(a.role==='mirror'?'sink':null);
const ideal=(a)=>({
 coffee:1.5,deskChair:.85,diningChair:1.0,ottoman:1.3,screen:2.8,
 mediaStorage:2.6,lighting:1.1,sidetable:.95,mirror:.2
})[a.role]||1.5;
function cosine(a,b){
 let dot=0,an=0,bn=0;
 for(let i=0;i<a.length;i++){dot+=a[i]*b[i];an+=a[i]*a[i];bn+=b[i]*b[i];}
 return dot/(Math.sqrt(an*bn)||1);
}
function spatialFeatures(room,a,p,others,door,layout){
 const diag=Math.hypot(room.xMax-room.xMin,room.zMax-room.zMin)||1;
 const entry=clamp(1-distance(p,door)/diag);
 const edges=[p.x-room.xMin,room.xMax-p.x,p.z-room.zMin,room.zMax-p.z];
 const near=clamp(1-Math.min(...edges)/2);
 const corner=clamp(1-(Math.min(edges[0],edges[1])+Math.min(edges[2],edges[3]))/2.6);
 const cent=clamp(1-distance(p,room)/(diag/2));
 const dir={x:room.x-door.x,z:room.z-door.z},norm=Math.hypot(dir.x,dir.z)||1;
 const side=((p.z-room.z)*dir.x-(p.x-room.x)*dir.z)/norm;
 const outside=room.cells.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{
  const gx=c.gx+dx,gz=c.gz+dz;
  return gx<0||gz<0||gx>=GRID_W||gz>=GRID_H||layout.grid[gz*GRID_W+gx]===-1;
 }));
 const daylight=outside.length?clamp(1-Math.min(...outside.map(c=>distance(c,p)))/3.5):0;
 const matches=others.filter(q=>q.role===companion(a));
 const focal=matches.length?matches.reduce((v,q)=>Math.min(v,distance(p,q)),Infinity):distance(p,room);
 const nearFocus=matches.length?clamp(1-Math.abs(focal-ideal(a))/2.5):cent*.65;
 const target=matches.length?matches.reduce((v,q)=>distance(p,q)<distance(p,v)?q:v):room;
 const v={x:target.x-p.x,z:target.z-p.z},vn=Math.hypot(v.x,v.z)||1;
 const facing=clamp((1+(-Math.sin(p.angle)*v.x-Math.cos(p.angle)*v.z)/vn)/2);
 const nearest=others.length?Math.min(...others.map(q=>distance(p,q))):3.5;
 const clearance=others.length?Math.min(...others.filter(q=>q.solid).map(q=>Math.hypot(
  Math.max(0,Math.abs(p.x-q.x)-(p.w+q.w)/2),
  Math.max(0,Math.abs(p.z-q.z)-(p.d+q.d)/2)))):2;
 return {
 perimeter:3*near,corner:3*corner,central:3*cent,entry:3*entry,
 deep:3*(1-entry),daylight:3*daylight,privacy:3*(1-entry),
 left:3*clamp(-side/3),right:3*clamp(side/3),
 focal:3*nearFocus,cluster:3*clamp(1-nearest/3),
 clearance:3*clamp(clearance/1.5),quiet:3*(1-entry),
 public:3*entry,view:3*facing,surface:0
 };
}
export function locationScore(a,room,p,others,door,layout){
 const f=spatialFeatures(room,a,p,others,door,layout);
 return cosine(a.locationVector,LOCATION_DIMENSIONS.map(key=>f[key]||0));
}
function candidatePositions(room,a,others,layout){
 const result=[],unique=new Set();
 function add(x,z,angle,kind){
  const key=[x.toFixed(2),z.toFixed(2),angle.toFixed(2)].join(':');
  if(unique.has(key))return;
  unique.add(key);
  result.push({x,z,angle,...dims(a,angle),kind});
 }
 const partners=others.filter(o=>o.role===companion(a));
 for(const parent of partners){
  for(const direction of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=parent.x+direction[0]*ideal(a),z=parent.z+direction[1]*ideal(a);
   const ang=Math.round(angleTowards({x,z},parent)/(Math.PI/2))*(Math.PI/2);
   add(x,z,ang,'group');
  }
 }
 for(const c of room.cells){
  if(a.anchor==='wall'||a.anchor==='corner'){
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=c.gx+dx,nz=c.gz+dz;
    if(nx>=0&&nz>=0&&nx<GRID_W&&nz<GRID_H&&
       layout.grid[nz*GRID_W+nx]===room.id)continue;
    const angle=dx>0?Math.PI/2:dx<0?-Math.PI/2:dz>0?0:Math.PI;
    const size=dims(a,angle);
    const depth=dx!==0?size.w:size.d,side=TILE/2-depth/2-.15;
    for(const off of [-.28,0,.28])add(
     c.x+dx*side+(dz!==0?off:0),
     c.z+dz*side+(dx!==0?off:0),angle,'wall');
   }
  }
  if(a.anchor!=='wall')for(const [ox,oz] of [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]])
   add(c.x+ox,c.z+oz,0,'center');
 }
 return result;
}
function fits(room,p,others,door,layout,rug){
 const pad=.12;
 if(p.x-p.w/2<room.xMin+pad||p.x+p.w/2>room.xMax-pad||
    p.z-p.d/2<room.zMin+pad||p.z+p.d/2>room.zMax-pad)return false;
 if(boxDistance(door.x,door.z,p)<.86||
    boxDistance(door.roomCell.x,door.roomCell.z,p)<.64)return false;
 // Corner cutouts are true physical constraints, not visual-only diagonals.
 for(const cut of layout.chamfers){
  if(cut.roomId!==room.id)continue;
  const sx=Math.sign(cut.cornerX-(cut.ax+cut.bx)/2)||1;
  const sz=Math.sign(cut.cornerZ-(cut.az+cut.bz)/2)||1;
  for(const x of [p.x-p.w/2-pad,p.x+p.w/2+pad])
   for(const z of [p.z-p.d/2-pad,p.z+p.d/2+pad]){
    const u=sx*(cut.cornerX-x),v=sz*(cut.cornerZ-z);
    if(u>=0&&v>=0&&u+v<cut.cut+.13)return false;
   }
 }
 if(rug)return !others.some(q=>q.role==='rug'&&overlaps(p,q,.18));
 return !others.some(q=>q.solid&&overlaps(p,q,.11));
}
function onSurface(room,a,others,score,mandatory){
 const parents=a.role==='computer'?others.filter(q=>q.role==='desk'):
  a.role==='kitchenTool'?others.filter(q=>q.role==='counter'||q.role==='storage'):
  a.model==='lampsquaretable'?others.filter(q=>q.role==='sidetable'):
  a.role==='mirror'?others.filter(q=>q.role==='sink'):null;
 if(!parents)return null;
 for(const parent of parents){
  const count=others.filter(q=>q.supportedBy===parent.id).length;
  if(count>=2)continue;
  if(a.role!=='mirror'&&(parent.w<a.w*.85||parent.d<a.d*.85))continue;
  const off=count===0?-.17:.17;
  return {model:a.model,x:parent.x+(Math.abs(Math.sin(parent.angle))>.5?0:off),
   z:parent.z+(Math.abs(Math.sin(parent.angle))>.5?off:0),
   w:a.w,d:a.d,modelW:a.w,modelD:a.d,
   h:a.h,angle:parent.angle,solid:false,roomId:room.id,role:a.role,
   semanticScore:+score.toFixed(3),locationScore:1,mandatory,
   y:a.role==='mirror'?1.3:parent.y+parent.h*.95,supportedBy:parent.id};
 }
 return null;
}
export function populateRooms(layout,seed=layout.seed){
 const rng=seededRandom(seed+'::interiors');
 const placed=[],obstacles=[...layout.obstacles];
 for(const room of layout.rooms){
  const type=ROOM_TYPES[room.type],door=layout.doors.find(d=>d.roomId===room.id);
  const objects=[],counts={},used=new Set();
  function add(a,mandatory=false){
   const semantic=furnitureScore(a,type,counts);
   let spec=onSurface(room,a,objects,semantic,mandatory);
   if(!spec){
    if(['computer','kitchenTool','mirror'].includes(a.role)||a.model==='lampsquaretable')
     return false;
    let best=null,bestScore=-1e8;
    for(const p of candidatePositions(room,a,objects,layout)){
     if(!fits(room,p,objects,door,layout,a.role==='rug'))continue;
     const positional=locationScore(a,room,p,objects,door,layout);
     const matches=objects.filter(q=>q.role===companion(a));
     const companionFit=matches.length?clamp(1-Math.abs(Math.min(...matches.map(q=>distance(q,p)))-ideal(a))/3):0;
     const score=3.1*positional+1.45*companionFit+
       (p.kind==='group'?.3:0)+(p.kind===a.anchor?.15:0)+rng()*.004;
     if(score>bestScore){best=p;bestScore=score;best.locationScore=positional;}
    }
    if(!best)return false;
    spec={model:a.model,x:best.x,z:best.z,w:best.w,d:best.d,
     modelW:a.w,modelD:a.d,h:a.h,angle:best.angle,
     solid:a.solid,roomId:room.id,role:a.role,
     semanticScore:+semantic.toFixed(3),locationScore:+best.locationScore.toFixed(3),
     mandatory,y:.1};
   }
   spec.id=room.id+'-'+placed.length;
   placed.push(spec);objects.push(spec);
   if(spec.solid)obstacles.push({...spec,kind:'furniture'});
   counts[a.role]=(counts[a.role]||0)+1;used.add(a.model);
   return true;
  }
  for(const model of type.required){
   const source=FURNITURE_BY_ID[model];
   let done=false;
   for(const factor of [1,.9,.8,.7,.6]){
    const a=factor===1?source:{...source,w:source.w*factor,d:source.d*factor,h:source.h*factor};
    if(add(a,true)){done=true;break;}
   }
   if(!done)(room.missingEssentials??=[]).push(model);
  }
  const target=Math.min(13,Math.max(9,Math.round(room.area/3.2)));
  const ranked=FURNITURE.map(a=>({a,score:furnitureScore(a,type,counts)}))
   .filter(o=>!used.has(o.a.model)&&o.score>1)
   .sort((a,b)=>b.score-a.score);
  for(const {a} of ranked){
   if(objects.length>=target)break;
   const max=({plant:3,lighting:3,diningChair:4,chair:3,computer:2,storage:2,decoration:2,media:2})[a.role]||1;
   if((counts[a.role]||0)>=max)continue;
   if(!add(a) && a.w>.55 && a.d>.55){
    // Secondary props may be compact, but never distort their proportions.
    for(const factor of [.84,.72]){
     if(add({...a,w:a.w*factor,d:a.d*factor,h:a.h*factor}))break;
    }
   }
  }
  // Secondary dressing layer: smaller, functional accents reduce empty corners
  // without inserting extra large pieces or violating the room's intended use.
  const smallAccents=FURNITURE
   .filter(a=>!used.has(a.model)&&
     ['plant','lighting','rug','decoration','media'].includes(a.role)&&
     furnitureScore(a,type,counts)>.36)
   .sort((a,b)=>b.role==='plant'&&a.role!=='plant'?1:
     a.role==='plant'&&b.role!=='plant'?-1:
     (a.w*a.d-b.w*b.d));
  for(const a of smallAccents){
   if(objects.length>=target)break;
   if((counts[a.role]||0)>=({plant:4,lighting:4,rug:1,decoration:2,media:2})[a.role])continue;
   if(add(a))continue;
   for(const factor of [.76,.62]){
    if(add({...a,w:a.w*factor,d:a.d*factor,h:a.h*factor}))break;
   }
  }
  room.furnitureCount=objects.length;
  room.placementDensity=+(objects.length/room.area).toFixed(2);
 }
 layout.props=placed;
 layout.obstacles=obstacles;
 return layout;
}
