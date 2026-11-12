import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_FAMILY_IDS,STYLE_FAMILIES,resolveInteriorStyle} from '../src/style-families.js';
import {PROCEDURAL_SURFACES,proceduralSurfaceColor} from '../src/procedural-surfaces.js';
import {generateLayout} from '../src/layout.js';
import {generateBuilding} from '../src/building.js';
import {floorVisibilityPlan} from '../src/floor-visibility.js';
import {ROOM_ARCHETYPES,archetypePlacementBonus} from '../src/room-archetypes.js';
import {wallFeatureReport} from '../src/wall-features.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';
import {recipeFromQuery,recipeQuery} from '../src/scene-recipe.js';

test('14 real style families with distinct coordinated material and light presets',()=>{
 assert.equal(STYLE_FAMILY_IDS.length,14);
 const pairs=new Set();
 for(const id of STYLE_FAMILY_IDS){
  const style=STYLE_FAMILIES[id];
  assert.equal(style.id,id);assert.ok(style.label);
  assert.ok(PROCEDURAL_SURFACES.includes(style.floor)||['oak','wood','marble','terracotta'].includes(style.floor));
  assert.ok(PROCEDURAL_SURFACES.includes(style.wall)||['plaster','brick'].includes(style.wall));
  assert.ok(PROCEDURAL_SURFACES.includes(style.trim));
  assert.ok(style.decor>=0&&style.decor<=1.3);
  pairs.add(style.floor+'|'+style.wall+'|'+style.light);
 }
 assert.equal(pairs.size,14,'styles must not be just different names');
 assert.deepEqual(resolveInteriorStyle('a',{category:'ticaret',id:'bakery'}),
  resolveInteriorStyle('a',{category:'ticaret',id:'bakery'}));
 assert.equal(resolveInteriorStyle('a',null,'rusty'),STYLE_FAMILIES.rusty);
 assert.throws(()=>resolveInteriorStyle('a',null,'invalid'));
});

test('all 27 local procedural material patterns are finite, diverse and repeatable',()=>{
 assert.equal(PROCEDURAL_SURFACES.length,27);
 const signatures=new Set();
 for(const kind of PROCEDURAL_SURFACES){
  const pixels=[[0,0],[12,33],[65,59],[122,122],[240,19],[245,253]]
   .map(([x,y])=>proceduralSurfaceColor(kind,x,y));
  for(const p of pixels){
   assert.equal(p.length,3);
   for(const c of p)assert.ok(Number.isInteger(c)&&c>=0&&c<=255);
  }
  signatures.add(pixels.flat().join(':'));
  assert.deepEqual(proceduralSurfaceColor(kind,65,59),pixels[2]);
 }
 assert.ok(signatures.size>=23,'surface patterns should be visually distinct');
 assert.equal(proceduralSurfaceColor('unknown',0,0),null);
});

test('all floors show their shell and deck, both storeys show furniture',()=>{
 const b=generateBuilding('allfloors-lab18','villa',2,'family_house','sleek');
 for(const current of [0,1])for(const first of [true,false]){
  const plan=floorVisibilityPlan(b,current,first,current*b.levelHeight);
  assert.ok(plan.every(s=>s.rooms&&s.deck&&s.detail&&s.tier==='full'));
  assert.equal(plan.filter(s=>s.ceiling).length,Number(first));
  if(first)assert.equal(plan[current].ceiling,true);
 }
 const future={stories:Array.from({length:5},(_,index)=>({index})),
  stairs:[],levelHeight:3.65};
 const plan=floorVisibilityPlan(future,0,true,0);
 assert.equal(plan.length,5);
 assert.ok(plan.every(s=>s.rooms&&s.deck));
 assert.equal(plan[0].tier,'full');assert.equal(plan[1].tier,'full');
 assert.equal(plan[2].tier,'shell');
 assert.equal(plan[4].detail,false);
});

for(const id of STYLE_FAMILY_IDS){
 test('style '+id+' preserves deterministic geometry, collision and access',()=>{
  const style=STYLE_FAMILIES[id];
  const seed='style-qa-'+id;
  const a=generateLayout(seed,'compact',null,style);
  const b=generateLayout(seed,'compact',null,style);
  assert.equal(a.interiorStyle.id,id);
  assert.equal(a.styleReport.style,id);
  assert.deepEqual(a.props,b.props);
  assert.deepEqual(a.wallFeatures,b.wallFeatures);
  assert.deepEqual(a.styleReport,b.styleReport);
  assert.deepEqual(collisionPairs(a.props),[]);
  assert.equal(a.qualityReport.collisions.length,0);
  assert.ok(a.rooms.length>=4);
  for(const room of a.rooms){
   const available=ROOM_ARCHETYPES[room.type];
   assert.ok(available?available.includes(room.archetype):
    room.archetype==='utility');
   const props=a.props.filter(p=>p.roomId===room.id);
   const nav=roomAccessibility(a,room,props);
   assert.ok(nav.doorOpen&&nav.ratio>=.82,
    id+' room '+room.name+' became inaccessible');
  }
  assert.ok(a.wallFeatures.every(x=>
   a.rooms.some(r=>r.id===x.roomId)));
  assert.equal(wallFeatureReport(a).total,a.wallFeatures.length);
  assert.ok(a.styleReport.decorationPerRoom>=0);
 });
}
test('minimal has intentionally less dressing than rusty on the same seed',()=>{
 const minimal=generateLayout('density-contrast','central',null,STYLE_FAMILIES.minimal);
 const rusty=generateLayout('density-contrast','central',null,STYLE_FAMILIES.rusty);
 assert.ok(rusty.decorations.length>minimal.decorations.length,
  'style decor density must affect actual generated dressing');
 assert.equal(minimal.wallFeatures.length,0);
 assert.ok(rusty.wallFeatures.length>0);
});
test('multi-floor family identity and link URL are identical across reloads',()=>{
 const first=generateBuilding('lab18-share','central',2,'boutique_hotel','boutiqueHotel');
 const again=generateBuilding('lab18-share','central',2,'boutique_hotel','boutiqueHotel');
 assert.equal(first.interiorStyle,'boutiqueHotel');
 assert.ok(first.stories.every(s=>s.layout.interiorStyle.id==='boutiqueHotel'));
 assert.deepEqual(first.stories.map(s=>s.layout.styleReport),
  again.stories.map(s=>s.layout.styleReport));
 assert.deepEqual(first.stories.map(s=>s.layout.props),
  again.stories.map(s=>s.layout.props));
 const url=recipeQuery({seed:'lab18-share',style:'central',
  program:'boutique_hotel',interior:'boutiqueHotel'});
 assert.equal(recipeFromQuery(url).interior,'boutiqueHotel');
 assert.equal(recipeFromQuery('?interior=whatever').interior,'auto');
});
test('room archetype bias is bounded and does not add geometry blockers',()=>{
 const room={archetype:'mediaWall',type:'lounge',
  x:0,z:0,xMin:-3,xMax:3,zMin:-3,zMax:3};
 const p={x:1.3,z:.4,angle:0};
 const score=archetypePlacementBonus(room,{role:'sofa'},p,[]);
 assert.ok(score>=0&&score<=.36);
 assert.equal(archetypePlacementBonus({...room,archetype:'utility'},
  {role:'sink'},p,[]),0);
});
