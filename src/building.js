// Public building-level API. A story is a complete independently seeded
// furnished floor. Circulation spaces are promoted into genuine room entities.
import {generateLayout} from './layout.js';
import {promoteCorridors} from './circulation.js';
import {chooseStaircase,STOREY_HEIGHT} from './stairs.js';
import {generateDecorations} from './decor.js';
import {sealExteriorDoor} from './topology.js';
import {resolveBuildingProgram} from './building-programs.js';
import {resolveInteriorStyle} from './style-families.js';
import {generateWallFeatures,wallFeatureReport} from './wall-features.js';
import {roomGenerationReport} from './room-archetypes.js';
import {makeInteriorFitout} from './interior-fitout.js';
import {auditInterior,auditBuildingInteriors} from './interior-audit.js';
import {generateRoomSignage} from './room-signage.js';

export function generateBuilding(seed='vitae-001',type='auto',count=2,programId='auto',styleId='auto'){
 const floors=Math.max(1,Math.min(2,Math.floor(count)||2));
 const program=resolveBuildingProgram(programId);
 const style=type==='auto'&&program?program.architecture:type;
 const interiorStyle=resolveInteriorStyle(seed,program,styleId);
 const ground=generateLayout(String(seed),style,program,interiorStyle);
 // Auto architecture must be decided once for the entire building. Different
 // storeys can have different room divisions, but the corridor spines align.
 const chosenStyle=ground.buildingType;
 const stories=Array.from({length:floors},(_,index)=>({
  index,elevation:index*STOREY_HEIGHT,
  layout:index===0?ground:generateLayout(String(seed)+'::upper',chosenStyle,program,interiorStyle)
 }));
 const stairs=chooseStaircase(stories);
 const stairCells=stairs.flatMap(s=>s.cells);
 for(const story of stories){
  const layout=story.layout;
  if(story.index>0)sealExteriorDoor(layout);
  promoteCorridors(layout,story.index,stairCells);
  // The private rooms are furnished first. Corridor decoration is allowed,
  // but solid hallway furniture is intentionally absent to preserve exits.
  layout.decorations=generateDecorations(layout,
    (story.index===0?String(seed):String(seed)+'::upper')+'::all-spaces');
  layout.qualityReport.decorations=layout.decorations.length;
  layout.wallFeatures=generateWallFeatures(layout);
  // Recalculate ceiling details after stair cutouts and corridor promotion.
  layout.fitout=makeInteriorFitout(layout,layout.seed);
  layout.signage=generateRoomSignage(layout);
  layout.interiorAudit=auditInterior(layout);
  layout.styleReport={...roomGenerationReport(layout),
   wallTreatments:wallFeatureReport(layout),
   fitout:layout.fitout.report,
   auditScore:layout.interiorAudit.score};
 }
 const rooms=stories.flatMap(s=>s.layout.rooms.map(r=>({
  ...r,storey:s.index,globalId:s.index+':'+r.id
 })));
 // Enter on a real landing cell, never underneath the staircase slope.
 const start=stairs[0]?{
  x:stairs[0].start.x-stairs[0].dx*stories[0].layout.tile,
  z:stairs[0].start.z-stairs[0].dz*stories[0].layout.tile
 }:stories[0].layout.spawn;
 const result={seed:String(seed),interiorStyle:interiorStyle.id,
  programId:program?.id||'auto',
  programLabel:program?.label||'Karma kullanım',
  buildingType:stories[0].layout.buildingType,
  buildingName:stories[0].layout.buildingName,
  stories,stairs,rooms,levelHeight:STOREY_HEIGHT,
  spawn:{...start,y:0},geometryVersion:7};
 result.interiorAudit=auditBuildingInteriors(result);
 return result;
}
