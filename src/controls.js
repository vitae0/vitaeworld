import * as THREE from 'three';
import {isWalkable} from './layout.js';
import {sampleWalkableGround} from './stairs.js';
import {animateCharacter} from './assets.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
export class Controller {
 constructor(canvas,camera,layout,avatar,touchPad,thumb){
  this.canvas=canvas;this.camera=camera;this.building=layout.stories?layout:null;
  this.level=0;this.layout=this.building?layout.stories[0].layout:layout;
  this.avatar=avatar;
  this.position=new THREE.Vector3(layout.spawn.x,layout.spawn.y??0,layout.spawn.z);
  this.yaw=this.building?.stairs?.[0]?Math.atan2(-this.building.stairs[0].dx,-this.building.stairs[0].dz):0;
  this.pitch=-0.17;this.heading=this.yaw;this.mode='third';
  this.keys=new Set();this.touch={x:0,y:0};this.dragging=false;
  this.touchPad=touchPad;this.thumb=thumb;this.elapsed=0;
  this.bind();
  this.updateCamera();
 }
 bind(){
  const c=this.canvas;
  document.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLInputElement)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
    this.keys.add(e.code);
  });
  document.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('blur',()=>this.keys.clear());
  const look=(dx,dy)=>{
    const sensitivity=0.00265;
    this.yaw-=dx*sensitivity;
    this.pitch=clamp(this.pitch-dy*sensitivity,-1.15,0.87);
  };
  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement===c)look(e.movementX,e.movementY);
    // Unlocked mouse dragging is handled by canvas pointermove only.
  });
  c.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'){
      if(this.touchPointer!==undefined)return;
      this.touchPointer=e.pointerId;
      this.touchStart={x:e.clientX,y:e.clientY};
      c.setPointerCapture(e.pointerId);
    }else if(document.pointerLockElement!==c){
      this.dragging=true;this.lastMouse={x:e.clientX,y:e.clientY};
    }
  });
  c.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&this.touchPointer===e.pointerId){
      const dx=e.clientX-this.touchStart.x,dy=e.clientY-this.touchStart.y;
      look(dx,dy);
      this.touchStart={x:e.clientX,y:e.clientY};
    }else if(e.pointerType==='mouse'&&this.dragging&&document.pointerLockElement!==c){
      look(e.clientX-this.lastMouse.x,e.clientY-this.lastMouse.y);
      this.lastMouse={x:e.clientX,y:e.clientY};
    }
  });
  const end=e=>{
    if(e.pointerId===this.touchPointer)this.touchPointer=undefined;
    if(e.pointerType!=='touch')this.dragging=false;
  };
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
  this.touchPad.addEventListener('pointerdown',e=>{
    e.preventDefault();this.joyPointer=e.pointerId;
    this.touchPad.setPointerCapture(e.pointerId);
    this.updateJoystick(e);
  });
  this.touchPad.addEventListener('pointermove',e=>{
    if(e.pointerId===this.joyPointer)this.updateJoystick(e);
  });
  const stop=e=>{
    if(e.pointerId===this.joyPointer){
      this.joyPointer=undefined;this.touch={x:0,y:0};
      this.thumb.style.transform='translate(-50%,-50%)';
    }
  };
  this.touchPad.addEventListener('pointerup',stop);
  this.touchPad.addEventListener('pointercancel',stop);
 }
 updateJoystick(e){
  const box=this.touchPad.getBoundingClientRect();
  const x=e.clientX-(box.left+box.width/2),y=e.clientY-(box.top+box.height/2);
  const limit=box.width*0.32;
  this.touch={x:clamp(x/limit,-1,1),y:clamp(y/limit,-1,1)};
  this.thumb.style.transform=`translate(calc(-50% + ${this.touch.x*limit}px),calc(-50% + ${this.touch.y*limit}px))`;
 }
 capture(){
  if(this.canvas.requestPointerLock)this.canvas.requestPointerLock();
 }
 toggleView(){
  this.mode=this.mode==='third'?'first':'third';
  this.updateCamera();
  return this.mode;
 }
 setCharacter(avatar){
  if(this.avatar?.group.parent)this.avatar.group.parent.remove(this.avatar.group);
  this.avatar=avatar;
  this.updateCamera();
 }
 setLayout(layout){
  this.building=layout.stories?layout:null;
  this.level=0;
  this.layout=this.building?layout.stories[0].layout:layout;
  this.position.set(layout.spawn.x,layout.spawn.y??0,layout.spawn.z);
  this.yaw=this.building?.stairs?.[0]?
   Math.atan2(-this.building.stairs[0].dx,-this.building.stairs[0].dz):0;
  this.heading=this.yaw;
  this.updateCamera();
 }
 update(dt){
  dt=Math.min(dt,0.05);this.elapsed+=dt;
  const k=this.keys;
  let forward=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown'));
  let strafe=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'));
  forward-=this.touch.y;
  strafe+=this.touch.x;
  const mag=Math.hypot(forward,strafe);
  const moving=mag>0.06;
  if(moving){
    forward/=Math.max(1,mag);strafe/=Math.max(1,mag);
    const dx=-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*strafe;
    const dz=-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*strafe;
    const speed=(k.has('ShiftLeft')||k.has('ShiftRight')?5.25:3.2);
    // Separate axes slide along walls; the character cannot walk through a wall or a sofa.
    const x=this.position.x+dx*speed*dt, z=this.position.z+dz*speed*dt;
    const probe=(x,z)=>{
     if(!this.building){
      return isWalkable(this.layout,x,z,.31)?
        {height:this.position.y,level:this.level}:null;
     }
     return sampleWalkableGround(this.building,x,z,this.position.y,.31);
    };
    const alongX=probe(x,this.position.z);
    if(alongX){this.position.x=x;this.position.y=alongX.height;this.level=alongX.level;}
    const alongZ=probe(this.position.x,z);
    if(alongZ){this.position.z=z;this.position.y=alongZ.height;this.level=alongZ.level;}
    if(this.building)this.layout=this.building.stories[this.level].layout;
    this.heading=Math.atan2(-dx,-dz);
  }
  if(this.avatar){
    this.avatar.group.position.set(this.position.x,this.position.y+.11,this.position.z);
    this.avatar.group.rotation.y=this.heading;
    this.avatar.group.visible=this.mode==='third';
    animateCharacter(this.avatar,dt,this.elapsed,moving);
  }
  this.updateCamera();
  return moving;
 }
 updateCamera(){
  const eye=new THREE.Vector3(this.position.x,this.position.y+1.65,this.position.z);
  const dir=new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),
                            Math.sin(this.pitch),
                            -Math.cos(this.yaw)*Math.cos(this.pitch));
  if(this.mode==='first'){
    this.camera.position.copy(eye);
    this.camera.lookAt(eye.clone().add(dir));
  }else{
    // Camera orbits a stationary avatar, independent of its facing direction.
    const target=eye.clone().add(new THREE.Vector3(0,-0.1,0));
    const desired=target.clone().addScaledVector(dir,-4.4);
    desired.y+=0.76;
    let fraction=1;
    for(let i=1;i<=24;i++){
      const t=i/24;
      const probe=target.clone().lerp(desired,t);
      if(probe.y<this.position.y+3.2&&!isWalkable(this.layout,probe.x,probe.z,0.17)){
        fraction=Math.max(0.12,(i-1)/24);
        break;
      }
    }
    this.camera.position.copy(target.clone().lerp(desired,fraction));
    this.camera.lookAt(target);
  }
 }
}
