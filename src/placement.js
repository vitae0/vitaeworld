import {FURNITURE,FURNITURE_BY_ID,ROOM_TYPES,furnitureScore,LOCATION_DIMENSIONS} from './semantics.js';
import {TILE,GRID_W,GRID_H,seededRandom,worldCell} from './topology.js';
import {CARDINAL_YAWS,DIRECTIONAL_ROLES,cardinalToward,facingScore} from './orientation.js';
import {footprintOverlap,volumeOverlap,roomAccessibility,collisionPairs} from './interior-quality.js';


// Room identity constrains optional furnishing. Shared traits such as "modern"
// must not turn a bathroom into an electronics showroom.
const ROOM_ROLE_ALLOW=Object.freeze({
 utility:new Set('storage plant lighting decoration rug'.split(' ')),
 suite:new Set('bed sidetable lighting storage chair plant rug decoration bench'.split(' ')),
 lounge:new Set('sofa coffee chair screen mediaStorage media lighting plant rug decoration ottoman storage'.split(' ')),
 studio:new Set('desk deskChair computer storage display lighting plant decoration chair rug'.split(' ')),
 office:new Set('desk deskChair computer storage lighting plant decoration bench rug'.split(' ')),
 kitchen:new Set('coldStorage cooking sink kitchenTool counter diningTable diningChair storage lighting plant'.split(' ')),
 bath:new Set('bath toilet sink mirror shower storage lighting plant'.split(' ')),
 library:new Set('storage display chair lighting plant rug decoration desk bench'.split(' ')),
 gallery:new Set('display decoration lighting plant chair bench rug storage'.split(' ')),
 games:new Set('sofa screen media chair coffee ottoman rug lighting plant storage'.split(' ')),
 wellness:new Set('rug chair plant lighting bench ottoman decoration storage'.split(' ')),
 dining:new Set('diningTable diningChair lighting storage plant decoration bench rug'.split(' '))
});
const SURFACE_ONLY=new Set(['lampsquaretable','lamproundtable','computerscreen',
 'laptop','computerkeyboard','kitchencoffeemachine','bathroommirror',
 'books','radio','speakersmall']);

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
   const ang=cardinalToward({x,z},parent);
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
  if(a.anchor!=='wall')for(const [ox,oz] of [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]]){
   // Every central directional object can face all four sides. Previously they
   // were stuck at yaw=0 and often faced away from their real furniture partner.
   for(const yaw of (DIRECTIONAL_ROLES.has(a.role)?CARDINAL_YAWS:[0]))
    add(c.x+ox,c.z+oz,yaw,'center');
  }
 }
 return result;
}
function fits(room,p,others,door,layout,rug){
 const pad=.12;
 if(p.x-p.w/2<room.xMin+pad||p.x+p.w/2>room.xMax-pad||
    p.z-p.d/2<room.zMin+pad||p.z+p.d/2>room.zMax-pad)return false;
 // A room's bounding box is not its actual footprint in branched/atrium plans.
 // Check the whole candidate AABB against its ownership grid, including corners.
 const minX=p.x-p.w/2-pad,maxX=p.x+p.w/2+pad;
 const minZ=p.z-p.d/2-pad,maxZ=p.z+p.d/2+pad;
 const check=(x,z)=>{
  const cell=worldCell(x,z);
  return cell.gx>=0&&cell.gz>=0&&cell.gx<GRID_W&&cell.gz<GRID_H&&
    layout.grid[cell.gz*GRID_W+cell.gx]===room.id;
 };
 for(let x=minX;x<maxX;x+=TILE*.24)
  for(let z=minZ;z<maxZ;z+=TILE*.24)
   if(!check(x,z))return false;
 for(const x of [minX,maxX])for(const z of [minZ,maxZ])
  if(!check(x,z))return false;
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
 if(rug)return !others.some(q=>q.role==='rug'&&footprintOverlap(p,q,.18));
 // A decorative model is still a physical mesh. Non-solid objects cannot
 // float inside a sofa simply because they are not movement obstacles.
 return !others.some(q=>q.role!=='rug'&&!q.supportedBy&&footprintOverlap(p,q,.10));
}
function onSurface(room,a,others,score,mandatory,layout){
 let parents=[];
 if(a.role==='computer')parents=others.filter(p=>p.role==='desk');
 else if(a.role==='kitchenTool')parents=others.filter(p=>
   p.role==='counter'||(p.role==='storage'&&p.model.startsWith('kitchen')));
 else if(a.role==='mirror')parents=others.filter(p=>p.role==='sink');
 else if(['lampsquaretable','lamproundtable'].includes(a.model))
   parents=others.filter(p=>p.role==='sidetable'||p.role==='desk'||p.role==='display');
 else if(['books','radio','speakersmall'].includes(a.model))
   parents=others.filter(p=>['desk','sidetable','storage','display','mediaStorage'].includes(p.role));
 if(!parents.length)return null;
 for(const parent of parents){
  const count=others.filter(q=>q.supportedBy===parent.id).length;
  if(count>=2)continue;
  const worldSize=dims(a,parent.angle);
  // Model coordinates and collision bounds must rotate together.
  if(parent.w<worldSize.w+.08||parent.d<worldSize.d+.08)continue;
  for(const offset of (a.role==='mirror'?[0]:[count===0?-.25:.25,0])){
   const sideX=Math.cos(parent.angle),sideZ=-Math.sin(parent.angle);
   const backX=Math.sin(parent.angle),backZ=Math.cos(parent.angle);
   const back=a.role==='mirror'?(parent.modelD-a.d)/2:0;
   const x=parent.x+sideX*offset+backX*back;
   const z=parent.z+sideZ*offset+backZ*back;
   const spec={model:a.model,x,z,...worldSize,modelW:a.w,modelD:a.d,
    h:a.h,angle:parent.angle,solid:false,roomId:room.id,role:a.role,
    semanticScore:+score.toFixed(3),locationScore:1,mandatory,
    y:parent.y+parent.h+(a.role==='mirror'?.20:.018),
    supportedBy:parent.id};
   // No floating decorations, no intersecting tabletop objects, no
   // support footprint overhang and no bleeding into adjacent rooms.
   const corners=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sz])=>
    worldCell(x+sx*worldSize.w/2,z+sz*worldSize.d/2));
   if(corners.some(c=>c.gx<0||c.gx>=GRID_W||c.gz<0||c.gz>=GRID_H||
     layout.grid[c.gz*GRID_W+c.gx]!==room.id))continue;
   if(Math.abs(x-parent.x)+worldSize.w/2>parent.w/2-.015||
      Math.abs(z-parent.z)+worldSize.d/2>parent.d/2-.015)continue;
   if(!footprintOverlap(spec,parent))continue;
   if(others.some(q=>volumeOverlap(spec,q,.015)))continue;
   return spec;
  }
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
   let spec=onSurface(room,a,objects,semantic,mandatory,layout);
   if(!spec){
    if(SURFACE_ONLY.has(a.model))
     return false;
    const candidates=[];
    for(const p of candidatePositions(room,a,objects,layout)){
     if(!fits(room,p,objects,door,layout,a.role==='rug'))continue;
     const positional=locationScore(a,room,p,objects,door,layout);
     const matches=objects.filter(q=>q.role===companion(a));
     const companionFit=matches.length?clamp(1-Math.abs(Math.min(...matches.map(q=>distance(q,p)))-ideal(a))/3):0;
     const focus=matches.length?
       matches.reduce((best,q)=>distance(q,p)<distance(best,p)?q:best):room;
     // Favor intentional sight-lines. Desks should face their chair where possible,
     // seating should face a table or the room centre, TVs face their sofas, etc.
     const target=focus;
     const directional=DIRECTIONAL_ROLES.has(a.role);
     const face=directional?facingScore(p.angle,p,target):.5;
     const width=room.xMax-room.xMin,depth=room.zMax-room.zMin;
     // In a long, narrow lounge the sofa and TV belong on the short end
     // walls, facing down the length. A cross-room arrangement can otherwise
     // form an impenetrable furniture barricade even with perfect AABBs.
     const longLounge=(room.type==='lounge'||room.type==='games')&&
       (a.role==='sofa'||a.role==='screen')&&p.kind==='wall';
     const endWall=width<depth*.78?Math.abs(Math.sin(p.angle))<.5:
       depth<width*.78?Math.abs(Math.sin(p.angle))>.5:false;
     const rectangularity=room.area/(width*depth);
     // Workstations in hooked/L-shaped rooms must sit at the end of a wing,
     // not in the narrow connector to another part of the room.
     const workEnd=(a.role==='desk'&&rectangularity<.65)?
       1.2*distance(p,door):0;
     // A glass display table at the centre of a narrow gallery partitions
     // the entire room. Keep showcases at the far end instead of the choke.
     const narrowGallery=room.type==='gallery'&&a.role==='display'&&
       Math.min(width,depth)<TILE*2.3&&Math.max(width,depth)>TILE*4;
     const farEnd=width<depth?
       (door.z>room.z?room.zMin+TILE/2:room.zMax-TILE/2):
       (door.x>room.x?room.xMin+TILE/2:room.xMax-TILE/2);
     const galleryEnd=narrowGallery?
       -3.0*Math.abs((width<depth?p.z:p.x)-farEnd):0;
     const architectural=(longLounge?(endWall?5.2:-1.0):0)+workEnd+galleryEnd;
     const score=3.1*positional+1.45*companionFit+
       (directional?.95*face:0)+architectural+
       (p.kind==='group'?.3:0)+(p.kind===a.anchor?.15:0)+rng()*.004;
     candidates.push({p,score,locationScore:positional});
    }
    if(!candidates.length)return false;
    candidates.sort((a,b)=>b.score-a.score);
    // Evaluate a spatially diverse shortlist, not just many nearly-identical
    // 25cm offsets around one attractive but impassable furniture position.
    const shortlist=[];
    for(const item of candidates){
     if(shortlist.some(q=>distance(item.p,q.p)<.56))continue;
     shortlist.push(item);
     if(shortlist.length>= (mandatory?7:4))break;
    }
    let chosen=shortlist[0];
    if(a.solid){
     const baseline=roomAccessibility(layout,room,objects,{resolution:2,radius:.21});
     let navBest=-Infinity;
     for(const item of shortlist){
      const nav=roomAccessibility(layout,room,
       [...objects,{...item.p,roomId:room.id,solid:true}],
       {resolution:2,radius:.21});
      const adjusted=item.score*.25+nav.ratio*5-(nav.doorOpen?0:5);
      const floor=Math.min(.84,Math.max(.70,baseline.ratio-.05));
      if(!mandatory && (!nav.doorOpen||nav.ratio<floor))continue;
      if(adjusted>navBest){navBest=adjusted;chosen=item;}
     }
     if(!mandatory && navBest===-Infinity)return false;
    }
    const best={...chosen.p,locationScore:chosen.locationScore};
    spec={model:a.model,x:best.x,z:best.z,w:best.w,d:best.d,
     modelW:a.w,modelD:a.d,h:a.h,angle:best.angle,
     solid:a.solid,roomId:room.id,role:a.role,
     semanticScore:+semantic.toFixed(3),locationScore:+best.locationScore.toFixed(3),
     mandatory,y:.1,faceTarget:objects.find(q=>q.role===companion(a))?.id??null};
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
  const target=room.type==='utility'?3:Math.min(13,Math.max(9,Math.round(room.area/3.2)));
  const allowed=ROOM_ROLE_ALLOW[room.type];
  const ranked=FURNITURE.map(a=>({a,score:furnitureScore(a,type,counts)}))
   .filter(o=>allowed.has(o.a.role)&&!used.has(o.a.model)&&o.score>1)
   .sort((a,b)=>b.score-a.score);
  for(const {a} of ranked){
   if(objects.length>=target)break;
   const max=({plant:3,lighting:3,diningChair:4,chair:3,computer:2,storage:2,decoration:2,media:2,bed:1,sofa:2,screen:1,desk:1,diningTable:1,bath:1,toilet:1})[a.role]||1;
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
   .filter(a=>allowed.has(a.role)&&!used.has(a.model)&&
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
  // Remove only optional floor pieces if they sever the usable room into
  // isolated pockets. Required furniture never disappears during repair.
  let access=roomAccessibility(layout,room,objects);
  while((!access.doorOpen||access.ratio<.82) &&
        objects.some(p=>!p.mandatory&&p.solid)){
   const index=objects.findLastIndex(p=>!p.mandatory&&p.solid);
   const removed=objects.splice(index,1)[0];removed._removed=true;
   for(let i=objects.length-1;i>=0;i--)
    if(objects[i].supportedBy===removed.id){objects[i]._removed=true;objects.splice(i,1);}
   access=roomAccessibility(layout,room,objects);
  }
  // Small low-profile rugs make sparse rooms feel dressed without narrowing
  // an already tight circulation route.
  if(objects.length<4 && allowed.has('rug')){
   for(const rug of FURNITURE.filter(p=>p.role==='rug')){
    if(objects.length>=4)break;
    if(!objects.some(p=>p.role==='rug'))add(rug);
   }
   access=roomAccessibility(layout,room,objects);
  }
  room.accessibility=+access.ratio.toFixed(3);
  room.furnitureCount=objects.length;
  room.placementDensity=+(objects.length/room.area).toFixed(2);
 }
 // Rebuild from the repaired room collections. No stale obstacles or props
 // may survive a later removal.
 layout.props=placed.filter(p=>!p._removed);
 layout.obstacles=[...layout.obstacles.filter(o=>o.kind!=='furniture'),
   ...layout.props.filter(p=>p.solid).map(p=>({...p,kind:'furniture'}))];
 layout.qualityReport={collisions:collisionPairs(layout.props),
   accessibleRooms:layout.rooms.filter(r=>r.accessibility>=.82).length,
   roomCount:layout.rooms.length};
 return layout;
}
