import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,isWalkable,GRID_W,GRID_H,TILE,worldCell,BUILDING_TYPE_IDS,BUILDING_TYPES} from '../src/layout.js';
import {DIMENSIONS,FEATURE_COUNT,FURNITURE,ROOM_TYPES,LOCATION_DIMENSIONS,
 locationVector,semanticSimilarity,furnitureScore,vector} from '../src/semantics.js';
import {CARDINAL_YAWS,forwardFromYaw,yawToward,cardinalToward,facingScore,
 modelYawCorrection} from '../src/orientation.js';

const overlap=(a,b,pad=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&
 Math.abs(a.z-b.z)<(a.d+b.d)/2+pad;
test('40D function and 16D placement vectors survive architecture changes',()=>{
 assert.equal(FEATURE_COUNT,40);assert.equal(DIMENSIONS.length,40);
 assert.equal(LOCATION_DIMENSIONS.length,16);
 assert.ok(FURNITURE.length>=60&&Object.keys(ROOM_TYPES).length>=11);
 for(const a of FURNITURE){
  assert.equal(a.vector.length,40);
  assert.equal(a.locationVector.length,16);
  assert.ok(a.locationVector.some(x=>x>0),a.model);
 }
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({sleep:3})),1);
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({cook:3})),0);
 assert.deepEqual(locationVector({corner:3}).filter(x=>x>0),[3]);
 const bed=FURNITURE.find(a=>a.model==='beddouble');
 assert.ok(furnitureScore(bed,ROOM_TYPES.suite)>furnitureScore(bed,ROOM_TYPES.kitchen));
});
test('rotations match -Z front and compensate imported model-native axes',()=>{
 const o={x:0,z:0};
 assert.deepEqual(forwardFromYaw(0),{x:0,z:-1});
 assert.ok(Math.abs(forwardFromYaw(Math.PI/2).x+1)<1e-10);
 for(const p of [{x:3,z:0},{x:-3,z:0},{x:0,z:3},{x:0,z:-3}]){
  const yaw=cardinalToward(o,p);
  assert.ok(CARDINAL_YAWS.some(v=>v===yaw));
  assert.ok(facingScore(yaw,o,p)>.999999);
  assert.ok(Math.cos(yaw-yawToward(o,p))>.999999);
 }
 assert.equal(modelYawCorrection('chair','diningChair'),Math.PI);
 assert.equal(modelYawCorrection('ruground','rug'),0);
});
test('explicitly forcing style and auto-seed selection are deterministic',()=>{
 assert.equal(BUILDING_TYPE_IDS.length,5);
 assert.deepEqual(generateLayout('same-seed','grid'),generateLayout('same-seed','grid'));
 assert.deepEqual(generateLayout('same-seed','auto'),generateLayout('same-seed','auto'));
 for(const style of BUILDING_TYPE_IDS){
  const l=generateLayout('test-architecture-'+style,style);
  assert.equal(l.buildingType,style);
  assert.equal(l.buildingName,BUILDING_TYPES[style].name);
 }
 assert.notDeepEqual(generateLayout('same-seed','compact').grid,
   generateLayout('same-seed','grid').grid);
});
const cases=[
 ...BUILDING_TYPE_IDS.flatMap(style=>Array.from({length:9},(_,i)=>({style,seed:'style-'+i}))),
 ...Array.from({length:17},(_,i)=>({style:'auto',seed:'auto-'+i}))
];
for(const {style,seed} of cases){
 test('connected architecture and directional furniture: '+style+' '+seed,()=>{
  const layout=generateLayout(seed,style);
  assert.ok(BUILDING_TYPE_IDS.includes(layout.buildingType));
  assert.ok(layout.rooms.length>=7&&layout.rooms.length<=21,'room count');
  assert.equal(layout.doors.length,layout.rooms.length);
  assert.ok(layout.props.length>=layout.rooms.length*4,'mostly empty rooms');
  assert.ok(layout.chamfers.length>=5,'diagonal walls');
  for(const ch of layout.chamfers)
   assert.ok(Math.abs(Math.abs(Math.sin(ch.angle))-Math.SQRT1_2)<1e-7,'not 45 degrees');
  const hall=layout.floors.filter(x=>x.roomId===0);
  const seen=new Set([hall[0].gz*GRID_W+hall[0].gx]),queue=[hall[0]];
  let edges=0;
  while(queue.length){
   const c=queue.pop();
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const gx=c.gx+dx,gz=c.gz+dz;
    if(gx<0||gz<0||gx>=GRID_W||gz>=GRID_H)continue;
    const k=gz*GRID_W+gx;
    if(layout.grid[k]===0){
     edges++;
     if(!seen.has(k)){seen.add(k);queue.push({gx,gz});}
    }
   }
  }
  assert.equal(seen.size,hall.length,'disconnected circulation graph');
  if(style==='central'||style==='grid'||style==='courtyard')
   assert.ok(edges/2-hall.length+1>=5,'circulation should have loops');
  assert.ok(isWalkable(layout,layout.spawn.x,layout.spawn.z),'spawn blocked');
  for(const r of layout.rooms){
   assert.ok(r.area>=12&&r.area<=60,'room size '+r.area);
   assert.ok(r.furnitureCount>=4,'underfurnished '+r.type);
   assert.ok(!r.missingEssentials?.length,'missing required '+r.missingEssentials);
   const present=layout.props.filter(p=>p.roomId===r.id&&p.mandatory).map(p=>p.model);
   for(const model of ROOM_TYPES[r.type].required)
    assert.ok(present.includes(model),'required '+r.type+' '+model);
  }
  for(const door of layout.doors){
   assert.ok(isWalkable(layout,door.x,door.z,.22),'door blocked');
   assert.ok(isWalkable(layout,door.roomCell.x,door.roomCell.z,.22),'entry blocked');
   assert.ok(isWalkable(layout,door.hallCell.x,door.hallCell.z,.22),'corridor blocked');
  }
  for(const p of layout.props){
   assert.ok(Number.isFinite(p.angle),'invalid rotation');
   assert.ok(CARDINAL_YAWS.some(angle=>Math.abs(Math.sin(p.angle-angle))<1e-8&&
    Math.cos(p.angle-angle)>.999999),'non-cardinal facing');
   const {gx,gz}=worldCell(p.x,p.z);
   assert.ok(gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H);
   assert.equal(layout.grid[gz*GRID_W+gx],p.roomId);
   if(p.supportedBy)assert.ok(layout.props.some(q=>q.id===p.supportedBy));
  }
  const solids=layout.props.filter(p=>p.solid);
  for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)
    assert.ok(!overlap(solids[i],solids[j],.072),
      'collision: '+solids[i].model+' / '+solids[j].model);
 });
}
