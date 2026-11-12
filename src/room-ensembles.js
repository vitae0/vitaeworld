// VitaeWorld ensemble rules. Pure and deterministic; they only break ties
// among already legal finalists chosen by the classic semantic placement
// system. No learned model, no expensive optimizer and no extra GLBs.
import {facingScore} from './orientation.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function nearest(others,role,p){
 const matches=others.filter(q=>q.role===role&&!q.supportedBy);
 return matches.length?matches.reduce((a,b)=>
  distance(a,p)<distance(b,p)?a:b):null;
}
function sideBalance(center,p,previous){
 if(!previous.length)return 1;
 // A dining chair ought not stack on the same table edge as all the
 // existing chairs. Spread across distinct sides, preserving clearance.
 const a=Math.atan2(p.z-center.z,p.x-center.x);
 let min=Math.PI;
 for(const c of previous){
  const b=Math.atan2(c.z-center.z,c.x-center.x);
  const diff=Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  min=Math.min(min,diff);
 }
 return clamp(min/(Math.PI*.50),0,1);
}
export function ensembleBonus(room,asset,p,others){
 const role=asset.role;
 if(role==='diningChair'){
  const table=nearest(others,'diningTable',p);
  if(!table)return 0;
  const distanceToTable=distance(p,table);
  const othersAtTable=others.filter(q=>q.role==='diningChair'&&
   distance(q,table)<2.5);
  const spaced=sideBalance(table,p,othersAtTable);
  const sight=facingScore(p.angle,p,table);
  const fit=clamp(1-Math.abs(distanceToTable-1.15)/1.7,0,1);
  return clamp(.21*spaced+.12*fit+.07*sight-.08,-.08,.33);
 }
 if(role==='deskChair'){
  const desk=nearest(others,'desk',p);
  if(!desk)return 0;
  return .15*facingScore(p.angle,p,desk)+
   .12*clamp(1-Math.abs(distance(p,desk)-.86)/1.5,0,1);
 }
 if(role==='sidetable'){
  const bed=nearest(others,'bed',p);
  if(!bed)return 0;
  const already=others.filter(q=>q.role==='sidetable');
  const dx=p.x-bed.x,dz=p.z-bed.z;
  const avoid=already.some(q=>
   (q.x-bed.x)*dx+(q.z-bed.z)*dz>0);
  return avoid?-.18:.16;
 }
 if(['coldStorage','cooking','sink'].includes(role)&&room.type==='kitchen'){
  const peers=others.filter(q=>['coldStorage','cooking','sink'].includes(q.role));
  if(!peers.length)return 0;
  const avg=peers.reduce((sum,q)=>sum+distance(p,q),0)/peers.length;
  const compact=clamp(1-Math.abs(avg-2.1)/2.5,0,1);
  const cramped=peers.some(q=>distance(p,q)<1.05);
  return compact*.27-(cramped?.19:0);
 }
 if(role==='screen'||role==='sofa'){
  const other=nearest(others,role==='screen'?'sofa':'screen',p);
  if(!other)return 0;
  const d=distance(p,other);
  const view=clamp(1-Math.abs(d-2.7)/3,0,1);
  return .13*view+.08*facingScore(p.angle,p,other);
 }
 if(role==='coffee'){
  const sofa=nearest(others,'sofa',p);
  if(!sofa)return 0;
  const d=distance(p,sofa);
  return .20*clamp(1-Math.abs(d-1.35)/1.45,0,1);
 }
 return 0;
}
export function summarizeCompositions(layout){
 let pairs=0,chairs=0,kitchens=0,lounges=0;
 const details=[];
 for(const room of layout.rooms){
  const props=layout.props.filter(p=>p.roomId===room.id);
  const roles=new Set(props.map(p=>p.role));
  let group='general',complete=false;
  if(room.type==='dining'){
   group='dining';complete=roles.has('diningTable')&&roles.has('diningChair');
   chairs+=props.filter(p=>p.role==='diningChair').length;
  }else if(room.type==='kitchen'){
   group='kitchen';complete=['sink','cooking','coldStorage'].every(r=>roles.has(r));
   kitchens+=Number(complete);
  }else if(room.type==='lounge'){
   group='lounge';complete=roles.has('sofa')&&(roles.has('screen')||roles.has('coffee'));
   lounges+=Number(complete);
  }else if(room.type==='studio'||room.type==='office'){
   group='work';complete=roles.has('desk')&&roles.has('deskChair');
  }else if(room.type==='suite'){
   group='sleep';complete=roles.has('bed')&&roles.has('sidetable');
  }else continue;
  pairs+=Number(complete);
  details.push({roomId:room.id,group,complete});
 }
 return {total:details.length,complete:pairs,chairs,kitchens,lounges,details};
}
