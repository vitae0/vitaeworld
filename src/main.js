import * as THREE from 'three';
import {generateLayout,GRID_W,GRID_H,TILE,worldCell} from './layout.js';
import {ROOM_TYPES} from './semantics.js';
import {buildWorld} from './world.js';
import {CHARACTERS,addCharacter} from './assets.js';
import {Controller} from './controls.js';

const $=(selector)=>document.querySelector(selector);
const canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.25:1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.26;
renderer.setClearColor(0x06141e);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x08151d);
scene.fog=new THREE.Fog(0x08151d,26,80);
const camera=new THREE.PerspectiveCamera(70,1,0.08,110);
let seed='vitae-001',paletteIndex=0,characterIndex=0,qualityChanged=false;
let layout=generateLayout(seed),world=null,controller=null,avatar=null;
let totalAssets=0,loadedAssets=0,failedAssets=0,generationId=0;
const clock=new THREE.Clock();
let frames=0,lastFPS=0;
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
 seed=String(nextSeed).trim()||'vitae-001';
 layout=generateLayout(seed);
 const generation=++generationId;
 world?.dispose();
 totalAssets=layout.props.length;loadedAssets=0;failedAssets=0;
 world=buildWorld(scene,layout,paletteIndex,(ok)=>{
   if(generation!==generationId)return;
   if(ok)loadedAssets++;else failedAssets++;
   updateProgress();
 });
 if(controller)controller.setLayout(layout);
 else controller=new Controller(canvas,camera,layout,avatar,$('#touchPad'),$('#thumb'));
 world.setFirstPerson(controller.mode==='first');
 $('#seed').value=seed;
 $('#seedText').textContent=seed.toUpperCase();
 $('#roomTotal').textContent=layout.rooms.length;
 $('#propTotal').textContent=layout.props.length;
 $('#layoutStatus').textContent='IRREGULAR';
 $('#paletteName').textContent=world.paletteName.toUpperCase();
 updateProgress();
 drawMap();
}
function updateProgress(){
 const received=loadedAssets+failedAssets;
 $('#assetFill').style.width=(totalAssets?received/totalAssets*100:100)+'%';
 $('#assetStatus').textContent=`${loadedAssets}/${totalAssets} 3D ASSETS`+(failedAssets?` · ${failedAssets} FALLBACK`:'');
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
$('#generate').addEventListener('click',()=>generate($('#seed').value));
$('#random').addEventListener('click',()=>generate(newSeed()));
$('#seed').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();generate(e.target.value);e.target.blur();}});
$('#viewButton').addEventListener('click',toggleView);
$('#mobileView').addEventListener('click',toggleView);
$('#capture').addEventListener('click',()=>controller.capture());
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
   if(wall.kind!=='wall')continue;
   const a=mapPoint(wall.x-wall.w/2,wall.z-wall.d/2);
   const b=mapPoint(wall.x+wall.w/2,wall.z+wall.d/2);
   ctx.strokeRect(a.x,a.y,Math.max(b.x-a.x,.35),Math.max(b.y-a.y,.35));
 }
 for(const room of layout.rooms){
   ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.fillStyle='#0c2630';
   const center=mapPoint(room.x,room.z);
   const label=room.name.replace('Conversation ','').replace('Reading ','')
     .replace('Social ','').replace('Wellness ','').replace('Creative ','');
   ctx.fillText(label.toUpperCase(),center.x,center.y,60);
 }
 for(const d of layout.doors){
   const p=mapPoint(d.x,d.z);
   ctx.strokeStyle='#ddfff0';ctx.lineWidth=2.4;
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
   layout.grid[gz*GRID_W+gx]:-1;
 const room=layout.rooms.find(r=>r.id===id);
 $('#currentRoom').textContent=room?room.name.toUpperCase():'SERPENTINE HALL';
 const traits=$('#roomTraits');
 if(traits){
   traits.textContent=room
     ?Object.entries(ROOM_TYPES[room.type].traits)
       .sort((a,b)=>b[1]-a[1]).slice(0,4)
       .map(([key,val])=>key.toUpperCase()+' '+val).join(' · ')
     :'CONNECTED WINGS · 40D SEMANTIC ROOMS';
 }
}
function loop(){
 requestAnimationFrame(loop);
 const dt=clock.getDelta();
 if(document.hidden)return;
 controller.update(dt);
 frames++;lastFPS+=dt;
 if(lastFPS>0.5){
  $('#fps').textContent=Math.round(frames/lastFPS)+' FPS';
  lastFPS=0;frames=0;drawMap();updateLocation();
 }
 renderer.render(scene,camera);
}
createAvatar();
generate(seed);
loop();
