import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TILE,GRID_W,BUILDING_TYPE_IDS} from '../src/layout.js';
import {ROOM_TYPES} from '../src/semantics.js';
import {generateBuilding} from '../src/building.js';
import {STOREY_HEIGHT,sampleWalkableGround} from '../src/stairs.js';

for(const style of [...BUILDING_TYPE_IDS,'auto']){
 test('two storeys, named corridors and traversable stairs: '+style,()=>{
  const building=generateBuilding('building-regression-'+style,style,2);
  assert.equal(building.stories.length,2);
  assert.equal(building.stairs.length,1);
  assert.equal(building.stories[0].layout.buildingType,building.stories[1].layout.buildingType);
  for(const story of building.stories){
   const layout=story.layout;
   assert.ok(layout.circulationRooms.length>=2);
   assert.equal(layout.zoneGrid.length,layout.grid.length);
   assert.equal(layout.qualityReport.roomCount,layout.rooms.length);
   assert.ok(layout.circulationRooms.some(r=>r.stairAccess));
   for(const room of layout.circulationRooms){
    assert.equal(room.kind,'circulation');
    assert.ok(ROOM_TYPES[room.type].circulation);
    assert.ok(room.decorationCount>=1,'undecorated circulation room');
    assert.ok(room.cells.length>0);
    for(const c of room.cells){
     const k=c.gz*GRID_W+c.gx;
     assert.equal(layout.grid[k],0,'hallway route broken');
     assert.equal(layout.zoneGrid[k],room.id);
     assert.ok(layout.floors.some(f=>f.gx===c.gx&&f.gz===c.gz&&f.roomId===room.id));
    }
   }
   for(const room of layout.rooms.filter(r=>!r.circulation))
    assert.ok(layout.doors.some(d=>d.roomId===room.id));
  }
  const stair=building.stairs[0];
  assert.equal(stair.cells.length,7);
  assert.equal(building.stories[0].layout.ceilingHoles.size,7);
  assert.equal(building.stories[1].layout.floorHoles.size,6);
  for(const reverse of [false,true]){
   let previousY=reverse?STOREY_HEIGHT:0;
   for(let i=0;i<=80;i++){
    const t=reverse?1-i/80:i/80;
    const x=stair.start.x+(stair.end.x-stair.start.x)*t;
    const z=stair.start.z+(stair.end.z-stair.start.z)*t;
    const sample=sampleWalkableGround(building,x,z,previousY,.29);
    assert.ok(sample,'unwalkable stair at '+t);
    assert.ok(Math.abs(sample.height-previousY)<.25,'vertical teleport');
    previousY=sample.height;
   }
   assert.ok(Math.abs(previousY-(reverse?0:STOREY_HEIGHT))<.001);
  }
  const exit=sampleWalkableGround(building,
   stair.end.x+stair.dx*TILE,stair.end.z+stair.dz*TILE,STOREY_HEIGHT,.29);
  const approach=sampleWalkableGround(building,
   stair.start.x-stair.dx*TILE,stair.start.z-stair.dz*TILE,0,.29);
  assert.equal(exit?.height,STOREY_HEIGHT);
  assert.equal(approach?.height,0);
  const hole=stair.cells[1];
  assert.equal(building.stories[1].layout.floorHoles.has(hole.gz*GRID_W+hole.gx),true);
  assert.equal(sampleWalkableGround(building,
   stair.start.x+stair.dx*TILE,stair.start.z+stair.dz*TILE,STOREY_HEIGHT,.29),null,
   'walking on missing floor slab');
 });
}
test('single story uses no stair connections',()=>{
 const b=generateBuilding('one-floor','compact',1);
 assert.equal(b.stories.length,1);
 assert.equal(b.stairs.length,0);
 assert.ok(b.stories[0].layout.circulationRooms.length>0);
});
