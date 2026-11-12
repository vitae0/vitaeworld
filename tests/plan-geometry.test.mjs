import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateTopology,BUILDING_TYPE_IDS} from '../src/topology.js';
import {scoreTopology,pickBestTopology} from '../src/plan-score.js';
import {generateLayout} from '../src/layout.js';

test('candidate selection picks the best scored plan',()=>{
 const candidates=['grid','compact','central'].map((style,i)=>
  generateTopology('score-'+i,style));
 const best=pickBestTopology(candidates);
 assert.equal(best.score,Math.max(...candidates.map(scoreTopology)));
 assert.equal(best.layout,candidates[best.index]);
});
for(const style of BUILDING_TYPE_IDS){
 test('5:3 room ratios, orthogonal walls and passable doors: '+style,()=>{
  for(let i=0;i<5;i++){
   const layout=generateLayout('shape-regression-'+style+'-'+i,style);
   assert.ok(Number.isFinite(layout.planQuality?.score));
   assert.ok(layout.planQuality.variant>=0&&layout.planQuality.variant<3);
   assert.equal(layout.chamfers.length,0);
   assert.ok(layout.walls.every(w=>!w.angle&&w.kind!=='diagonal'));
   for(const room of layout.rooms){
    const width=room.xMax-room.xMin,depth=room.zMax-room.zMin;
    assert.ok(Math.max(width,depth)/Math.min(width,depth)<=5/3+1e-8,
     'ratio '+style+'/'+room.id);
    assert.ok(!room.missingEssentials?.length);
    assert.ok(room.accessibility>=.82);
   }
   for(const door of layout.doors){
    const visited=new Set();
    let target=door.toRoomId;
    while(target!==0&&!visited.has(target)){
     visited.add(target);
     const next=layout.doors.find(d=>d.roomId===target);
     assert.ok(next,'room has no connecting door');
     target=next.toRoomId;
    }
    assert.equal(target,0,'cycle in connection graph');
   }
  }
 });
}
