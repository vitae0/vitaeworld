import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {collisionPairs,footprintOverlap,volumeOverlap,roomAccessibility} from '../src/interior-quality.js';

// Rugs deliberately sit UNDER furniture, whereas non-rug meshes must never
// occupy the same three-dimensional space.
test('3D overlap differentiates touching surfaces, furniture, and rugs',()=>{
 const desk={id:'desk',x:0,z:0,w:1.5,d:.8,y:.1,h:.8,role:'desk'};
 const laptop={id:'laptop',x:0,z:0,w:.5,d:.3,y:.92,h:.3,role:'computer'};
 const bad={...laptop,id:'bad',y:.65};
 const rug={id:'rug',x:0,z:0,w:2,d:2,y:.1,h:.03,role:'rug'};
 assert.ok(footprintOverlap(desk,laptop));
 assert.ok(!volumeOverlap(desk,laptop));
 assert.ok(volumeOverlap(desk,bad));
 assert.ok(!volumeOverlap(desk,rug));
 assert.deepEqual(collisionPairs([desk,laptop,rug]),[]);
 assert.deepEqual(collisionPairs([desk,bad,rug]),[['desk','bad']]);
});
for(const style of BUILDING_TYPE_IDS){
 test('interior quality and surface ownership: '+style,()=>{
  for(let i=0;i<3;i++){
   const layout=generateLayout('interior-regression-'+style+'-'+i,style);
   assert.deepEqual(collisionPairs(layout.props),[],'interpenetrating meshes');
   assert.deepEqual(layout.qualityReport.collisions,[],'quality report collisions');
   assert.equal(layout.qualityReport.roomCount,layout.rooms.length);
   for(const room of layout.rooms){
    const furniture=layout.props.filter(p=>p.roomId===room.id);
    assert.equal(room.furnitureCount,furniture.length);
    assert.ok(room.furnitureCount>=4,
      'insufficient furnishing '+style+' '+room.id);
    assert.ok(!room.missingEssentials?.length,
      'required furniture missing '+style+' '+room.id);
    const nav=roomAccessibility(layout,room,furniture);
    assert.ok(nav.doorOpen,'inaccessible doorway '+style+' '+room.id);
    assert.ok(Number.isFinite(nav.ratio)&&nav.ratio>=0&&nav.ratio<=1);
    assert.equal(room.accessibility,+nav.ratio.toFixed(3));
    for(const prop of furniture){
     const parent=prop.supportedBy&&layout.props.find(p=>p.id===prop.supportedBy);
     if(prop.supportedBy){
      assert.ok(parent,'orphaned surface prop '+prop.model);
      assert.equal(parent.roomId,room.id);
      assert.ok(prop.y>=parent.y+parent.h,
        'surface prop intersects its support '+prop.model);
     }
    }
   }
  }
 });
}
