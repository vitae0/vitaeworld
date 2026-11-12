import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floorVisibilityPlan} from '../src/floor-visibility.js';
import {blocksWindow} from '../src/placement-constraints.js';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {generateBuilding} from '../src/building.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';

test('floor culling preserves the upstairs slab while standing downstairs',()=>{
 const building=generateBuilding('under-ceiling-deck','villa',2,'family_house');
 const down=floorVisibilityPlan(building,0,true,0);
 assert.deepEqual(down,[
  {rooms:true,deck:true,ceiling:true},
  {rooms:false,deck:true,ceiling:false}
 ]);
 const third=floorVisibilityPlan(building,0,false,0);
 assert.deepEqual(third,[
  {rooms:true,deck:true,ceiling:false},
  {rooms:false,deck:true,ceiling:false}
 ]);
 const up=floorVisibilityPlan(building,1,true,building.levelHeight);
 assert.deepEqual(up,[
  {rooms:false,deck:false,ceiling:false},
  {rooms:true,deck:true,ceiling:true}
 ]);
 const mid=floorVisibilityPlan(building,0,true,building.levelHeight*.5);
 assert.ok(mid.every(s=>s.rooms&&s.deck));
 // The pre-existing staircase cutouts must persist in the visible slab.
 assert.ok(building.stories[1].layout.floorHoles.size>0);
 assert.ok(building.stories[0].layout.ceilingHoles.size>0);
 assert.deepEqual([...building.stories[1].layout.floorHoles],
  [...building.stories[0].layout.ceilingHoles].slice(0,-1));
});
test('single-storey world does not allocate imaginary upper floor decks',()=>{
 const building=generateBuilding('single-story','compact',1,'cottage');
 assert.deepEqual(floorVisibilityPlan(building,0,false,0),
  [{rooms:true,deck:true,ceiling:false}]);
});
test('window blockers affect tall furniture, not low desks or sofas',()=>{
 const room={id:7},opening={roomId:7,x:0,z:3,
  axis:'x',bottom:1.12,width:.84,height:1.28};
 const layout={windows:[opening]};
 const face={x:0,z:2.7,w:1.2,d:.6};
 assert.equal(blocksWindow(layout,room,
  {role:'storage',h:1.85},face),true);
 assert.equal(blocksWindow(layout,room,
  {role:'screen',h:1.3},face),true);
 assert.equal(blocksWindow(layout,room,
  {role:'desk',h:.79},face),false);
 assert.equal(blocksWindow(layout,room,
  {role:'sofa',h:.92},face),false);
 assert.equal(blocksWindow(layout,room,
  {role:'storage',h:1.8},{...face,x:3}),false);
 assert.equal(blocksWindow(layout,{id:8},
  {role:'storage',h:1.8},face),false);
});
for(const style of BUILDING_TYPE_IDS){
 test('classic semantic rules remain safe after ML score rollback: '+style,()=>{
  const layout=generateLayout('classic-placement-'+style,style);
  assert.equal(layout.placementMethod,'semantic-rules-v2');
  assert.deepEqual(collisionPairs(layout.props),[]);
  assert.equal(layout.qualityReport.collisions.length,0);
  for(const room of layout.rooms){
   const props=layout.props.filter(p=>p.roomId===room.id);
   assert.ok(!room.missingEssentials?.length);
   const nav=roomAccessibility(layout,room,props);
   assert.ok(nav.doorOpen&&nav.ratio>=.82,
    style+' door access lost in '+room.type);
   for(const p of props){
    if(p.supportedBy||!p.solid)continue;
    const height=p.h||0;
    assert.equal(blocksWindow(layout,room,{role:p.role,h:height},p),false,
     style+' has tall furniture covering a window');
   }
  }
 });
}
