import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateLayout,isWalkable,GRID_W,GRID_H,TILE,worldCell} from '../src/layout.js';
import {DIMENSIONS,FEATURE_COUNT,FURNITURE,ROOM_TYPES,
  semanticSimilarity,furnitureScore,vector} from '../src/semantics.js';

const seeds=['vitae-001','alpha','beta','gamma','delta','womp',...Array.from({length:40},(_,i)=>'seed-'+i)];
const overlap=(a,b,margin=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+margin&&
 Math.abs(a.z-b.z)<(a.d+b.d)/2+margin;

test('40 semantic dimensions and manually annotated furniture catalogue',()=>{
 assert.equal(FEATURE_COUNT,40);
 assert.equal(DIMENSIONS.length,new Set(DIMENSIONS).size);
 assert.ok(FURNITURE.length>=60);
 assert.ok(Object.keys(ROOM_TYPES).length>=10);
 for(const item of FURNITURE){
  assert.equal(item.vector.length,40);
  assert.ok(item.vector.some(x=>x>0));
  assert.ok(item.vector.every(x=>x>=0&&x<=3));
 }
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({sleep:3})),1);
 assert.equal(semanticSimilarity(vector({sleep:3}),vector({cook:3})),0);
 const bed=FURNITURE.find(x=>x.model==='beddouble');
 assert.ok(furnitureScore(bed,ROOM_TYPES.suite)>furnitureScore(bed,ROOM_TYPES.kitchen));
});

test('generation is deterministic and varies by seed',()=>{
 assert.deepEqual(generateLayout('same-layout'),generateLayout('same-layout'));
 assert.notDeepEqual(generateLayout('different-a').grid,generateLayout('different-b').grid);
 assert.notDeepEqual(generateLayout('different-a').rooms.map(x=>x.type),
   generateLayout('different-b').rooms.map(x=>x.type));
});
for(const seed of seeds){
 test('irregular building, connected rooms, clear doors and furniture: '+seed,()=>{
  const layout=generateLayout(seed);
  assert.equal(layout.rooms.length,6);
  assert.equal(layout.doors.length,6);
  assert.ok(layout.floors.length>200);
  assert.ok(layout.floors.some(x=>x.roomId===0));
  assert.equal(new Set(layout.rooms.map(r=>r.type)).size,6);
  assert.ok(layout.props.length>=30);
  // Hall must be a connected graph of actual floor cells, not merely visual geometry.
  const hall=layout.floors.filter(x=>x.roomId===0);
  const seen=new Set([hall[0].gz*GRID_W+hall[0].gx]);
  const queue=[hall[0]];
  while(queue.length){
    const p=queue.pop();
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const gx=p.gx+dx,gz=p.gz+dz;
     if(gx<0||gx>=GRID_W||gz<0||gz>=GRID_H)continue;
     const i=gz*GRID_W+gx;
     if(layout.grid[i]===0&&!seen.has(i)){seen.add(i);queue.push({gx,gz});}
    }
  }
  assert.equal(seen.size,hall.length,'hallway has disconnected sections');
  assert.ok(isWalkable(layout,layout.spawn.x,layout.spawn.z),'spawn blocked');
  for(const room of layout.rooms){
    assert.ok(room.cells.length>=7);
    assert.ok(room.cells.length*TILE*TILE===room.area);
    assert.ok(room.xMin<room.xMax&&room.zMin<room.zMax);
    const essential=ROOM_TYPES[room.type].required;
    const mandatory=layout.props.filter(p=>p.roomId===room.id&&p.mandatory).map(p=>p.model);
    for(const model of essential)assert.ok(mandatory.includes(model),'missing '+model+' in '+room.type);
  }
  for(const d of layout.doors){
    assert.ok(isWalkable(layout,d.x,d.z,.23),'door aperture blocked');
    assert.ok(isWalkable(layout,d.roomCell.x,d.roomCell.z,.23),'room throat blocked');
    assert.ok(isWalkable(layout,d.hallCell.x,d.hallCell.z,.23),'hallway throat blocked');
    assert.ok(d.dx!==0||d.dz!==0);
  }
  for(const item of layout.props){
    assert.ok(Number.isFinite(item.semanticScore));
    const {gx,gz}=worldCell(item.x,item.z);
    assert.equal(layout.grid[gz*GRID_W+gx],item.roomId,'furniture in wrong room');
  }
  const solids=layout.props.filter(p=>p.solid);
  for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++){
    assert.ok(!overlap(solids[i],solids[j],.10),
      'overlap '+solids[i].model+' / '+solids[j].model);
  }
 });
}
