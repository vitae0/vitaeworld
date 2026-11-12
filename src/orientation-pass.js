// Post-placement orientation correction never moves a model or sacrifices
// collision clearance just to improve its companion-facing direction.
import {GRID_W,GRID_H,worldCell} from './topology.js';
import {CARDINAL_YAWS,facingScore} from './orientation.js';
import {roomAccessibility,footprintOverlap} from './interior-quality.js';

const TARGET_ROLES=Object.freeze({
 screen:['sofa'],sofa:['screen','coffee'],chair:['coffee','screen','sofa'],
 deskChair:['desk'],diningChair:['diningTable'],mediaStorage:['sofa'],
 ottoman:['sofa'],media:['sofa'],bench:['diningTable']
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const contained=(layout,room,p)=>{
 const pad=.12;
 for(const x of [p.x-p.w/2-pad,p.x+p.w/2+pad])
  for(const z of [p.z-p.d/2-pad,p.z+p.d/2+pad]){
   const {gx,gz}=worldCell(x,z);
   if(gx<0||gz<0||gx>=GRID_W||gz>=GRID_H||
    layout.grid[gz*GRID_W+gx]!==room.id)return false;
  }
 return true;
};
const distanceFromBox=(p,x,z)=>Math.hypot(
 Math.max(0,Math.abs(x-p.x)-p.w/2),
 Math.max(0,Math.abs(z-p.z)-p.d/2));
function legal(layout,room,object,proposed,items){
 if(!contained(layout,room,proposed))return false;
 const passages=layout.doors.filter(d=>d.roomId===room.id||d.toRoomId===room.id);
 for(const d of passages){
  const entry=d.roomId===room.id?d.roomCell:d.hallCell;
  if(distanceFromBox(proposed,d.x,d.z)<.86||
   distanceFromBox(proposed,entry.x,entry.z)<.64)return false;
 }
 for(const other of items){
  if(other===object||other.role==='rug'||other.supportedBy)continue;
  if(footprintOverlap(proposed,other,.10))return false;
 }
 const adjusted=items.map(p=>p===object?proposed:p);
 const nav=roomAccessibility(layout,room,adjusted);
 return nav.doorOpen&&nav.ratio>=.82;
}
function bestCompanion(p,items){
 for(const role of TARGET_ROLES[p.role]||[]){
  const partners=items.filter(q=>q!==p&&q.role===role&&!q.supportedBy);
  if(partners.length)return partners.reduce((best,q)=>
   !best||distance(p,q)<distance(p,best)?q:best,null);
 }
 return null;
}
export function polishFurnitureOrientations(layout){
 let audited=0,improved=0,unchanged=0;
 const changed=[];
 for(const room of layout.rooms){
  const props=layout.props.filter(p=>p.roomId===room.id);
  for(const p of props){
   if(!p.solid||p.supportedBy||!TARGET_ROLES[p.role]||
      props.some(q=>q.supportedBy===p.id))continue;
   const partner=bestCompanion(p,props);
   if(!partner||distance(p,partner)>.95*Math.hypot(
      room.xMax-room.xMin,room.zMax-room.zMin))continue;
   audited++;
   const original=facingScore(p.angle,p,partner);
   let best={angle:p.angle,w:p.w,d:p.d,score:original};
   const options=p.role==='screen'||p.role==='mediaStorage'?
     [p.angle,(p.angle+Math.PI)%(2*Math.PI)]:CARDINAL_YAWS;
   for(const angle of options){
    const sideways=Math.abs(Math.sin(angle-p.angle))>.5;
    const candidate={...p,angle,w:sideways?p.d:p.w,
     d:sideways?p.w:p.d};
    const score=facingScore(angle,p,partner);
    if(score<=best.score+.001)continue;
    if(!legal(layout,room,p,candidate,props))continue;
    best={angle,w:candidate.w,d:candidate.d,score};
   }
   if(best.score>original+.001){
    p.angle=best.angle;p.w=best.w;p.d=best.d;
    p.faceTarget=partner.id;
    p.facingScore=+best.score.toFixed(3);
    changed.push({id:p.id,role:p.role,before:+original.toFixed(3),
     after:+best.score.toFixed(3)});
    improved++;
   }else unchanged++;
  }
 }
 return {audited,improved,unchanged,changed};
}
