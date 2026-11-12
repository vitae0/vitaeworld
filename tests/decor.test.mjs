import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,TILE,BUILDING_TYPE_IDS} from '../src/layout.js';
import {volumeOverlap,roomAccessibility,collisionPairs} from '../src/interior-quality.js';

for(const style of BUILDING_TYPE_IDS){
 test('decorated interiors remain safe and deterministic: '+style,()=>{
  for(let i=0;i<3;i++){
   const seed='decor-smoke-'+i;
   const layout=generateLayout(seed,style);
   assert.deepEqual(layout,generateLayout(seed,style),'different layout for same seed');
   assert.equal(layout.qualityReport.decorations,layout.decorations.length);
   assert.ok(layout.decorations.length>=layout.rooms.length*2,
     'rooms are insufficiently dressed');
   assert.deepEqual(collisionPairs(layout.props),[]);
   for(const room of layout.rooms){
    assert.ok(room.area>=12&&room.area<=60,'bad room area');
    assert.ok(room.furnitureCount>=4,'room has too little furniture');
    assert.ok(room.decorationCount>=1,'empty decoration layer');
    const props=layout.props.filter(p=>p.roomId===room.id);
    assert.ok(roomAccessibility(layout,room,props).ratio>=.82,
      'room no longer traversable');
   }
   const tablePieces=layout.decorations.filter(d=>d.source==='surface');
   for(const decor of tablePieces){
    const parent=layout.props.find(p=>p.id===decor.supportedBy);
    assert.ok(parent,'orphaned tabletop decoration');
    assert.equal(decor.roomId,parent.roomId);
    assert.ok(decor.y>=parent.y+parent.h-.0001,'tabletop object embedded');
    assert.ok(Math.abs(decor.x-parent.x)+decor.w/2<=parent.w/2+.001,
      'decoration hangs over table edge x');
    assert.ok(Math.abs(decor.z-parent.z)+decor.d/2<=parent.d/2+.001,
      'decoration hangs over table edge z');
    for(const prop of layout.props)
     if(prop.id!==parent.id)
      assert.ok(!volumeOverlap(decor,prop,.015),'tabletop item overlaps a prop');
    for(const peer of tablePieces)
     if(peer!==decor)
      assert.ok(!volumeOverlap(decor,peer,.05),'two tabletop decorations intersect');
   }
   const wallPieces=layout.decorations.filter(d=>d.source==='wall');
   for(const decor of wallPieces){
    assert.ok(decor.y>2,'wall item too low for walking space');
    assert.ok(decor.y+decor.h/2<3.25,'wall item clips ceiling');
    assert.ok(layout.walls.some(w=>w.kind==='wall'&&
      Math.hypot(w.x-decor.x,w.z-decor.z)<.2),'not attached to a wall');
    assert.ok(layout.doors.every(door=>
      Math.hypot(door.x-decor.x,door.z-decor.z)>TILE*.68),
      'decoration overlaps a doorway');
   }
  }
 });
}
