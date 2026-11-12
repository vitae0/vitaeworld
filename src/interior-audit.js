// Lab 19 acceptance audit: independent deterministic data checks.
// This is an explicit QA report, NOT a claim of visual/AAA certification.
import {collisionPairs,roomAccessibility} from './interior-quality.js';
import {DOOR_HEIGHT,WALL_HEIGHT} from './topology.js';

const EPS=1e-7;
const match=(a,b)=>Math.abs(a-b)<EPS;
const doorHead=(layout,door)=>layout.walls.some(w=>
 w.kind==='lintel'&&match(w.x,door.x)&&match(w.z,door.z)&&
 match(w.y+w.height/2,WALL_HEIGHT+.10)&&
 match(w.y-w.height/2,DOOR_HEIGHT+.10));
export function auditInterior(layout){
 const issues=[],counts={
  rooms:layout.rooms?.length||0,
  props:layout.props?.length||0,
  windows:layout.windows?.length||0,
  doorways:layout.doors?.length||0,
  fitoutParts:layout.fitout?.pieces?.length||0,
  wallTreatments:layout.wallFeatures?.length||0,
  blockedRooms:0,missingEssentials:0,collisions:0,
  missingLintels:0,unsafeWindows:0,badFinishGeometry:0
 };
 const conflicts=collisionPairs(layout.props||[]);
 counts.collisions=conflicts.length;
 if(conflicts.length)issues.push({type:'furniture-collision',
  count:conflicts.length,example:conflicts[0]});
 for(const room of layout.rooms||[]){
  if(room.missingEssentials?.length){
   counts.missingEssentials+=room.missingEssentials.length;
   issues.push({type:'missing-required',room:room.id,
    models:room.missingEssentials.slice()});
  }
  if(room.circulation)continue;
  const props=(layout.props||[]).filter(p=>p.roomId===room.id);
  const access=roomAccessibility(layout,room,props);
  if(!access.doorOpen||access.ratio<.82){
   counts.blockedRooms++;
   issues.push({type:'room-inaccessible',room:room.id,
    ratio:+access.ratio.toFixed(3)});
  }
 }
 for(const door of [
  ...(layout.doors||[]),
  ...(layout.exteriorDoor?[layout.exteriorDoor]:[])
 ]){
  if(!doorHead(layout,door)){
   counts.missingLintels++;
   issues.push({type:'door-head-missing',room:door.roomId??null});
  }
 }
 const privateRooms=new Set((layout.rooms||[])
  .filter(r=>r.type==='bath'||r.type==='utility').map(r=>r.id));
 for(const window of layout.windows||[]){
  const head=layout.walls.some(w=>w.kind==='windowHead'&&
   match(w.x,window.x)&&match(w.z,window.z)&&
   match(w.y+w.height/2,WALL_HEIGHT+.10));
  const sill=layout.walls.some(w=>w.kind==='windowSill'&&
   match(w.x,window.x)&&match(w.z,window.z)&&
   match(w.y-w.height/2,.10));
  const blocker=(layout.windowBlockers||[]).some(w=>
   match(w.x,window.x)&&match(w.z,window.z));
  if(privateRooms.has(window.roomId)||!head||!sill||!blocker){
   counts.unsafeWindows++;
   issues.push({type:'window-privacy-or-structure',
    room:window.roomId,x:window.x,z:window.z});
  }
 }
 for(const part of layout.fitout?.pieces||[]){
  if(!['jamb','overDoor','threshold','wayfinding'].includes(part.kind)&&
   !(layout.rooms||[]).some(r=>r.id===part.roomId)){
   counts.badFinishGeometry++;
   issues.push({type:'unowned-finish',kind:part.kind});
   continue;
  }
  if(![part.x,part.y,part.z,part.w,part.h,part.d].every(Number.isFinite)||
     part.w<=0||part.h<=0||part.d<=0){
   counts.badFinishGeometry++;
   issues.push({type:'non-finite-finish',kind:part.kind});
  }
 }
 // Weight serious mechanical blockers more heavily than cosmetic coverage.
 const score=Math.max(0,100-
  25*counts.blockedRooms-20*counts.missingEssentials-
  22*counts.collisions-20*counts.missingLintels-
  20*counts.unsafeWindows-8*counts.badFinishGeometry);
 const passed=issues.length===0;
 return {score,passed,counts,issues,scope:'geometry-access-privacy',
  note:'Does not establish real-device FPS or photorealistic visual QA'};
}
export function auditBuildingInteriors(building){
 const floors=building.stories.map(story=>({
  floor:story.index,...auditInterior(story.layout)
 }));
 const safe=floors.every(f=>f.passed);
 const finishParts=floors.reduce((sum,f)=>sum+f.counts.fitoutParts,0);
 return {passed:safe,score:Math.min(...floors.map(f=>f.score)),
  floors,finishParts,stories:floors.length};
}
