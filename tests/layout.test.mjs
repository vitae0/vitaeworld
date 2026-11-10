import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,isWalkable} from '../src/layout.js';

test('repeatable layout and reproducible prop placement',()=>{
  assert.deepEqual(generateLayout('hello'),generateLayout('hello'));
  assert.notDeepEqual(generateLayout('hello').rooms,generateLayout('world').rooms);
});
test('six connected rooms and a walkable corridor',()=>{
 const layout=generateLayout('architect');
 assert.equal(layout.rooms.length,6);
 assert.equal(layout.doors.length,6);
 assert.equal(new Set(layout.rooms.map(r=>r.kind)).size,6);
 for(const d of layout.doors){
  assert.equal(isWalkable(layout,d.x,d.z,0.3),true, 'door '+d.roomId);
  const inside=d.z+(d.side==='north'?-0.9:0.9);
  assert.equal(isWalkable(layout,d.x,inside,0.3),true,'inside '+d.roomId);
 }
 for(let x=-12;x<=12;x+=1)assert.equal(isWalkable(layout,x,0),true,'hall at '+x);
});
test('room objects avoid facade and door collisions',()=>{
 for(const seed of ['a','b','c','d','e']){
  const layout=generateLayout(seed);
  for(const p of layout.props){
   const r=layout.rooms[p.roomId];
   assert.ok(p.x-p.w/2>r.xMin, 'left side '+p.model);
   assert.ok(p.x+p.w/2<r.xMax, 'right side '+p.model);
   assert.ok(p.z-p.d/2>r.zMin, 'back side '+p.model);
   assert.ok(p.z+p.d/2<r.zMax, 'front side '+p.model);
  }
 }
});
