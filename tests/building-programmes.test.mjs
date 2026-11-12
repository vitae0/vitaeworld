import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_PROGRAMS,BUILDING_PROGRAM_IDS,PROGRAM_CATEGORIES,
 resolveBuildingProgram} from '../src/building-programs.js';
import {generateTopology,BUILDING_TYPE_IDS,WALL_HEIGHT,DOOR_HEIGHT,
 DOOR_WIDTH,TILE,GRID_W,GRID_H} from '../src/topology.js';
import {doorStyleFor,DOOR_FINISHES} from '../src/door-styles.js';
import {generateBuilding} from '../src/building.js';
import {createInteractionSystem} from '../src/interactions.js';

test('36 distinct programmes with explicit category/architecture/material rules',()=>{
 assert.equal(BUILDING_PROGRAM_IDS.length,36);
 assert.equal(new Set(BUILDING_PROGRAM_IDS).size,36);
 for(const id of BUILDING_PROGRAM_IDS){
  const p=resolveBuildingProgram(id);
  assert.equal(p.id,id);
  assert.ok(p.label.length>2);
  assert.ok(PROGRAM_CATEGORIES.includes(p.category));
  assert.ok(BUILDING_TYPE_IDS.includes(p.architecture));
  assert.ok(p.required.length>=2);
  assert.ok(Object.values(p.weights).some(x=>x>0));
 }
 assert.equal(resolveBuildingProgram('auto'),null);
 assert.throws(()=>resolveBuildingProgram('made-up'));
});
for(const id of BUILDING_PROGRAM_IDS){
 test('program produces compact, reachable rooms with a locked entry: '+id,()=>{
  const p=BUILDING_PROGRAMS[id];
  const layout=generateTopology('13-'+id,p.architecture,p);
  assert.equal(layout.buildingProgram?.id,id);
  assert.equal(layout.buildingType,p.architecture);
  assert.ok(layout.exteriorDoor?.locked);
  assert.ok(layout.exteriorDoor.exterior);
  assert.ok(layout.exteriorDoor.cell);
  for(const r of layout.rooms){
   const width=r.xMax-r.xMin,depth=r.zMax-r.zMin;
   assert.ok(Math.max(width,depth)/Math.min(width,depth)<=5/3+1e-8,
      id+' room '+r.id);
  }
  const lintels=layout.walls.filter(w=>w.kind==='lintel');
  assert.equal(lintels.length,layout.doors.length+1,
    'exactly one solid over-door wall per inner/exterior door');
  for(const w of lintels){
   const low=w.y-w.height/2,top=w.y+w.height/2;
   assert.ok(Math.abs(w.height-(WALL_HEIGHT-DOOR_HEIGHT))<1e-10);
   assert.ok(Math.abs(low-(.10+DOOR_HEIGHT))<1e-10,
     'lintel must begin immediately above the door');
   assert.ok(Math.abs(top-(.10+WALL_HEIGHT))<1e-10,
     'lintel must reach the top of the structural wall');
  }
  const {gx,gz}=layout.exteriorDoor.cell;
  assert.ok(gx>=0&&gz>=0&&gx<GRID_W&&gz<GRID_H);
  assert.ok(DOOR_WIDTH<TILE);
 });
}
test('privacy: every bathroom door is solid and ordinary rooms vary by seed',()=>{
 const kinds=new Set();
 for(let n=0;n<12;n++){
  const layout=generateTopology('privacy-'+n,'central');
  for(const d of layout.doors){
   const style=doorStyleFor(layout,d);
   assert.ok(DOOR_FINISHES.includes(style.finish));
   const src=layout.rooms.find(r=>r.id===d.roomId);
   const dst=layout.rooms.find(r=>r.id===d.toRoomId);
   if(src?.type==='bath'||dst?.type==='bath'){
    assert.equal(style.finish,'opaque','bathroom may not have windows');
   }else kinds.add(style.finish);
   assert.deepEqual(doorStyleFor(layout,d),style,'style must be deterministic');
  }
  const locked=doorStyleFor(layout,layout.exteriorDoor);
  assert.equal(locked.locked,true);
  assert.equal(locked.exterior,true);
 }
 assert.ok(kinds.has('glazed')&&kinds.has('opaque')&&kinds.has('frosted'),
  'living spaces must have multiple interior finishes');
});
test('the external entrance is deliberately NOT actionable',()=>{
 const b=generateBuilding('locked-entrance','auto',2,'hotel');
 const i=createInteractionSystem(b);
 assert.equal(b.programId,'hotel');
 for(const story of b.stories){
  const exterior=story.layout.exteriorDoor;
  if(story.index===0){
   assert.ok(exterior.locked);
   assert.ok(!i.items.some(item=>item.level===story.index&&item.kind==='door'&&
    item.x===exterior.x&&item.z===exterior.z&&item.exterior));
  }else{
   assert.equal(exterior,null,
     'upper storeys must not have doors opening into midair');
  }
 }
 assert.equal(i.items.filter(o=>o.kind==='door').length,
    b.stories.reduce((s,l)=>s+l.layout.doors.length,0));
});
