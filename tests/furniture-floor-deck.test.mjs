import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floorVisibilityPlan,renderedDeckCells,visibleCeilingCells,stairwellRimSegments} from '../src/floor-visibility.js';
import {blocksWindow,furnitureUseFrontage} from '../src/placement-constraints.js';
import {generateLayout,BUILDING_TYPE_IDS,GRID_W,GRID_H,worldCell} from '../src/layout.js';
import {generateBuilding} from '../src/building.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';

test('floor culling preserves the upstairs slab while standing downstairs',()=>{
 const building=generateBuilding('under-ceiling-deck','villa',2,'family_house');
 const down=floorVisibilityPlan(building,0,true,0);
 assert.deepEqual(down,[
  {rooms:true,deck:true,ceiling:true,detail:true,tier:'full'},
  {rooms:true,deck:true,ceiling:false,detail:true,tier:'full'}
 ]);
 const third=floorVisibilityPlan(building,0,false,0);
 assert.deepEqual(third,[
  {rooms:true,deck:true,ceiling:false,detail:true,tier:'full'},
  {rooms:true,deck:true,ceiling:false,detail:true,tier:'full'}
 ]);
 const up=floorVisibilityPlan(building,1,true,building.levelHeight);
 assert.deepEqual(up,[
  {rooms:true,deck:true,ceiling:false,detail:true,tier:'full'},
  {rooms:true,deck:true,ceiling:true,detail:true,tier:'full'}
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
  [{rooms:true,deck:true,ceiling:false,detail:true,tier:'full'}]);
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
  assert.equal(layout.placementMethod,'semantic-rules-v2-access');
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

test('upper slab replaces the overlapping lower ceiling, without leaving holes elsewhere',()=>{
 for(const style of BUILDING_TYPE_IDS){
  const building=generateBuilding('roof-cover-'+style,style,2);
  const lower=building.stories[0].layout,upper=building.stories[1].layout;
  const actualDeck=renderedDeckCells(upper);
  const roof=visibleCeilingCells(lower,upper);
  const key=c=>c.gz*GRID_W+c.gx;
  const deckKeys=new Set(actualDeck.map(key));
  assert.ok(actualDeck.length>0);
  assert.ok(roof.every(c=>!deckKeys.has(key(c))),style+
   ': lower roof hides the actual upper floor from below');
  assert.ok(roof.every(c=>!lower.ceilingHoles?.has(key(c))));
  const originalCeiling=visibleCeilingCells(lower,null);
  assert.ok(originalCeiling.length>=roof.length);
  assert.ok(originalCeiling.length>roof.length,
   style+': duplicated ceiling should be removed where the upper slab exists');
  const rim=stairwellRimSegments(upper);
  assert.ok(rim.length>0,'upper stairwell needs a structural edge rim');
  assert.ok(rim.every(p=>p.w>0&&p.d>0));
  assert.deepEqual(stairwellRimSegments(lower),[],
   'ground floor must not get a floating stairwell rim');
 }
});
test('local furniture access distinguishes clear facing, blocked facing and chair backs',()=>{
 const grid=new Int16Array(GRID_W*GRID_H).fill(-1);
 for(let gz=6;gz<=12;gz++)for(let gx=9;gx<=15;gx++){
  grid[gz*GRID_W+gx]=7;
 }
 const room={id:7},layout={grid};
 const p={x:0,z:0,w:.82,d:.76,angle:0};
 const cabinet={role:'storage',solid:true};
 const free=furnitureUseFrontage(layout,room,cabinet,p,[]);
 assert.ok(free>.8);
 const obstacle={x:0,z:-.90,w:1.12,d:.60,solid:true,role:'desk'};
 const blocked=furnitureUseFrontage(layout,room,cabinet,p,[obstacle]);
 assert.ok(blocked<free,'approach clearance must reject obstructed front');
 assert.equal(furnitureUseFrontage(layout,room,
  {role:'rug',solid:false},p,[obstacle]),0);
 const chair={role:'diningChair',solid:true};
 assert.ok(furnitureUseFrontage(layout,room,chair,p,[obstacle])>.8,
  'dining chair must be approachable from behind, not table-facing front');
});
