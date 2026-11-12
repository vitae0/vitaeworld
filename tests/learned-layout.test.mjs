import {test} from 'node:test';
import assert from 'node:assert/strict';
import model from '../model/layout-priors.json' with {type:'json'};
import {learnedModelStatus,learnedPlacementBonus,spatialLogDensity}
 from '../src/learned-layout.js';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';

test('model parameters remain safe, compact and transparent',()=>{
 assert.equal(model.version,1);
 assert.equal(model.license,'CC BY 4.0');
 assert.equal(learnedModelStatus.trained,model.trained===true);
 assert.equal(learnedModelStatus.groups,Object.keys(model.groups).length);
 for(const [name,group] of Object.entries(model.groups)){
  assert.match(name,/^(bedroom|living_room|kitchen)\|/);
  assert.ok(group.train_count>=28);
  assert.ok(group.test_count>=5);
  assert.ok(group.components.length>0&&group.components.length<=3);
  const sum=group.components.reduce((a,b)=>a+b.weight,0);
  assert.ok(Math.abs(sum-1)<.00001);
  for(const c of group.components){
   assert.ok(c.weight>0&&c.weight<=1);
   assert.equal(c.mu.length,2);assert.equal(c.var.length,2);
   for(const v of c.mu)assert.ok(v>=0&&v<=1);
   for(const v of c.var)assert.ok(v>=.008&&v<=.22);
  }
  assert.ok(Number.isFinite(spatialLogDensity(group,.3,.7)));
 }
});

test('learned scorer is bounded and never creates invalid coordinates',()=>{
 const room={type:'suite',xMin:0,xMax:4,zMin:0,zMax:4};
 const item={role:'bed'};
 for(let i=0;i<=16;i++)for(let j=0;j<=16;j++){
  const result=learnedPlacementBonus(room,item,{x:i/4,z:j/4});
  assert.ok(Number.isFinite(result));
  assert.ok(result>=-.220001&&result<=.240001);
 }
 assert.equal(learnedPlacementBonus({...room,type:'corridor'},item,{x:1,z:1}),0);
 assert.equal(learnedPlacementBonus(room,{role:'door'},{x:1,z:1}),0);
});

for(const style of BUILDING_TYPE_IDS){
 test('trained prior does not bypass geometry, collisions or door access: '+style,()=>{
  for(let i=0;i<5;i++){
   const l=generateLayout('learned-layout-check-'+style+'-'+i,style);
   assert.deepEqual(l.qualityReport.collisions,[]);
   assert.deepEqual(collisionPairs(l.props),[]);
   for(const room of l.rooms){
    const w=room.xMax-room.xMin,d=room.zMax-room.zMin;
    assert.ok(Math.max(w,d)/Math.min(w,d)<=5/3+1e-8);
    const props=l.props.filter(p=>p.roomId===room.id);
    const nav=roomAccessibility(l,room,props);
    assert.ok(nav.doorOpen&&nav.ratio>=.82,'blocked '+style+'/'+room.id);
   }
  }
 });
}
