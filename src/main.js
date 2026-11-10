import * as THREE from 'three';
import {generateLayout,isWalkable} from './layout.js';
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
let totalAssets=0,loadedAssets=0,failedAssets=0;
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
 world?.dispose();
 totalAssets=layout.props.length;loadedAssets=0;failedAssets=0;
 world=buildWorld(scene,layout,paletteIndex,(ok)=>{
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
function mapPoint(x,z){return {x:9+(x+13.7)/27.4*222,y:9+(z+11.2)/22.4*177};}
function drawMap(){
 const w=map.width,h=map.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#09212d';ctx.fillRect(0,0,w,h);
 for(const room of layout.rooms){
  const p=mapPoint(room.xMin,room.zMin),q=mapPoint(room.xMax,room.zMax);
  ctx.fillStyle='#234354';ctx.fillRect(p.x,p.y,q.x-p.x,q.y-p.y);
  ctx.strokeStyle='rgba(182,220,213,.3)';ctx.lineWidth=1;
  ctx.strokeRect(p.x,p.y,q.x-p.x,q.y-p.y);
  ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillStyle='#d4f1ea';
  const c=mapPoint(room.x,room.z);ctx.fillText(room.name.replace('Creative ','').toUpperCase(),c.x,c.y);
 }
 const hall1=mapPoint(-13.5,-2),hall2=mapPoint(13.5,2);
 ctx.fillStyle='#346376';ctx.fillRect(hall1.x,hall1.y,hall2.x-hall1.x,hall2.y-hall1.y);
 for(const d of layout.doors){
  const p=mapPoint(d.x,d.z);ctx.fillStyle='#a5f8de';ctx.fillRect(p.x-8,p.y-2,16,4);
 }
 const p=mapPoint(controller.position.x,controller.position.z);
 ctx.fillStyle='#fff8d8';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#fff8d8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);
 ctx.lineTo(p.x-Math.sin(controller.heading)*11,p.y-Math.cos(controller.heading)*11);ctx.stroke();
}
function updateLocation(){
 const p=controller.position;
 const room=layout.rooms.find(r=>p.x>r.xMin+0.2&&p.x<r.xMax-0.2&&p.z>r.zMin+0.2&&p.z<r.zMax-0.2);
 $('#currentRoom').textContent=room?room.name.toUpperCase():'CENTRAL HALL';
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
