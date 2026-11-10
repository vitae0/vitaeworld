import * as THREE from 'three';
import {ROOM_THEMES} from './layout.js';
import {addFurniture} from './assets.js';

const WALL_H=3.25;
const PALETTES=[
 {name:'Aurora',wall:0xd5e0e3,edge:0x1b3848,floor:0x516875,hall:0x294756,light:0x8ffff1},
 {name:'Nocturne',wall:0xd8d3d5,edge:0x312a4b,floor:0x766b7e,hall:0x3b3652,light:0xffc99f},
 {name:'Solstice',wall:0xd5d7c7,edge:0x2e4338,floor:0x718574,hall:0x395d50,light:0xb2f1cd}
];
function hex(s){return new THREE.Color(s);}
export function buildWorld(scene,layout,paletteIndex=0,onAsset=()=>{}) {
 const colors=PALETTES[paletteIndex%PALETTES.length];
 const root=new THREE.Group();
 scene.add(root);
 const owned=new Set();
 const ceiling=new THREE.Group();
 root.add(ceiling);
 function material(color,emissive=0x000000,intensity=0){
   const m=new THREE.MeshStandardMaterial({color,roughness:0.82,metalness:0.04,
     emissive,emissiveIntensity:intensity});
   owned.add(m);return m;
 }
 const wallMat=material(colors.wall),trimMat=material(colors.edge),
   hallMat=material(colors.hall),ceilingMat=material(0xdee3e5),
   lightMat=material(0xffffff,colors.light,1.8);
 function box(parent,w,h,d,x,y,z,mat){
   const g=new THREE.BoxGeometry(w,h,d);
   owned.add(g);
   const mesh=new THREE.Mesh(g,mat);
   mesh.position.set(x,y,z);
   mesh.receiveShadow=true;
   parent.add(mesh);
   return mesh;
 }
 // Corridor. Adjacent floor slabs have no gaps or phantom colliders.
 box(root,27,0.20,4,0,0,0,hallMat);
 box(ceiling,27,0.13,4,0,WALL_H+0.07,0,ceilingMat);
 for(const room of layout.rooms){
   const floorColor=hex(ROOM_THEMES[room.kind]).lerp(new THREE.Color(colors.floor),0.58);
   const floorMat=material(floorColor);
   box(root,8.99,0.20,8.99,room.x,0,room.z,floorMat);
   box(ceiling,8.99,0.13,8.99,room.x,WALL_H+0.07,room.z,ceilingMat);
   // Colour accent on the back wall, with neat trim so rooms look intentionally furnished.
   const rearZ=room.side==='north'?-10.865:10.865;
   const accent=material(hex(ROOM_THEMES[room.kind]).lerp(new THREE.Color(colors.wall),0.25));
   box(root,7.7,1.35,0.025,room.x,1.65,rearZ,accent);
   box(root,7.7,0.055,0.06,room.x,0.62,rearZ-0.025,trimMat);
   // Entrance side glow: identifying each room from the corridor.
   const front=room.side==='north'?-2.06:2.06;
   box(root,2.5,0.08,0.1,room.x,2.94,front,lightMat);
   // Wall art as an accent, without extra textures.
   const x=room.x+2.85;
   box(root,1.35,0.85,0.05,x,1.97,rearZ*0.993,trimMat);
   box(root,1.18,0.67,0.067,x,1.97,rearZ*0.989,accent);
 }
 for(const w of layout.walls){
   box(root,w.w,WALL_H,w.d,w.x,WALL_H/2,w.z,wallMat);
   // inset baseboard distinguishes partitions from the floor
   if(w.w>w.d){
     box(root,w.w,0.1,w.d+0.12,w.x,0.16,w.z,trimMat);
   }else{
     box(root,w.w+0.12,0.1,w.d,w.x,0.16,w.z,trimMat);
   }
 }
 // Every door is a real gap in the collision wall, not a fake transparent panel.
 for(const d of layout.doors) {
   for(const side of [-1,1])box(root,0.10,WALL_H,0.23,d.x+side*1.15,WALL_H/2,d.z,trimMat);
   box(root,2.38,0.14,0.25,d.x,WALL_H-0.06,d.z,trimMat);
 }
 // Architecture lighting is deliberately sparse for browser GPU budgets.
 const globalLight=new THREE.HemisphereLight(0xddeeff,0x596f75,2.0);
 root.add(globalLight);
 const sun=new THREE.DirectionalLight(0xfff5eb,1.7);
 sun.position.set(-8,12,4);root.add(sun);
 for(const x of [-9,0,9])for(const z of [-6.5,0,6.5]){
   box(ceiling,0.9,0.045,0.35,x,WALL_H-0.02,z,lightMat);
 }
 const furniture=new THREE.Group();
 root.add(furniture);
 for(const p of layout.props)addFurniture(furniture,p,owned,onAsset);
 // Understated corridor strips instead of dozens of expensive real point lights.
 for(const x of [-10,-5,0,5,10])
   box(root,1.8,0.025,0.05,x,0.115,-1.84,lightMat);
 let disposed=false;
 return {
   root,ceiling,colors,paletteName:colors.name,
   setFirstPerson(isFP){ceiling.visible=isFP;},
   dispose(){
     if(disposed)return;disposed=true;
     scene.remove(root);
     for(const x of owned)x.dispose();
     // GLB geometry stays cached in assets.js; never dispose shared vendor geometry.
   }
 };
}
