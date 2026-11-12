import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBuilding} from '../src/building.js';
import {createInteractionSystem,buildInteractables} from '../src/interactions.js';
import {BUILDING_TYPE_IDS,isWalkable} from '../src/layout.js';

for(const style of [...BUILDING_TYPE_IDS,'auto']){
 test('interactive rooms, real closed doors, and reversible actions: '+style,()=>{
  const building=generateBuilding('v02-interaction-'+style,style,2);
  const world=createInteractionSystem(building);
  const expected=building.stories.reduce((count,s)=>count+s.layout.doors.length,0);
  assert.equal(world.items.filter(o=>o.kind==='door').length,expected);
  assert.deepEqual(buildInteractables(building),world.items);
  for(let level=0;level<2;level++){
   const layout=building.stories[level].layout;
   const door=world.items.find(o=>o.level===level&&o.kind==='door');
   assert.ok(door);
   const actor={x:door.door.roomCell.x,z:door.door.roomCell.z,level};
   assert.equal(world.state(door),false);
   assert.equal(world.doorClosedAt(level,door.x,door.z,.25),true);
   assert.ok(world.candidateNear(actor,door,level));
   const open=world.perform(door,actor);
   assert.equal(open.ok,true);
   assert.equal(open.on,true);
   assert.equal(world.state(door),true);
   assert.equal(world.doorClosedAt(level,door.x,door.z,.25),false);
   const near={x:door.x,z:door.z,level};
   const blocked=world.perform(door,near);
   assert.equal(blocked.ok,false);
   assert.equal(blocked.reason,'doorway-occupied');
   const close=world.perform(door,actor);
   assert.equal(close.ok,true);
   assert.equal(close.on,false);
   assert.ok(isWalkable(layout,door.x,door.z,.20),
    'static door throat must remain free; dynamic gate controls passage');
   assert.equal(world.doorClosedAt(level,door.x,door.z,.25),true);
  }
  // IDs are storey-scoped, even if two stories place a door in the
  // same room ID (their 3D elevation must never mix state).
  const first=world.items.find(o=>o.kind==='door'&&o.level===0);
  const second=world.items.find(o=>o.kind==='door'&&o.level===1&&
   o.door.roomId===first.door.roomId);
  assert.ok(second);
  assert.notEqual(first.id,second.id);
  assert.equal(world.state(second),false);
 });
}

test('priority selection has generous angular tolerance and predictable cycling',()=>{
 const building=generateBuilding('v02-door-pick','compact',1);
 const sys=createInteractionSystem(building);
 const door=sys.items.find(o=>o.kind==='door');
 const origin=door.door.roomCell;
 const yaw=Math.atan2(-(door.x-origin.x),-(door.z-origin.z));
 const result=sys.select({x:origin.x,z:origin.z,yaw,level:0});
 assert.ok(result,'nearby object should be selectable');
 const same=sys.select({x:origin.x,z:origin.z,yaw,level:0,
  previousId:result.id});
 assert.equal(same?.id,result.id,'hysteresis should keep a steady target');
 assert.equal(sys.select({x:999,z:999,yaw:0,level:0}),null);
});

test('usable furniture enters/exits a stable pose without moving the actor physics anchor',()=>{
 const building=generateBuilding('v02-poses','central',1);
 const sys=createInteractionSystem(building);
 const props=sys.items.filter(o=>['sit','lie','bathe'].includes(o.kind));
 assert.ok(props.length>0);
 let tested=0;
 for(const prop of props){
  const room=building.stories[0].layout.rooms.find(r=>r.id===prop.roomId);
  const accessible=room.cells.filter(c=>
   sys.candidateNear({x:c.x,z:c.z},prop,0));
  if(!accessible.length)continue;
  const actor={x:accessible[0].x,z:accessible[0].z,level:0};
  const start=sys.perform(prop,actor);
  assert.ok(start.ok);
  assert.equal(start.pose,'enter');
  assert.equal(sys.activePose?.id,prop.id);
  assert.equal(sys.select({...actor,yaw:0,level:0})?.id,prop.id,
   'active furniture must remain easy to exit');
  assert.equal(sys.actionName(prop),'KALK');
  const end=sys.perform(prop,actor);
  assert.ok(end.ok);
  assert.equal(end.pose,'exit');
  assert.equal(sys.activePose,null);
  tested++;
  break;
 }
 assert.ok(tested>0,'must find at least one reachable sitting/sleeping object');
});
