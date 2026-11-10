// Public API: topology and furnishing are independent, independently testable modules.
import {generateTopology,TILE,GRID_W,GRID_H,WALL_HEIGHT} from './topology.js';
import {populateRooms} from './placement.js';
export {TILE,GRID_W,GRID_H,WALL_HEIGHT,cellWorld,worldCell,
  isWalkable,seededRandom} from './topology.js';
export {ROOM_NAMES,ROOM_THEMES} from './semantics.js';

export function generateLayout(seed='vitae-001'){
 const layout=generateTopology(String(seed));
 return populateRooms(layout,String(seed));
}
