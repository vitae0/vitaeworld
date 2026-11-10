import * as THREE from 'three';
import {ROOM_THEMES,TILE,WALL_HEIGHT} from './layout.js';
import {addFurniture} from './assets.js';

const PALETTES=[
 {name:'Aurora',wall:0xd0e0e3,trim:0x294856,floor:0x546d77,hall:0x214a55,light:0x80ffe3},
 {name:'Nocturne',wall:0xdcd4df,trim:0x493852,floor:0x78677d,hall:0x51405d,light:0xffcfaa},
 {name:'Solstice',wall:0xd9ddcf,trim:0x345244,floor:0x748879,hall:0x2e574d,light:0xb9f9c8}
];
export function buildWorld(scene,layout,paletteIndex=0,onAsset=()=>{}) {
 const palette=PALETTES[paletteIndex%PALETTES.length];
 const root=new THREE.Group();root.name='ProceduralBuilding';
 scene.add(root);
 const ceiling=new THREE.Group();ceiling.name='CeilingOcclusionLayer';root.add(ceiling);
 const owned=new Set();
 const tmp=new THREE.Object3D();
 const color=(n)=>new THREE.Color(n);
 const tint=(a,b,t)=>color(a).lerp(color(b),t);
 function material(hex,options={}){
  const m=new THREE.MeshStandardMaterial({color:hex,roughness:.78,metalness:.08,...options});
  owned.add(m);return m;
 }
 function geometry(w,h,d){const g=new THREE.BoxGeometry(w,h,d);owned.add(g);return g;}
 const neutral=material(0xffffff),ceilingMat=material(0xdde5e8);
 const wallMat=material(0xffffff),trimMat=material(palette.trim);
 const emissive=material(0xffffff,{emissive:palette.light,emissiveIntensity:2.2});
 // Floors are one GPU draw call. Per-instance colours encode room character.
 const floors=new THREE.InstancedMesh(geometry(TILE+.012,.18,TILE+.012),neutral,layout.floors.length);
 floors.name='SemanticFloorTiles';
 floors.frustumCulled=false;
 layout.floors.forEach((tile,i)=>{
   tmp.position.set(tile.x,0,tile.z);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();
   floors.setMatrixAt(i,tmp.matrix);
   const room=layout.rooms.find(r=>r.id===tile.roomId);
   const base=tile.roomId===0?color(palette.hall):
     tint(ROOM_THEMES[room.type],palette.floor,.52);
   // Subtle architectural floor variation, tied to geometry rather than RNG.
   const shade=((tile.gx*7+tile.gz*11)%9)*.006;
   base.lerp(color(0xffffff),shade);
   floors.setColorAt(i,base);
 });
 floors.instanceMatrix.needsUpdate=true;
 if(floors.instanceColor)floors.instanceColor.needsUpdate=true;
 root.add(floors);
 const roof=new THREE.InstancedMesh(geometry(TILE+.02,.13,TILE+.02),ceilingMat,layout.floors.length);
 roof.name='CeilingTiles';roof.frustumCulled=false;
 layout.floors.forEach((tile,i)=>{
   tmp.position.set(tile.x,WALL_HEIGHT+.24,tile.z);
   tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();
   roof.setMatrixAt(i,tmp.matrix);
 });
 roof.instanceMatrix.needsUpdate=true;
 ceiling.add(roof);
 // Irregular outlines, T-junctions, courtyard and door recesses share 1 draw call.
 const wallMesh=new THREE.InstancedMesh(geometry(1,1,1),wallMat,layout.walls.length);
 wallMesh.name='PerimeterAndPartitions';wallMesh.frustumCulled=false;
 layout.walls.forEach((w,i)=>{
   tmp.position.set(w.x,w.y,w.z);tmp.rotation.set(0,w.angle||0,0);tmp.scale.set(w.w,w.height,w.d);
   tmp.updateMatrix();wallMesh.setMatrixAt(i,tmp.matrix);
   const accent=w.kind==='lintel'?tint(palette.trim,palette.wall,.4):color(palette.wall);
   wallMesh.setColorAt(i,accent);
 });
 wallMesh.instanceMatrix.needsUpdate=true;
 if(wallMesh.instanceColor)wallMesh.instanceColor.needsUpdate=true;
 root.add(wallMesh);
 const normalWalls=layout.walls.filter(w=>w.kind==='wall');
 const trimMesh=new THREE.InstancedMesh(geometry(1,1,1),trimMat,normalWalls.length);
 trimMesh.name='ArchitecturalBaseboards';trimMesh.frustumCulled=false;
 normalWalls.forEach((w,i)=>{
   tmp.position.set(w.x,.20,w.z);tmp.rotation.set(0,w.angle||0,0);tmp.scale.set(w.w+.045,.11,w.d+.045);tmp.updateMatrix();
   trimMesh.setMatrixAt(i,tmp.matrix);
 });
 trimMesh.instanceMatrix.needsUpdate=true;root.add(trimMesh);
 // Doorway accent lighting follows the actual irregular wall topology.
 const highlights=[];
 for(const door of layout.doors){
   const room=layout.rooms.find(r=>r.id===door.roomId);
   const wide=door.axis==='x';
   highlights.push({x:door.x,z:door.z,y:WALL_HEIGHT-.29,
     w:wide?1.6:.055,d:wide?.055:1.6,c:ROOM_THEMES[room.type]});
 }
 for(const tile of layout.floors){
   if(tile.roomId!==0)continue;
   if((tile.gx+2*tile.gz)%13===0)
     highlights.push({x:tile.x,z:tile.z,y:WALL_HEIGHT+.15,w:.7,d:.30,c:palette.light});
 }
 const highlightsMesh=new THREE.InstancedMesh(geometry(1,1,1),emissive,highlights.length);
 highlightsMesh.name='CorridorAndPortalLightStrips';highlightsMesh.frustumCulled=false;
 highlights.forEach((o,i)=>{
   tmp.position.set(o.x,o.y,o.z);tmp.scale.set(o.w,.035,o.d);tmp.updateMatrix();
   highlightsMesh.setMatrixAt(i,tmp.matrix);highlightsMesh.setColorAt(i,color(o.c));
 });
 highlightsMesh.instanceMatrix.needsUpdate=true;
 if(highlightsMesh.instanceColor)highlightsMesh.instanceColor.needsUpdate=true;
 root.add(highlightsMesh);
 // Wall art turns long irregular wall runs into recognizable places.
 const art=new THREE.Group();root.add(art);
 const artFrame=material(palette.trim);
 const artMatByType=new Map();
 for(const room of layout.rooms){
   const candidate=room.cells.find(c=>{
     const {gx,gz}=c;
     const n=room.side==='north'?gz-1:gz+1;
     return n>=0&&n<15&&layout.grid[n*21+gx]===-1;
   });
   if(!candidate)continue;
   const z=candidate.z+(room.side==='north'?-TILE/2+.095:TILE/2-.095);
   const outer=geometry(1.4,.8,.07);
   const frame=new THREE.Mesh(outer,artFrame);frame.position.set(candidate.x,1.94,z);art.add(frame);
   if(!artMatByType.has(room.type))artMatByType.set(room.type,material(ROOM_THEMES[room.type]));
   const inset=new THREE.Mesh(geometry(1.24,.65,.084),artMatByType.get(room.type));
   inset.position.set(candidate.x,1.94,z+(room.side==='north'?.012:-.012));art.add(inset);
 }
 const hemi=new THREE.HemisphereLight(0xe9f7ff,0x536e70,2.15);root.add(hemi);
 const sun=new THREE.DirectionalLight(0xfff4e6,1.55);
 sun.position.set(-11,17,3);root.add(sun);
 const items=new THREE.Group();items.name='SemanticFurniture';root.add(items);
 for(const p of layout.props)addFurniture(items,p,owned,onAsset);
 let disposed=false;
 return {
  root,ceiling,colors:palette,paletteName:palette.name,
  setFirstPerson(isFirst){ceiling.visible=isFirst;},
  dispose(){
    if(disposed)return;disposed=true;
    scene.remove(root);
    for(const resource of owned)resource.dispose();
    // Remote GLB buffers are intentionally cache-owned, not world-owned.
  }
 };
}
