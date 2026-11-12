import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createModelQueue,validateGLB} from '../src/model-queue.js';
import {FURNITURE} from '../src/semantics.js';
import {FIXTURE_MODEL_IDS} from '../src/fixture-specs.js';
import {ensembleBonus,summarizeCompositions} from '../src/room-ensembles.js';
import {generateLayout,BUILDING_TYPE_IDS} from '../src/layout.js';
import {collisionPairs,roomAccessibility} from '../src/interior-quality.js';

const mockGLB=()=>{
 const bytes=new ArrayBuffer(24),d=new DataView(bytes);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);
 d.setUint32(8,24,true);d.setUint32(12,4,true);
 return bytes;
};
const parse=async()=>({scene:{traverse(cb){cb({isMesh:true})}}});
test('GLB validation rejects corrupt models before Three.js parsing',()=>{
 assert.strictEqual(validateGLB(mockGLB()).byteLength,24);
 for(const length of [0,8,16]){
  assert.throws(()=>validateGLB(new ArrayBuffer(length)));
 }
 const bad=mockGLB();new DataView(bad).setUint32(0,0,true);
 assert.throws(()=>validateGLB(bad),/magic/);
 const truncated=mockGLB();
 new DataView(truncated).setUint32(8,999,true);
 assert.throws(()=>validateGLB(truncated),/length/);
});
test('global asset queue deduplicates and bounds concurrent downloads',async()=>{
 let active=0,max=0,calls=0;
 const loader=createModelQueue({maxConcurrent:2,retries:1,
  fetchBuffer:async()=>{
   calls++;max=Math.max(max,++active);
   await new Promise(resolve=>setTimeout(resolve,6));
   active--;return mockGLB();
  },parseBuffer:parse});
 const [a,b,c,d]=await Promise.all([
  loader.load('/a.glb'),loader.load('/a.glb'),
  loader.load('/b.glb'),loader.load('/c.glb')
 ]);
 assert.strictEqual(a,b,'same model should parse once');
 assert.ok(c.scene&&d.scene);
 assert.equal(calls,3);assert.ok(max<=2,'download concurrency cap failed');
 assert.equal(loader.metrics.loaded,3);
 assert.equal(loader.metrics.requested,3);
});
test('missing local GLB falls back to the pinned mirror and caches success',async()=>{
 const attempts=[];
 const loader=createModelQueue({maxConcurrent:1,retries:2,
  fetchBuffer:async(url)=>{
   attempts.push(url);
   if(url.startsWith('/')){const err=Error('missing');err.status=404;throw err;}
   return mockGLB();
  },parseBuffer:parse});
 const model=await loader.load('/models/chair.glb','https://pinned.example/chair.glb');
 assert.ok(model.scene);
 assert.deepEqual(attempts,['/models/chair.glb','https://pinned.example/chair.glb']);
 assert.equal(loader.metrics.fallback,1);
 assert.equal(loader.metrics.failed,0);
 await loader.load('/models/chair.glb','https://pinned.example/chair.glb');
 assert.equal(attempts.length,2,'cache was not reused');
});
test('failed model is reported and can be retried on the next request',async()=>{
 let successes=false;
 const loader=createModelQueue({maxConcurrent:1,retries:1,
  fetchBuffer:async()=>successes?mockGLB():new ArrayBuffer(0),
  parseBuffer:parse});
 await assert.rejects(loader.load('/broken.glb'));
 assert.equal(loader.metrics.errors.length,1);
 successes=true;
 await loader.load('/broken.glb');
 assert.equal(loader.metrics.loaded,1);
});
test('source vendor catalogue includes 84 actual furniture and fixture GLBs',()=>{
 const models=new Set(FURNITURE.map(a=>a.model));
 assert.equal(models.size,81);
 for(const id of FIXTURE_MODEL_IDS)models.add(id);
 assert.equal(models.size,84);
});
test('ensemble placement rewards separated chairs around tables',()=>{
 const room={type:'dining'},table={role:'diningTable',x:0,z:0};
 const p={x:1,z:0,angle:Math.PI/2};
 const existing=[table,{role:'diningChair',x:1.08,z:.08}];
 const crowded=ensembleBonus(room,{role:'diningChair'},p,existing);
 const balanced=ensembleBonus(room,{role:'diningChair'},
  {x:-1,z:0,angle:-Math.PI/2},existing);
 assert.ok(balanced>crowded,{balanced,crowded});
});
test('kitchen triangle prefers working distances to cramped or remote areas',()=>{
 const room={type:'kitchen'},asset={role:'cooking'};
 const peers=[{role:'sink',x:0,z:0},{role:'coldStorage',x:3,z:0}];
 const good=ensembleBonus(room,asset,{x:1.5,z:1.25},peers);
 const bad=ensembleBonus(room,asset,{x:0,z:0},peers);
 assert.ok(good>bad,{good,bad});
});
for(const style of BUILDING_TYPE_IDS){
 test('mega-update preserves classic safe deterministic composition: '+style,()=>{
  const l=generateLayout('mega-ensemble-'+style,style);
  assert.ok(l.placementMethod.startsWith('semantic-rules'));
  assert.deepEqual(collisionPairs(l.props),[]);
  assert.ok(l.compositionReport.total>=0);
  assert.ok(l.compositionReport.complete<=l.compositionReport.total);
  const again=generateLayout('mega-ensemble-'+style,style);
  assert.deepEqual(l.props,again.props,'same seed must give same furniture');
  assert.deepEqual(l.compositionReport,again.compositionReport);
  for(const room of l.rooms){
   const props=l.props.filter(p=>p.roomId===room.id);
   const nav=roomAccessibility(l,room,props);
   assert.ok(nav.doorOpen&&nav.ratio>=.82,room.name+' blocked');
  }
 });
}
