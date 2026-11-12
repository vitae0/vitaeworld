// Tiny data-trained spatial prior, no runtime ML framework needed.
// Parameters are fitted from CC BY 4.0 FloorplanQA-Layouts via
// scripts/train-layout-priors.py and shipped as a small, auditable JSON.
// Never bypasses candidate geometry, door clearance or collision rules.
import model from '../model/layout-priors.json';

const ROOM_MAP=Object.freeze({
 suite:'bedroom',lounge:'living_room',games:'living_room',kitchen:'kitchen'
});
const ROLE_MAP=Object.freeze({
 bed:'bed',sidetable:'sidetable',sofa:'sofa',
 coffee:'coffee',screen:'screen',chair:'chair',
 storage:'storage',coldStorage:'coldStorage',
 cooking:'cooking',sink:'sink',counter:'counter',
 diningChair:'diningChair',diningTable:'diningTable',
 plant:'plant',desk:'desk'
});
const limit=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const learnedModelStatus=Object.freeze({
 trained:model.trained===true,
 groups:Object.keys(model.groups||{}).length,
 dataset:model.dataset
});
export function spatialLogDensity(group,x,y){
 if(!group?.components?.length)return 0;
 const logs=[];
 for(const comp of group.components){
  const [vx,vy]=comp.var,[mx,my]=comp.mu;
  if(!(vx>0&&vy>0&&comp.weight>0))continue;
  logs.push(Math.log(comp.weight)-Math.log(2*Math.PI)-
    .5*Math.log(vx*vy)-.5*((x-mx)**2/vx+(y-my)**2/vy));
 }
 if(!logs.length)return 0;
 const max=Math.max(...logs);
 return max+Math.log(logs.reduce((sum,v)=>sum+Math.exp(v-max),0));
}
export function learnedPlacementBonus(room,item,position){
 if(!model.trained)return 0;
 const category=ROOM_MAP[room.type],role=ROLE_MAP[item.role];
 if(!category||!role)return 0;
 const group=model.groups?.[category+'|'+role];
 if(!group||!group.components?.length)return 0;
 const width=room.xMax-room.xMin,depth=room.zMax-room.zMin;
 if(width<=0||depth<=0)return 0;
 const x=limit((position.x-room.xMin)/width,.001,.999);
 const y=limit((position.z-room.zMin)/depth,.001,.999);
 // A bounded guidance score, not an authority: preserve deterministic
 // room, collision and accessibility constraints in the main placer.
 return limit(spatialLogDensity(group,x,y)*.13,-.22,.24);
}
