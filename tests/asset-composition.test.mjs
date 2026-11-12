import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModelFor,FIXTURE_MODEL_IDS} from '../src/fixture-specs.js';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {facingScore} from '../src/orientation.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';
import {FURNITURE,FURNITURE_BY_ID} from '../src/semantics.js';

test('verified fixture classes select native Kenney meshes, not mislabeled chandeliers',()=>{
 assert.deepEqual(FIXTURE_MODEL_IDS,
  ['lampwall','lampsquareceiling','ceilingfan']);
 assert.equal(fixtureModelFor({source:'wall',kind:'sconce'}),'lampwall');
 assert.equal(fixtureModelFor({source:'ceiling',kind:'flush',variant:0}),'ceilingfan');
 assert.equal(fixtureModelFor({source:'ceiling',kind:'flush',variant:2}),'lampsquareceiling');
 for(const kind of ['chandelier','pendant','track'])
  assert.equal(fixtureModelFor({source:'ceiling',kind}),null);
 assert.equal(fixtureModelFor({source:'surface',kind:'sconce'}),null);
});
test('twenty additional CC0 furniture models are registered with valid role vectors',()=>{
 const newIds=['chaircushion','chairmodernframecushion','bench',
  'benchcushionlow','bookcaseclosedwide','bookcasecloseddoors',
  'cabinetbeddrawer','cabinettelevisiondoors','tablecoffeeglass',
  'tablecoffeeglasssquare','kitchenfridgesmall','kitchenfridgebuiltin',
  'kitchenstoveelectric','bathroomsinksquare','toiletsquare',
  'stoolbarsquare','kitchenmicrowave','kitchenblender','toaster','rugdoormat'];
 for(const id of newIds){
  const item=FURNITURE_BY_ID[id];
  assert.ok(item,id+' is missing');
  assert.equal(item.vector.length,40);
  assert.equal(item.locationVector.length,16);
 }
 assert.equal(new Set(FURNITURE.map(a=>a.model)).size,FURNITURE.length);
});
for(const style of BUILDING_TYPE_IDS){
 test('furniture orientation pass preserves physical floorplan invariants: '+style,()=>{
  const layout=generateLayout('facing-audit-'+style,style);
  const audit=layout.orientationReport;
  assert.ok(Number.isInteger(audit.audited));
  assert.ok(audit.audited===audit.improved+audit.unchanged);
  for(const correction of audit.changed){
   assert.ok(correction.after>correction.before);
   assert.ok(correction.after<=1);
   const p=layout.props.find(x=>x.id===correction.id);
   const target=layout.props.find(x=>x.id===p.faceTarget);
   assert.ok(p&&target,'orphaned orientation target');
   assert.ok(facingScore(p.angle,p,target)>=correction.before);
  }
  assert.deepEqual(collisionPairs(layout.props),[]);
  for(const room of layout.rooms){
   const nav=roomAccessibility(layout,room,
    layout.props.filter(p=>p.roomId===room.id));
   assert.ok(nav.doorOpen&&nav.ratio>=.82,'rotation blocked '+room.id);
  }
 });
}
