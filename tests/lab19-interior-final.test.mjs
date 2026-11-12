import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {generateBuilding} from '../src/building.js';
import {BUILDING_PROGRAMS,BUILDING_PROGRAM_IDS} from '../src/building-programs.js';
import {STYLE_FAMILIES,STYLE_FAMILY_IDS} from '../src/style-families.js';
import {makeInteriorFitout} from '../src/interior-fitout.js';
import {auditInterior,auditBuildingInteriors} from '../src/interior-audit.js';
import {qualityBudget,adaptivePixelRatio,PERFORMANCE_MODES} from '../src/performance-budget.js';
import {practicalLightAnchors} from '../src/practical-lighting.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';

test('all four graphics modes are bounded and no GPU shadow maps are requested',()=>{
 assert.deepEqual(PERFORMANCE_MODES,
  ['auto','economy','balanced','cinematic']);
 for(const mode of PERFORMANCE_MODES){
  for(const dpr of [.75,1,1.5,2,3]){
   const q=qualityBudget(mode,{
    width:480,deviceMemory:3,devicePixelRatio:dpr});
   assert.ok(q.pixelRatio<=dpr&&q.pixelRatio>=.60);
   assert.ok(q.practicalLights>=0&&q.practicalLights<=4);
   assert.equal(q.shadowMaps,false);
   assert.ok(q.minimumPixelRatio<=q.pixelRatio);
  }
 }
 assert.equal(qualityBudget('auto',{width:390,
  deviceMemory:2,devicePixelRatio:3}).selected,'economy');
 assert.equal(qualityBudget('auto',{width:1280,
  deviceMemory:8,devicePixelRatio:3}).selected,'balanced');
});
test('adaptive resolution shrinks only after sustained low FPS and rises slowly',()=>{
 let p={current:1.4,minimum:.8,maximum:1.4,lowSamples:0,highSamples:0};
 for(let n=0;n<3;n++){
  p=adaptivePixelRatio({...p,fps:19,targetFps:30});
  assert.equal(p.changed,false);
 }
 p=adaptivePixelRatio({...p,fps:19,targetFps:30});
 assert.equal(p.changed,true);
 assert.equal(p.current,1.28);
 let last=p.current;
 for(let n=0;n<3;n++){
  p=adaptivePixelRatio({...p,fps:28,targetFps:30});
  assert.equal(p.current,last,'neutral FPS must not oscillate');
 }
 for(let n=0;n<7;n++)p=adaptivePixelRatio({...p,fps:60,targetFps:30});
 assert.ok(p.current>last);
});
test('interior fitout is purely cosmetic and deterministic at same seed',()=>{
 const a=generateLayout('finish-stable','central',null,STYLE_FAMILIES.boutiqueHotel);
 const b=generateLayout('finish-stable','central',null,STYLE_FAMILIES.boutiqueHotel);
 assert.deepEqual(a.fitout,b.fitout);
 assert.ok(a.fitout.report.total>0);
 assert.equal(a.fitout.report.physicalObstaclesAdded,0);
 assert.ok(a.fitout.pieces.some(p=>p.kind==='jamb'));
 assert.ok(a.fitout.pieces.some(p=>p.kind==='threshold'));
 assert.ok(a.fitout.pieces.some(p=>p.kind==='overDoor'));
 assert.deepEqual(collisionPairs(a.props),[]);
 assert.ok(a.fitout.pieces.every(p=>
  [p.x,p.z,p.y,p.w,p.h,p.d].every(Number.isFinite)));
 const original=a.obstacles.length;
 const again=makeInteriorFitout(a,a.seed);
 assert.equal(original,a.obstacles.length,'fitout must never change physics');
 assert.deepEqual(again,a.fitout);
});
test('independent audit detects deliberately damaged door lintels and windows',()=>{
 const l=generateLayout('finish-audit','villa',null,STYLE_FAMILIES.modern);
 const pristine=auditInterior(l);
 assert.equal(pristine.counts.missingLintels,0);
 assert.equal(pristine.counts.unsafeWindows,0);
 const withoutLintel={...l,walls:l.walls.filter(w=>w.kind!=='lintel')};
 const detected=auditInterior(withoutLintel);
 assert.ok(detected.counts.missingLintels>0);
 assert.ok(detected.score<pristine.score);
 if(l.windows.length){
  const w=l.windows[0];
  const withoutHead={...l,
   walls:l.walls.filter(p=>!(p.kind==='windowHead'&&p.x===w.x&&p.z===w.z))};
  assert.ok(auditInterior(withoutHead).counts.unsafeWindows>0);
 }
});
for(const grammar of BUILDING_TYPE_IDS){
 test('eight architectural grammars produce legal final finishes: '+grammar,()=>{
  const b=generateBuilding('finish-grammar-'+grammar,grammar,2,'family_house','modern');
  const report=auditBuildingInteriors(b);
  assert.equal(report.stories,2);
  assert.equal(report.finishParts,
   b.stories.reduce((sum,s)=>sum+s.layout.fitout.report.total,0));
  for(const story of b.stories){
   assert.equal(story.layout.fitout.report.physicalObstaclesAdded,0);
   assert.equal(story.layout.interiorAudit.counts.missingLintels,0);
   assert.equal(story.layout.interiorAudit.counts.unsafeWindows,0);
   assert.equal(story.layout.interiorAudit.counts.collisions,0);
   assert.ok(story.layout.fitout.report.total>8);
   const lights=practicalLightAnchors(story.layout);
   assert.ok(lights.length<=4);
   assert.deepEqual(lights,practicalLightAnchors(story.layout));
  }
 });
}
for(const category of ['konut','ticaret','konaklama','kamusal','endüstri']){
 test('programme '+category+' has meaningful styled and functional interiors',()=>{
  const id=BUILDING_PROGRAM_IDS.find(x=>BUILDING_PROGRAMS[x].category===category);
  const p=BUILDING_PROGRAMS[id];
  const b=generateBuilding('finish-program-'+category,'auto',2,id,'sleek');
  assert.equal(b.interiorStyle,'sleek');
  assert.equal(b.stories.length,2);
  for(const story of b.stories){
   assert.ok(story.layout.fitout.report.total>0);
   assert.ok(story.layout.decorations.length>0);
   assert.ok(story.layout.wallFeatures.length>=0);
   assert.equal(story.layout.interiorAudit.counts.badFinishGeometry,0);
   assert.equal(story.layout.interiorAudit.counts.unsafeWindows,0);
   assert.deepEqual(collisionPairs(story.layout.props),[]);
   for(const room of story.layout.rooms){
    if(room.circulation)continue;
    const props=story.layout.props.filter(x=>x.roomId===room.id);
    const nav=roomAccessibility(story.layout,room,props);
    assert.ok(nav.doorOpen&&nav.ratio>=.82,
     category+' '+room.type+' door/navigability broken');
   }
  }
 });
}
test('fourteen interior styles each produce reproducible final-finish geometry',()=>{
 for(const id of STYLE_FAMILY_IDS){
  const a=generateLayout('finish-'+id,'compact',null,STYLE_FAMILIES[id]);
  const b=generateLayout('finish-'+id,'compact',null,STYLE_FAMILIES[id]);
  assert.deepEqual(a.fitout,b.fitout);
  assert.equal(a.interiorAudit.counts.badFinishGeometry,0);
  assert.equal(a.interiorAudit.counts.unsafeWindows,0);
 }
});

test('hotel signage numbers uniquely identify floor and room',()=>{
 const b=generateBuilding('hotel-numbers','grid',2,'hotel','boutiqueHotel');
 const suites=b.stories.flatMap((story)=>story.layout.signage
  .filter(sign=>sign.type==='suite')
  .map(sign=>({floor:story.index,label:sign.label})));
 assert.ok(suites.length>=2);
 assert.equal(new Set(suites.map(s=>s.label)).size,suites.length,
  'room numbers must not repeat on different hotel floors');
 for(const s of suites){
  assert.ok(s.label.startsWith('ODA '+String(s.floor+1)));
 }
});
