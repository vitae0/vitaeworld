// VitaeWorld V0.2 interactions: pure world-state, selection and reachability.
// Three.js, DOM controls and animations are separate adapters.
import {GRID_W,GRID_H,worldCell} from './topology.js';

const REACH=2.5;
const INTERACTION_TYPES=Object.freeze({
 bed:'lie',sofa:'sit',chair:'sit',deskChair:'sit',diningChair:'sit',
 bench:'sit',ottoman:'sit',bath:'bathe',shower:'shower',
 sink:'wash',storage:'open',coldStorage:'open',
 screen:'power',lighting:'power',cooking:'power',
 toilet:'use'
});
const TOGGLE=new Set(['door','open','power','shower','wash','use']);
const POSE=new Set(['lie','sit','bathe']);
const MAIN_LABEL={door:'KAPI',lie:'YATAK',sit:'OTURMA',bathe:'KÜVET',
 shower:'DUŞ',wash:'LAVABO',open:'DOLAP',power:'CİHAZ',use:'TUVALET'};
const KIND_NAME={bed:'Yatak',sofa:'Koltuk',chair:'Sandalye',deskChair:'Çalışma sandalyesi',
 diningChair:'Sandalye',bench:'Bank',ottoman:'Puf',bath:'Küvet',
 shower:'Duş',sink:'Lavabo',storage:'Dolap',coldStorage:'Buzdolabı',
 screen:'Televizyon',lighting:'Lamba',cooking:'Ocak',toilet:'Tuvalet'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
function distanceToBounds(point,target){
 const dx=Math.max(0,Math.abs(point.x-target.x)-(target.w||0)/2);
 const dz=Math.max(0,Math.abs(point.z-target.z)-(target.d||0)/2);
 return Math.hypot(dx,dz);
}
const ids=(level,type,id)=>level+':'+type+':'+id;

export function buildInteractables(building){
 const result=[];
 for(const story of building.stories){
  const level=story.index,layout=story.layout;
  for(const door of layout.doors){
   result.push({id:ids(level,'door',door.roomId),level,kind:'door',
    role:'door',label:'Kapı',x:door.x,z:door.z,
    y:story.elevation+1.24,w:door.axis==='x'?1.12:.10,
    d:door.axis==='z'?1.12:.10,h:2.36,
    roomId:door.roomId,connects:door.toRoomId,door});
  }
  for(const prop of layout.props){
   const kind=INTERACTION_TYPES[prop.role];
   if(!kind||!prop.solid||prop.supportedBy)continue;
   // Beds, sofas and sinks are usable at their physical bounding box.
   result.push({id:ids(level,'prop',prop.id),level,kind,
    role:prop.role,label:KIND_NAME[prop.role]||prop.model,
    x:prop.x,z:prop.z,y:story.elevation+(prop.y||.1)+
      Math.min(1.85,Math.max(.52,prop.h+.30)),
    w:prop.w,d:prop.d,h:prop.h,angle:prop.angle||0,
    roomId:prop.roomId,prop});
  }
 }
 return result;
}
export function createInteractionSystem(building){
 const all=buildInteractables(building),byId=new Map(all.map(o=>[o.id,o]));
 const byLevel=building.stories.map((_,index)=>all.filter(o=>o.level===index));
 const states=new Map(all.map(o=>[o.id, {on:false}]));
 let activePose=null;
 function state(o){return states.get(o.id)?.on===true;}
 function actionName(o){
  if(activePose?.id===o.id)return 'KALK';
  if(o.kind==='door'||o.kind==='open')return state(o)?'KAPAT':'AÇ';
  if(o.kind==='power')return state(o)?'KAPAT':'AÇ';
  if(o.kind==='shower')return state(o)?'DUŞU KAPAT':'DUŞU AÇ';
  if(o.kind==='wash')return state(o)?'SUYU KAPAT':'SUYU AÇ';
  if(o.kind==='use')return state(o)?'BİTİR':'KULLAN';
  return o.kind==='lie'?'UZAN':o.kind==='sit'?'OTUR':'KÜVETE GİR';
 }
 function doorClosedAt(level,x,z,radius=.29,exceptId=null){
  return byLevel[level]?.some(o=>o.kind==='door'&&o.id!==exceptId&&!state(o)&&
   distanceToBounds({x,z},o)<radius+.035)??false;
 }
 function getRoom(layout,x,z){
  const {gx,gz}=worldCell(x,z);
  if(gx<0||gz<0||gx>=GRID_W||gz>=GRID_H)return -1;
  return (layout.zoneGrid||layout.grid)[gz*GRID_W+gx];
 }
 function lineClear(layout,from,to,excludeDoor=null){
  // Wall and closed-door AABBs produce a reliable 2D line-of-sight test.
  // Trace from player's eye towards the nearest object edge, so large
  // sofas are selectable without having to aim at their geometric centre.
  const blockers=[...layout.walls.filter(w=>w.kind==='wall')];
  for(const o of byLevel[layout.floorIndex||0]||[]){
   if(o.kind==='door'&&!state(o)&&o.id!==excludeDoor)
    blockers.push({x:o.x,z:o.z,w:o.w,d:o.d});
  }
  const dx=to.x-from.x,dz=to.z-from.z;
  for(const b of blockers){
   const x0=b.x-(b.w/2+.035),x1=b.x+(b.w/2+.035),
         z0=b.z-(b.d/2+.035),z1=b.z+(b.d/2+.035);
   let tmin=0,tmax=1;
   for(const [p,v,min,max] of [[from.x,dx,x0,x1],[from.z,dz,z0,z1]]){
    if(Math.abs(v)<1e-7){if(p<min||p>max){tmin=2;break;}continue;}
    const a=(min-p)/v,c=(max-p)/v;
    tmin=Math.max(tmin,Math.min(a,c));tmax=Math.min(tmax,Math.max(a,c));
   }
   if(tmin<tmax&&tmax>.025&&tmin<.97)return false;
  }
  return true;
 }
 function candidateNear(player,item,level){
  if(item.level!==level)return false;
  const bound=distanceToBounds(player,item);
  if(bound>(item.kind==='door'?2.0:REACH))return false;
  const layout=building.stories[level].layout;
  if(item.kind!=='door'){
   const currentRoom=getRoom(layout,player.x,player.z);
   // A closed interior door never permits interacting with an unseen item.
   // Distinct room access is still allowed if the line of sight is clear.
   if(currentRoom!==item.roomId&&distance(player,item)>2.8)return false;
  }
  const target={
   x:clamp(player.x,item.x-item.w*.47,item.x+item.w*.47),
   z:clamp(player.z,item.z-item.d*.47,item.z+item.d*.47)
  };
  // The target is slightly inside the usable footprint. The near-end ray
  // deliberately terminates before the furniture itself.
  return lineClear({...layout,floorIndex:level},player,target,item.id);
 }
 function select({x,z,yaw,level,previousId=null}){
  const player={x,z},vector={x:-Math.sin(yaw),z:-Math.cos(yaw)};
  if(activePose&&activePose.level===level)return byId.get(activePose.id)||null;
  let best=null,bestScore=-Infinity;
  for(const o of byLevel[level]||[]){
   if(!candidateNear(player,o,level))continue;
   const dx=o.x-x,dz=o.z-z,length=Math.hypot(dx,dz)||.001;
   const dot=(dx*vector.x+dz*vector.z)/length;
   // Prefer visible objects, but a close target near the crosshair still
   // wins without pixel-perfect pointing. Slight hysteresis removes flicker.
   const reach=distanceToBounds(player,o);
   if(dot<-.16&&reach>.77)continue;
   const aim=(dot+1)/2;
   const score=aim*2.1-reach*.74+(o.id===previousId?.25:0)+
     (o.kind==='door'?.13:0);
   if(score>bestScore){best=o;bestScore=score;}
  }
  return best;
 }
 function perform(target,player){
  const item=typeof target==='string'?byId.get(target):target;
  if(!item)return {ok:false,reason:'unknown'};
  if(activePose){
   if(item.id!==activePose.id)return {ok:false,reason:'posing'};
   const previous=activePose;activePose=null;
   return {ok:true,id:item.id,kind:item.kind,pose:'exit',
    previous,action:'KALK',on:false};
  }
  if(!player||!candidateNear(player,item,player.level))
   return {ok:false,reason:'out-of-reach'};
  if(POSE.has(item.kind)){
   activePose={id:item.id,kind:item.kind,level:item.level,
    x:item.x,z:item.z,y:item.level*building.levelHeight+
      (item.kind==='sit'?.36:item.kind==='bathe'?.20:.46),
    angle:item.angle||0};
   return {ok:true,id:item.id,kind:item.kind,pose:'enter',
    value:activePose,action:actionName(item),on:true};
  }
  if(TOGGLE.has(item.kind)){
   const next=!state(item);
   // Door cannot close with the player physically in the door throat.
   if(item.kind==='door'&&!next&&
      distanceToBounds(player,item)<.41)
    return {ok:false,reason:'doorway-occupied'};
   states.set(item.id,{on:next});
   return {ok:true,id:item.id,kind:item.kind,action:actionName(item),
    on:next,item};
  }
  return {ok:false,reason:'unsupported'};
 }
 function importStates(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))
   return [];
  const changes=[];
  for(const [id,on] of Object.entries(snapshot)){
   const item=byId.get(id);
   if(!item||!TOGGLE.has(item.kind)||typeof on!=='boolean')continue;
   states.set(id,{on});
   changes.push({item,on});
  }
  return changes;
 }
 return {items:all,byId,byLevel,select,perform,actionName,
  state,doorClosedAt,candidateNear,get activePose(){return activePose;},
  exportStates:()=>Object.fromEntries([...states].map(([id,s])=>[id,s.on])),
  importStates,
  clearPose(){const old=activePose;activePose=null;return old;}};
}
