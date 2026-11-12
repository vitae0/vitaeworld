import * as THREE from 'three';
import {GRID_W,GRID_H,TILE,worldCell} from './layout.js';
import {generateBuilding} from './building.js';
import {BUILDING_PROGRAMS,BUILDING_PROGRAM_IDS,PROGRAM_CATEGORIES} from './building-programs.js';
import {ROOM_TYPES} from './semantics.js';
import {buildBuildingWorld} from './building-world.js';
import {CHARACTERS,addCharacter,modelLoadMetrics} from './assets.js';
import {recipeFromQuery,recipeQuery} from './scene-recipe.js';
import {worldStateKey,parseSavedStates,serialiseSavedStates} from './world-persistence.js';
import {STYLE_FAMILIES,STYLE_FAMILY_IDS} from './style-families.js';
import {Controller} from './controls.js';
import {initPanels} from './ui-panels.js';
import {createInteractionSystem} from './interactions.js';
import {daylightAt,normalizeHour} from './daylight.js';

const $=(selector)=>document.querySelector(selector);
const canvas=$('#scene');
const buildingUse=$('#buildingUse');
const interiorSelect=$('#interiorStyle');
for(const id of STYLE_FAMILY_IDS){
 const style=STYLE_FAMILIES[id],option=document.createElement('option');
 option.value=id;option.textContent=style.label.toUpperCase();
 interiorSelect.append(option);
}
buildingUse.replaceChildren();
const categoryNames={
 konut:'KONUTLAR',ticaret:'TİCARİ MEKÂNLAR',
 konaklama:'OTEL VE KONAKLAMA',kamusal:'KAMUSAL / İŞ',
 'endüstri':'ÖZEL İŞLEVLER'
};
for(const category of PROGRAM_CATEGORIES){
 const group=document.createElement('optgroup');group.label=categoryNames[category];
 for(const id of BUILDING_PROGRAM_IDS){
  const p=BUILDING_PROGRAMS[id];
  if(p.category!==category)continue;
  const option=document.createElement('option');
  option.value=id;option.textContent=p.label;
  group.append(option);
 }
 buildingUse.append(group);
}
const initialRecipe=recipeFromQuery(window.location.search);
buildingUse.value=initialRecipe.program;
$('#buildingStyle').value=initialRecipe.style;
interiorSelect.value=initialRecipe.interior;
initPanels({
 settingsPanel:$('#settingsPanel'),mapPanel:$('#mapPanel'),
 settingsToggle:$('#toggleSettings'),mapToggle:$('#toggleMap'),
 closeSettings:$('#closeSettings'),closeMap:$('#closeMap'),
 compactQuery:window.matchMedia('(max-width: 800px)'),
 documentRef:document
});
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.15:1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
renderer.setClearColor(0x06141e);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x08151d);
scene.fog=new THREE.Fog(0x08151d,26,80);
const camera=new THREE.PerspectiveCamera(70,1,0.08,110);
let seed=initialRecipe.seed,paletteIndex=0,characterIndex=0,
    buildingStyle=initialRecipe.style,buildingProgram=initialRecipe.program,
    interiorStyleId=initialRecipe.interior;
let building=null,layout=null;
let world=null,controller=null,avatar=null,shownLevel=0;
let interactions=null,selectedInteraction=null,interactionFrames=0;
let totalAssets=0,loadedAssets=0,failedAssets=0,generationId=0;
const recipe=()=>({seed,style:buildingStyle,program:buildingProgram,interior:interiorStyleId});
function readWorldState(){
 try{return parseSavedStates(localStorage.getItem(worldStateKey(recipe())));}
 catch{return {};}
}
function writeWorldState(){
 try{
  localStorage.setItem(worldStateKey(recipe()),
   serialiseSavedStates(interactions.exportStates()));
 }catch{/* private mode or storage limit: gameplay still works */ }
}

let daylightHour=14,daylightAutomatic=false,daylightFrames=0;
const clock=new THREE.Clock();
let frames=0,lastFPS=0;
const timeSlider=$('#dayTime'),timeLabel=$('#dayTimeValue'),
 timeAuto=$('#timeAuto');
function showTime(hour){
 const h=normalizeHour(hour);
 const minutes=Math.round(h*60)%1440;
 return String(Math.floor(minutes/60)).padStart(2,'0')+':'+
  String(minutes%60).padStart(2,'0');
}
function updateDaylight(){
 const state=daylightAt(daylightHour);
 world?.setDaylight(daylightHour);
 scene.background.setHex(state.skyColor);
 scene.fog.color.setHex(state.fogColor);
 renderer.toneMappingExposure=state.exposure;
 timeLabel.textContent=showTime(daylightHour);
 timeSlider.value=String(daylightHour);
}
timeSlider.addEventListener('input',e=>{
 daylightAutomatic=false;
 timeAuto.setAttribute('aria-pressed','false');
 timeAuto.textContent='▶';
 timeAuto.setAttribute('aria-label','Gün-gece döngüsünü başlat');
 daylightHour=Number(e.currentTarget.value);
 updateDaylight();
});
timeAuto.addEventListener('click',()=>{
 daylightAutomatic=!daylightAutomatic;
 timeAuto.setAttribute('aria-pressed',String(daylightAutomatic));
 timeAuto.textContent=daylightAutomatic?'Ⅱ':'▶';
 timeAuto.setAttribute('aria-label',daylightAutomatic?
  'Gün-gece döngüsünü durdur':'Gün-gece döngüsünü başlat');
});
function resize(){
 const w=window.innerWidth,h=window.innerHeight;
 camera.aspect=w/h;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
window.addEventListener('resize',resize);resize();
function createAvatar(){
 if(avatar?.group.parent)avatar.group.parent.remove(avatar.group);
 avatar=addCharacter(scene,characterIndex,(ok)=>{
   $('#avatarState').textContent=ok?'3D MODEL READY':'MODEL UNAVAILABLE';
 });
 $('#avatarState').textContent='MODEL LOADING';
 $('#avatarLabel').textContent=CHARACTERS[characterIndex].label;
 if(controller)controller.setCharacter(avatar);
 else avatar.group.position.set(layout.spawn.x,0.11,layout.spawn.z);
}
function generate(nextSeed){
 seed=String(nextSeed).trim().slice(0,80)||'vitae-001';
 const query=recipeQuery(recipe(),window.location.search);
 if(window.history?.replaceState)
  window.history.replaceState(null,'',window.location.pathname+query);
 building=generateBuilding(seed,buildingStyle,2,buildingProgram,interiorStyleId);
 layout=building.stories[0].layout;shownLevel=0;
 const generation=++generationId;
 world?.dispose();
 interactions=createInteractionSystem(building);
 selectedInteraction=null;
 $('#objectActionAnchor').hidden=true;
 totalAssets=building.stories.reduce((n,s)=>n+s.layout.props.length,0);loadedAssets=0;failedAssets=0;
 world=buildBuildingWorld(scene,building,paletteIndex,(ok)=>{
   if(generation!==generationId)return;
   if(ok)loadedAssets++;else failedAssets++;
   updateProgress();
 });
 if(controller)controller.setLayout(building);
 else controller=new Controller(canvas,camera,building,avatar,$('#touchPad'),$('#thumb'));
 controller.setTouchSensitivity($('#touchSensitivity').value);
 controller.setInteractionSystem(interactions);
 // Restore only known toggles for this exact seed/program/architecture.
 // Poses are intentionally never restored.
 for(const {item,on} of interactions.importStates(readWorldState())){
  world.setInteractionState(item,on);
 }
 world.setCurrentLevel(0);
 world.setFirstPerson(controller.mode==='first');
 updateDaylight();
 $('#seed').value=seed;
 $('#seedText').textContent=seed.toUpperCase();
 $('#roomTotal').textContent=building.rooms.length;
 $('#floorValue').textContent='1 / '+building.stories.length;
 $('#propTotal').textContent=building.stories.reduce((n,s)=>n+s.layout.props.length+(s.layout.decorations?.length||0),0);
 $('#layoutStatus').textContent=layout.buildingType.toUpperCase();
 $('#buildingName').textContent=(building.programLabel+' · '+layout.buildingName).toUpperCase();
 $('#paletteName').textContent=world.paletteName.toUpperCase();
 const styles=building.stories.map(s=>s.layout.styleReport);
 $('#layoutStatus').textContent=
  layout.buildingType.toUpperCase()+' · '+layout.interiorStyle.label.toUpperCase();
 const styleStatus=$('#styleStatistics');
 if(styleStatus)styleStatus.textContent=styles.reduce((n,s)=>n+s.wallTreatments.total,0)+
  ' DUVAR DETAYI · '+styles.reduce((n,s)=>n+s.completedEnsembles,0)+
  ' ODA GRUBU · TÜM KATLAR AÇIK';
 updateProgress();
 drawMap();
}
function updateProgress(){
 const received=loadedAssets+failedAssets;
 $('#assetFill').style.width=(totalAssets?received/totalAssets*100:100)+'%';
 $('#assetStatus').textContent=`${loadedAssets}/${totalAssets} 3D ASSETS`+(failedAssets?` · ${failedAssets} FALLBACK`:'');
 const metrics=modelLoadMetrics();
 const unresolved=totalAssets-(loadedAssets+failedAssets);
 const health=metrics.failed>0?'HATA: '+metrics.failed:
  unresolved>0?'YÜKLENİYOR':'HAZIR';
 $('#assetHealth').textContent=health;
 $('#assetDetails').textContent=
  'TEKİL MODEL: '+metrics.loaded+' başarılı / '+metrics.failed+
  ' başarısız · Kuyruk: '+metrics.queued+
  ' · Aynı kaynaktan tekrar indirme yok'+
  (metrics.fallback?' · '+metrics.fallback+' model yedek kaynaktan geldi':'')+
  (metrics.errors.length?' · Son hata: '+metrics.errors.at(-1).error:'');
}
function toggleView(){
 const mode=controller.toggleView();
 world?.setFirstPerson(mode==='first');
 $('#viewLabel').textContent=mode==='first'?'FIRST PERSON':'THIRD PERSON';
 $('#viewButton').textContent=mode==='first'?'3RD PERSON':'1ST PERSON';
}
function newSeed(){
 return Math.random().toString(36).slice(2,8);
}
buildingUse.addEventListener('change',e=>{
 buildingProgram=e.currentTarget.value;
 generate(seed);
});
interiorSelect.addEventListener('change',e=>{
 interiorStyleId=e.currentTarget.value;
 generate(seed);
});
$('#buildingStyle').addEventListener('change',e=>{
 buildingStyle=e.currentTarget.value;
 generate(seed);
});
$('#generate').addEventListener('click',()=>generate($('#seed').value));
$('#random').addEventListener('click',()=>generate(newSeed()));
$('#retryAssets').addEventListener('click',()=>generate(seed));
$('#resetObjects').addEventListener('click',()=>{
 try{localStorage.removeItem(worldStateKey(recipe()));}catch{}
 generate(seed);
});
$('#shareWorld').addEventListener('click',async()=>{
 const link=window.location.origin+window.location.pathname+
  recipeQuery(recipe(),window.location.search);
 const label=$('#shareWorld span');
 try{
  await navigator.clipboard.writeText(link);
  label.textContent='✓ BAĞLANTI KOPYALANDI';
 }catch{
  window.prompt('Bağlantıyı kopyalayın:',link);
 }
});
$('#seed').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();generate(e.target.value);e.target.blur();}});
$('#viewButton').addEventListener('click',toggleView);
$('#mobileView').addEventListener('click',toggleView);
$('#touchSensitivity').addEventListener('input',e=>{
 const multiplier=Number(e.currentTarget.value);
 $('#touchSensitivityValue').textContent=multiplier.toFixed(1)+'×';
 controller?.setTouchSensitivity(multiplier);
});
$('#capture').addEventListener('click',()=>controller.capture());
const objectLabel=$('#objectName'),objectVerb=$('#objectVerb');
const objectButton=$('#useObject'),objectAnchor=$('#objectActionAnchor');
const worldTarget=new THREE.Vector3();
function updateActionTarget(){
 if(!interactions||!controller||!world){
  objectAnchor.hidden=true;return;
 }
 const chosen=interactions.select({
  x:controller.position.x,z:controller.position.z,
  yaw:controller.yaw,level:controller.level,
  previousId:selectedInteraction?.id
 });
 selectedInteraction=chosen;
 if(!chosen){objectAnchor.hidden=true;return;}
 objectLabel.textContent=chosen.label.toUpperCase();
 objectVerb.textContent=interactions.actionName(chosen);
 objectButton.setAttribute('aria-label',
  chosen.label+': '+interactions.actionName(chosen));
 worldTarget.set(chosen.x,chosen.y+Math.min(.33,chosen.h*.15),chosen.z);
 worldTarget.project(camera);
 const poseActive=interactions.activePose?.id===chosen.id;
 const behind=worldTarget.z>=1||worldTarget.z<=-1;
 if(behind&&!poseActive){
  objectAnchor.hidden=true;return;
 }
 // Reposition a real DOM control at the projected world-space object,
 // rather than making the user guess which nearby item a generic UI uses.
 const width=window.innerWidth,height=window.innerHeight;
 const x=behind?width*.5:(worldTarget.x*.5+.5)*width;
 const y=behind?height*.65:(-worldTarget.y*.5+.5)*height;
 if(x<0||x>width||y<0||y>height){
  if(!interactions.activePose){
   objectAnchor.hidden=true;return;
  }
 }
 const safeX=Math.max(75,Math.min(width-75,x));
 const safeY=Math.max(87,Math.min(height-(width<=800?133:64),y));
 objectAnchor.style.left=safeX+'px';
 objectAnchor.style.top=safeY+'px';
 objectAnchor.hidden=false;
}
function useSelected(){
 if(!selectedInteraction||!interactions)return;
 const result=interactions.perform(selectedInteraction,{
  x:controller.position.x,z:controller.position.z,
  level:controller.level
 });
 if(!result.ok){
  if(result.reason==='doorway-occupied')
   objectVerb.textContent='ÖNÜNÜ BOŞALT';
  return;
 }
 if(result.pose==='enter')controller.startPose(result.value);
 else if(result.pose==='exit')controller.endPose();
 else if(result.item){
  world?.setInteractionState(result.item,result.on);
  writeWorldState();
 }
 drawMap();
 updateActionTarget();
}
objectButton.addEventListener('click',e=>{e.stopPropagation();useSelected();});
$('#character').addEventListener('click',()=>{
 characterIndex=(characterIndex+1)%CHARACTERS.length;
 createAvatar();
});
$('#palette').addEventListener('click',()=>{
 paletteIndex=(paletteIndex+1)%3;
 generate(seed);
});
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement)return;
 if(e.code==='KeyV'){e.preventDefault();toggleView();}
 if(e.code==='KeyR'){e.preventDefault();generate(newSeed());}
 if(e.code==='KeyE'&&!e.repeat){e.preventDefault();useSelected();}
 if(e.code==='Escape'&&controller?.pose){
  interactions?.clearPose();controller.endPose();updateActionTarget();
 }
});
const map=$('#minimap'),ctx=map.getContext('2d');
const cellSize=Math.min((map.width-16)/GRID_W,(map.height-16)/GRID_H);
const mapOffsetX=(map.width-GRID_W*cellSize)/2;
const mapOffsetY=(map.height-GRID_H*cellSize)/2;
function mapPoint(x,z){
 return {
   x:mapOffsetX+(x-layout.bounds.minX)/TILE*cellSize,
   y:mapOffsetY+(z-layout.bounds.minZ)/TILE*cellSize
 };
}
function drawMap(){
 const w=map.width,h=map.height;
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#09212d';ctx.fillRect(0,0,w,h);
 for(const c of layout.floors){
   const p=mapPoint(c.x-TILE/2,c.z-TILE/2);
   const room=layout.rooms.find(r=>r.id===c.roomId);
   ctx.fillStyle=c.roomId===0?'#346477':room?ROOM_TYPES[room.type].color:'#1a3a4b';
   ctx.globalAlpha=c.roomId===0?.72:.62;
   ctx.fillRect(p.x,p.y,cellSize+.28,cellSize+.28);
 }
 ctx.globalAlpha=1;
 ctx.strokeStyle='#1b3b44';ctx.lineWidth=1;
 for(const wall of layout.walls){
   if(wall.kind==='diagonal'){
     const a=mapPoint(wall.ax,wall.az),b=mapPoint(wall.bx,wall.bz);
     ctx.strokeStyle='#d6e7e6';ctx.lineWidth=1.3;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
     continue;
   }
   if(wall.kind!=='wall')continue;
   const a=mapPoint(wall.x-wall.w/2,wall.z-wall.d/2);
   const b=mapPoint(wall.x+wall.w/2,wall.z+wall.d/2);
   ctx.strokeRect(a.x,a.y,Math.max(b.x-a.x,.35),Math.max(b.y-a.y,.35));
 }
 for(const room of layout.rooms){
   ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.fillStyle='#0c2630';
   const center=mapPoint(room.x,room.z);
   // 16 compact rooms need concise IDs; full names remain in the status card.
   ctx.fillText(String(room.id).padStart(2,'0'),center.x,center.y,23);
 }
 for(const stair of building.stairs){
  const a=mapPoint(stair.start.x,stair.start.z);
  const b=mapPoint(stair.end.x,stair.end.z);
  ctx.strokeStyle='#ffe4a1';ctx.lineWidth=2.8;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.fillStyle='#ffe4a1';ctx.font='bold 9px system-ui';
  ctx.fillText('STAIRS',((a.x+b.x)/2),((a.y+b.y)/2)-6);
 }
 if(layout.exteriorDoor){
  const entry=mapPoint(layout.exteriorDoor.x,layout.exteriorDoor.z);
  ctx.fillStyle='#f6af8d';
  ctx.fillRect(entry.x-3,entry.y-3,6,6);
 }
 for(const d of layout.doors){
   const p=mapPoint(d.x,d.z);
   ctx.strokeStyle=interactions?.state({id:shownLevel+':door:'+d.roomId})?
    '#8df9bf':'#ddc69c';ctx.lineWidth=2.4;
   ctx.beginPath();
   if(d.axis==='x'){ctx.moveTo(p.x-7,p.y);ctx.lineTo(p.x+7,p.y);}
   else{ctx.moveTo(p.x,p.y-7);ctx.lineTo(p.x,p.y+7);}
   ctx.stroke();
 }
 const p=mapPoint(controller.position.x,controller.position.z);
 ctx.fillStyle='#fff8d8';
 ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#fff8d8';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(p.x,p.y);
 ctx.lineTo(p.x-Math.sin(controller.heading)*11,p.y-Math.cos(controller.heading)*11);
 ctx.stroke();
}
function updateLocation(){
 const p=controller.position;
 const {gx,gz}=worldCell(p.x,p.z);
 const id=gx>=0&&gx<GRID_W&&gz>=0&&gz<GRID_H?
   (layout.zoneGrid||layout.grid)[gz*GRID_W+gx]:-1;
 const room=layout.rooms.find(r=>r.id===id);
 $('#currentRoom').textContent=room?room.name.toUpperCase():'OPEN SPACE';
 const traits=$('#roomTraits');
 if(traits){
   traits.textContent=room
     ?Object.entries(ROOM_TYPES[room.type].traits)
       .sort((a,b)=>b[1]-a[1]).slice(0,3)
       .map(([key,val])=>key.toUpperCase()+' '+val).join(' · ')+
       ' · '+(room.furnitureCount+(room.decorationCount||0))+' OBJECTS'
     :'MULTIPLE CORRIDOR LOOPS · 40D + 16D';
 }
}
function loop(){
 requestAnimationFrame(loop);
 const dt=clock.getDelta();
 if(document.hidden)return;
 if(daylightAutomatic){
  // Four real minutes approximately equal one simulated full day.
  daylightHour=normalizeHour(daylightHour+dt*.10);
  if(++daylightFrames%3===0)updateDaylight();
 }
 controller.update(dt);
 world?.tick(dt);
 world?.setPlayerHeight(controller.position.y);
 if(++interactionFrames%3===0)updateActionTarget();
 if(controller.level!==shownLevel){
  shownLevel=controller.level;
  layout=building.stories[shownLevel].layout;
  world.setCurrentLevel(shownLevel);
  $('#floorValue').textContent=(shownLevel+1)+' / '+building.stories.length;
  drawMap();updateLocation();
  updateActionTarget();
 }
 frames++;lastFPS+=dt;
 if(lastFPS>0.5){
  $('#fps').textContent=Math.round(frames/lastFPS)+' FPS';
  lastFPS=0;frames=0;drawMap();updateLocation();
 }
 renderer.render(scene,camera);
}
generate(seed);
createAvatar();
loop();
