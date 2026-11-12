// Public building-level API. A story is a complete independently seeded
// furnished floor. Circulation spaces are promoted into genuine room entities.
import {generateLayout} from './layout.js';
import {promoteCorridors} from './circulation.js';
import {chooseStaircase,STOREY_HEIGHT} from './stairs.js';
import {generateDecorations} from './decor.js';

export function generateBuilding(seed='vitae-001',type='auto',count=2){
 const floors=Math.max(1,Math.min(2,Math.floor(count)||2));
 const ground=generateLayout(String(seed),type);
 // Auto architecture must be decided once for the entire building. Different
 // storeys can have different room divisions, but the corridor spines align.
 const chosenStyle=ground.buildingType;
 const stories=Array.from({length:floors},(_,index)=>({
  index,elevation:index*STOREY_HEIGHT,
  layout:index===0?ground:generateLayout(String(seed)+'::upper',chosenStyle)
 }));
 const stairs=chooseStaircase(stories);
 const stairCells=stairs.flatMap(s=>s.cells);
 for(const story of stories){
  const layout=story.layout;
  promoteCorridors(layout,story.index,stairCells);
  // The private rooms are furnished first. Corridor decoration is allowed,
  // but solid hallway furniture is intentionally absent to preserve exits.
  layout.decorations=generateDecorations(layout,
    (story.index===0?String(seed):String(seed)+'::upper')+'::all-spaces');
  layout.qualityReport.decorations=layout.decorations.length;
 }
 const rooms=stories.flatMap(s=>s.layout.rooms.map(r=>({
  ...r,storey:s.index,globalId:s.index+':'+r.id
 })));
 // Enter on a real landing cell, never underneath the staircase slope.
 const start=stairs[0]?{
  x:stairs[0].start.x-stairs[0].dx*stories[0].layout.tile,
  z:stairs[0].start.z-stairs[0].dz*stories[0].layout.tile
 }:stories[0].layout.spawn;
 return {seed:String(seed),buildingType:stories[0].layout.buildingType,
  buildingName:stories[0].layout.buildingName,
  stories,stairs,rooms,levelHeight:STOREY_HEIGHT,
  spawn:{...start,y:0},geometryVersion:6};
}
