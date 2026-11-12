// Public API: topology and furnishing are independent, independently testable modules.
import {generateTopology,TILE,GRID_W,GRID_H,WALL_HEIGHT} from './topology.js';
import {populateRooms} from './placement.js';
import {generateDecorations} from './decor.js';
import {pickBestTopology} from './plan-score.js';
import {resolveInteriorStyle} from './style-families.js';
import {assignRoomArchetypes,roomGenerationReport} from './room-archetypes.js';
import {generateWallFeatures,wallFeatureReport} from './wall-features.js';
export {TILE,GRID_W,GRID_H,WALL_HEIGHT,BUILDING_TYPES,BUILDING_TYPE_IDS,cellWorld,worldCell,
  isWalkable,seededRandom} from './topology.js';
export {ROOM_NAMES,ROOM_THEMES} from './semantics.js';

export function generateLayout(seed='vitae-001',type='auto',program=null,interiorStyle=null){
 const preferred=generateTopology(String(seed),type,program);
 const options=[preferred];
 for(let n=1;n<=2;n++)options.push(
  generateTopology(String(seed)+'::plan-'+n,preferred.buildingType,program));
 const selected=pickBestTopology(options);
 const layout=selected.layout;
 layout.seed=String(seed);
 layout.interiorStyle=interiorStyle||resolveInteriorStyle(seed,program);
 assignRoomArchetypes(layout,seed);
 layout.planQuality={score:selected.score,variant:selected.index,
  candidates:options.length,method:'rule-based'};
 const furnished=populateRooms(layout,String(seed));
 furnished.decorations=generateDecorations(furnished,String(seed));
 furnished.qualityReport.decorations=furnished.decorations.length;
 furnished.wallFeatures=generateWallFeatures(furnished);
 furnished.styleReport={...roomGenerationReport(furnished),
  wallTreatments:wallFeatureReport(furnished)};
 return furnished;
}
