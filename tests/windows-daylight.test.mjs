import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateTopology,BUILDING_TYPE_IDS,WALL_HEIGHT,GRID_W,GRID_H,worldCell,
 isWalkable} from '../src/topology.js';
import {generateBuilding} from '../src/building.js';
import {BUILDING_PROGRAMS,BUILDING_PROGRAM_IDS} from '../src/building-programs.js';
import {daylightAt,normalizeHour} from '../src/daylight.js';

const same=(a,b,tolerance=1e-8)=>Math.abs(a-b)<=tolerance;

test('day-night sun/sky state is periodic and has credible fixed ranges',()=>{
 for(const h of [-48,-1,0,5.5,6,9,12,14,18,19.5,24,27,48]){
  const d=daylightAt(h),cycle=daylightAt(h+24);
  assert.ok(same(d.hour,normalizeHour(h)));
  assert.deepEqual(d,cycle,'time of day must repeat every 24 hours');
  assert.ok(Number.isFinite(d.sunIntensity)&&d.sunIntensity>=0);
  assert.ok(d.hemisphereIntensity>=.40);
  assert.ok(d.exposure>=.70&&d.exposure<=1.21);
  assert.ok(d.skyColor>=0&&d.skyColor<=0xffffff);
  assert.ok(d.fogColor>=0&&d.fogColor<=0xffffff);
 }
 const noon=daylightAt(12),night=daylightAt(0),dusk=daylightAt(18);
 assert.ok(noon.sunlight>.99);
 assert.equal(night.sunlight,0);
 assert.ok(noon.sunIntensity>night.sunIntensity*8);
 assert.ok(noon.exposure>night.exposure);
 assert.notEqual(noon.skyColor,night.skyColor);
 assert.ok(dusk.twilight>0&&dusk.twilight<1);
});

for(const style of BUILDING_TYPE_IDS){
 test('real exterior apertures leave structural masonry and collision: '+style,()=>{
  for(const n of [0,1,2]){
   const layout=generateTopology('windows-'+style+'-'+n,style);
   const windows=layout.windows;
   assert.ok(windows.length>0,'no windows at all in '+style);
   assert.equal(windows.length,layout.windowBlockers.length);
   const roomType=new Map(layout.rooms.map(r=>[r.id,r.type]));
   for(const win of windows){
    assert.equal(win.privacy,false);
    assert.ok(!['bath','utility'].includes(roomType.get(win.roomId)),
     'private bathroom or utility has exposed glass');
    assert.ok(win.width>0&&win.width<layout.tile);
    assert.ok(win.height>0&&win.bottom>.1);
    const sill=layout.walls.find(w=>w.kind==='windowSill'&&
     same(w.x,win.x)&&same(w.z,win.z));
    const head=layout.walls.find(w=>w.kind==='windowHead'&&
     same(w.x,win.x)&&same(w.z,win.z));
    assert.ok(sill&&head,'window must have actual masonry above and below');
    assert.ok(same(sill.y-sill.height/2,.10),'sill touches bottom of wall');
    assert.ok(same(sill.y+sill.height/2,win.bottom));
    assert.ok(same(head.y-head.height/2,win.bottom+win.height));
    assert.ok(same(head.y+head.height/2,WALL_HEIGHT+.10));
    const barrier=layout.windowBlockers.find(b=>
     same(b.x,win.x)&&same(b.z,win.z));
    assert.ok(barrier);
    assert.equal(isWalkable(layout,win.x,win.z,.19),false,
     'window cannot become an invisible player exit');
    const nearbyDoor=[...layout.doors,layout.exteriorDoor].find(d=>
     d&&same(d.x,win.x)&&same(d.z,win.z));
    assert.equal(nearbyDoor,undefined,'window must not block the door leaf');
   }
   assert.deepEqual(generateTopology('windows-'+style+'-'+n,style).windows,
    windows,'window placement must be seed-deterministic');
  }
 });
}
test('every one of the 36 building programmes has windows and safe privacy',()=>{
 for(const id of BUILDING_PROGRAM_IDS){
  const p=BUILDING_PROGRAMS[id];
  const l=generateTopology('sunlight-prog-'+id,p.architecture,p);
  assert.ok(l.windows.length>0,id+' produced a windowless building');
  assert.ok(l.windows.length<l.walls.length);
  assert.ok(l.windows.every(w=>w.type!=='bath'&&w.type!=='utility'));
 }
});
test('upper stories have windows but no external exit hanging in midair',()=>{
 const b=generateBuilding('v14-apertures','villa',2,'family_house');
 assert.equal(b.stories.length,2);
 assert.ok(b.stories[0].layout.exteriorDoor?.locked);
 assert.equal(b.stories[1].layout.exteriorDoor,null);
 for(const story of b.stories){
  const l=story.layout;
  assert.ok(l.windows.length>=1,'story has no daylight openings');
  assert.equal(l.windows.length,l.windowBlockers.length);
  for(const w of l.windows){
   assert.equal(isWalkable(l,w.x,w.z,.19),false);
  }
 }
});
