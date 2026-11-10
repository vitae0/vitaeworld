import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,isWalkable,GRID_W,GRID_H,TILE,worldCell} from '../src/layout.js';
import {DIMENSIONS,FEATURE_COUNT,FURNITURE,ROOM_TYPES,LOCATION_DIMENSIONS,
 locationVector,semanticSimilarity,furnitureScore,vector} from '../src/semantics.js';

const seeds=['vitae-001','alpha','beta','gamma','delta','womp',
 ...Array.from({length:55},(_,i)=>'seed-'+i)];
const overlap=(a,b,pad=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&
 Math.abs(a.z-b.z)<(a.d+b.d)/2+pad;
test('40D function vectors plus independently rated 16D location vectors',()=>{
 assert.equal(FEATURE_COUNT,40);
 assert.equal(DIMENSIONS.length,40);
 assert.equal(LOCATION_DIMENSIONS.length,16);
 assert.equal(new Set(LOCATION_DIMENSIONS).size,16);
 assert.ok(FURNITURE.length>=60);
 assert.ok(Object.keys(ROOM_TYPES).length>=11);
 for(const a of FURNITURE){
  assert.equal(a.vector.length,40);
  assert.equal(a.locationVector.length,16);
  assert.ok(a.locationVector.some(x=>x>0),'missing location vector '+a.model);
  assert.ok(a.locationVector.every(x=>x>=0&&x<=3));
 }
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({sleep:3})),1);
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({cook:3})),0);
 assert.deepEqual(locationVector({corner:3}).filter(x=>x>0),[3]);
 const bed=FURNITURE.find(a=>a.model==='beddouble');
 assert.ok(furnitureScore(bed,ROOM_TYPES.suite)>furnitureScore(bed,ROOM_TYPES.kitchen));
});
test('same seed gives exactly the same geometry, furniture and orientation',()=>{
 assert.deepEqual(generateLayout('repeat-me'),generateLayout('repeat-me'));
 assert.notDeepEqual(generateLayout('a').grid,generateLayout('b').grid);
 assert.notDeepEqual(generateLayout('a').rooms.map(r=>r.type),
  generateLayout('b').rooms.map(r=>r.type));
});
for(const seed of seeds){
 test('multi-loop compact building and safe placements: '+seed,()=>{
  const layout=generateLayout(seed);
  assert.equal(layout.rooms.length,16);
  assert.equal(layout.doors.length,16);
  assert.ok(layout.floors.length>260);
  assert.ok(layout.props.length>=110,'not enough furniture');
  assert.ok(layout.chamfers.length>=8,'diagonal corner architecture missing');
  for(const ch of layout.chamfers)assert.ok(
   Math.abs(Math.abs(Math.sin(ch.angle))-Math.SQRT1_2)<.000001,'wall must be 45°');
  const hall=layout.floors.filter(c=>c.roomId===0);
  const visited=new Set([hall[0].gz*GRID_W+hall[0].gx]),queue=[hall[0]];
  let edgeCount=0;
  while(queue.length){
   const p=queue.pop();
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const gx=p.gx+dx,gz=p.gz+dz;
    if(gx<0||gz<0||gx>=GRID_W||gz>=GRID_H)continue;
    const id=gz*GRID_W+gx;
    if(layout.grid[id]===0){
     edgeCount++;
     if(!visited.has(id)){visited.add(id);queue.push({gx,gz});}
    }
   }
  }
  assert.equal(visited.size,hall.length,'circulation must be fully connected');
  const cycles=edgeCount/2-hall.length+1;
  assert.ok(cycles>=8,'the hall should contain multiple independent loops');
  assert.ok(isWalkable(layout,layout.spawn.x,layout.spawn.z),'blocked spawn');
  for(const room of layout.rooms){
   assert.ok(room.area>=15&&room.area<=45,'oversized room: '+room.area);
   assert.ok(room.furnitureCount>=5,'empty room: '+room.type);
   assert.equal(room.cells.length*TILE*TILE,room.area);
   assert.ok(!room.missingEssentials?.length,
    'missing essentials in '+room.type+': '+room.missingEssentials);
   const mandatory=layout.props.filter(p=>p.roomId===room.id&&p.mandatory).map(p=>p.model);
   for(const model of ROOM_TYPES[room.type].required)
    assert.ok(mandatory.includes(model),'required '+model);
  }
  for(const door of layout.doors){
   assert.ok(isWalkable(layout,door.x,door.z,.23),'door threshold');
   assert.ok(isWalkable(layout,door.roomCell.x,door.roomCell.z,.23),'room entry');
   assert.ok(isWalkable(layout,door.hallCell.x,door.hallCell.z,.23),'hall entry');
  }
  for(const item of layout.props){
   const {gx,gz}=worldCell(item.x,item.z);
   assert.equal(layout.grid[gz*GRID_W+gx],item.roomId,'wrong room: '+item.model);
   assert.ok(Number.isFinite(item.semanticScore));
   assert.ok(Number.isFinite(item.locationScore));
   assert.ok(item.angle% (Math.PI/2)===0||Math.abs(item.angle%(Math.PI/2))<1e-7);
   if(item.supportedBy)assert.ok(layout.props.some(p=>p.id===item.supportedBy),'unparented prop');
  }
  const solids=layout.props.filter(p=>p.solid);
  for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)
   assert.ok(!overlap(solids[i],solids[j],.075),
      'collision '+solids[i].model+' '+solids[j].model);
 });
}
