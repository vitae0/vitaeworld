// Public API: topology and furnishing are independent, independently testable modules.
import {generateTopology,TILE,GRID_W,GRID_H,WALL_HEIGHT} from './topology.js';
import {populateRooms} from './placement.js';
export {TILE,GRID_W,GRID_H,WALL_HEIGHT,BUILDING_TYPES,BUILDING_TYPE_IDS,cellWorld,worldCell,
  isWalkable,seededRandom} from './topology.js';
export {ROOM_NAMES,ROOM_THEMES} from './semantics.js';

export function generateLayout(seed='vitae-001',type='auto'){
 const layout=generateTopology(String(seed),type);
 return populateRooms(layout,String(seed));
}
