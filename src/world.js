import * as THREE from 'three';
import {ROOM_THEMES,TILE,WALL_HEIGHT,GRID_W,GRID_H} from './layout.js';
import {addFurniture} from './assets.js';
import {addDecorVisuals} from './decor-visuals.js';

const PALETTES=[
 {name:'Aurora',wall:0xe9ded0,trim:0x725b4d,floor:0xa28e7b,hall:0x777067,light:0xffdbaa},
 {name:'Nocturne',wall:0xddd6d1,trim:0x575052,floor:0x8b7f82,hall:0x686065,light:0xffcda9},
 {name:'Solstice',wall:0xe5e4d8,trim:0x586c5b,floor:0x9aa08c,hall:0x747e71,light:0xffe5ba}
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
 const emissive=material(0xffffff,{emissive:palette.light,emissiveIntensity:.80});
 // Floors are one GPU draw call. Per-instance colours encode room character.
 const floorCells=layout.floors.filter(c=>!layout.floorHoles?.has(c.gz*GRID_W+c.gx));
 const floors=new THREE.InstancedMesh(geometry(TILE+.012,.18,TILE+.012),neutral,floorCells.length);
 floors.name='SemanticFloorTiles';
 floors.frustumCulled=false;
 floorCells.forEach((tile,i)=>{
   tmp.position.set(tile.x,0,tile.z);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();
   floors.setMatrixAt(i,tmp.matrix);
   const room=layout.rooms.find(r=>r.id===tile.roomId);
   const base=tile.roomId===0?color(palette.hall):
     tint(ROOM_THEMES[room.type],palette.floor,.73);
   // Subtle architectural floor variation, tied to geometry rather than RNG.
   const shade=((tile.gx*7+tile.gz*11)%9)*.006;
   base.lerp(color(0xffffff),shade);
   floors.setColorAt(i,base);
 });
 floors.instanceMatrix.needsUpdate=true;
 if(floors.instanceColor)floors.instanceColor.needsUpdate=true;
 root.add(floors);
 const roofCells=layout.floors.filter(c=>!layout.ceilingHoles?.has(c.gz*GRID_W+c.gx));
 const roof=new THREE.InstancedMesh(geometry(TILE+.02,.13,TILE+.02),ceilingMat,roofCells.length);
 roof.name='CeilingTiles';roof.frustumCulled=false;
 roofCells.forEach((tile,i)=>{
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
 // Theme-consistent art, shelves and tabletop details share four GPU batches.
 addDecorVisuals(root,layout.decorations||[],owned);
 const hemi=new THREE.HemisphereLight(0xfff2e5,0x716b65,1.65);root.add(hemi);
 const sun=new THREE.DirectionalLight(0xffefe1,1.30);
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
