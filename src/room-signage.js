// Lab 19: compact wayfinding above real doorway lintels.
// Labels do not become interactive doors or change any physics.
import {DOOR_HEIGHT} from './topology.js';

const NAMES=Object.freeze({
 bath:'WC',suite:'ODA',lounge:'SALON',kitchen:'MUTFAK',
 dining:'YEMEK',office:'OFİS',studio:'ATÖLYE',
 library:'KÜTÜPHANE',gallery:'GALERİ',games:'OYUN',
 wellness:'SPA',utility:'SERVİS',corridor:'KORİDOR',
 lobby:'LOBİ',landing:'KAT'
});
export function generateRoomSignage(layout,floor=0){
 const rooms=new Map(layout.rooms.map(r=>[r.id,r]));
 const isHotel=['konaklama'].includes(layout.buildingProgram?.category);
 const signs=[];
 for(const door of layout.doors){
  const room=rooms.get(door.roomId);
  if(!room)continue;
  const alongX=door.axis==='x';
  const hall=door.hallCell||door.roomCell||door;
  const facing=alongX?
   (hall.z>=door.z?0:Math.PI):
   (hall.x>=door.x?Math.PI/2:-Math.PI/2);
  const category=NAMES[room.type]||'ODA';
  const label=room.type==='bath'?'WC':
   isHotel&&room.type==='suite'?'ODA '+String(floor+1)+String(room.id).padStart(2,'0'):
   category+' '+String(room.id).padStart(2,'0');
  // Mounted on solid lintel 25 cm above door top.
  const normal=alongX?{x:0,z:Math.cos(facing)}:
   {x:Math.sin(facing),z:0};
  signs.push({
   roomId:room.id,type:room.type,
   x:door.x+normal.x*.091,
   z:door.z+normal.z*.091,
   y:.10+DOOR_HEIGHT+.31,
   angle:facing,label,width:.82,height:.21,
   material:layout.interiorStyle?.id||'modern'
  });
 }
 return signs;
}
