import * as THREE from 'three';
import {ROOM_THEMES,TILE,WALL_HEIGHT,GRID_W,GRID_H} from './layout.js';
import {addFurniture} from './assets.js';
import {addModelledDecor} from './fixture-assets.js';
import {addFacingDebug} from './orientation-debug.js';
import {buildDoorVisuals} from './door-visuals.js';
import {buildInteractivePropVisuals} from './interactive-props.js';
import {createSurfaceMaterial} from './materials.js';
import {addWindowVisuals} from './window-visuals.js';
import {daylightAt} from './daylight.js';
import {stairwellRimSegments} from './floor-visibility.js';
import {addWallFeatureVisuals} from './wall-feature-visuals.js';
import {addInteriorFitoutVisuals} from './interior-fitout-visuals.js';
import {addPracticalLights} from './practical-lighting.js';
import {addSignageVisuals} from './room-signage-visuals.js';

const PALETTES=[
 {name:'Aurora',wall:0xe9ded0,trim:0x725b4d,floor:0xa28e7b,hall:0x777067,light:0xffdbaa},
 {name:'Nocturne',wall:0xddd6d1,trim:0x575052,floor:0x8b7f82,hall:0x686065,light:0xffcda9},
 {name:'Solstice',wall:0xe5e4d8,trim:0x586c5b,floor:0x9aa08c,hall:0x747e71,light:0xffe5ba}
];
export function buildWorld(scene,layout,paletteIndex=0,onAsset=()=>{},options={}) {
 const style=layout.interiorStyle||null;
 const basePalette=PALETTES[paletteIndex%PALETTES.length];
 const palette=style?{...basePalette,name:style.label,
  wall:['charcoalPanel','rawConcrete','darkBrick'].includes(style.wall)?
   0xb3b4b3:0xeae7e2,
  trim:style.accent,light:style.light}:basePalette;
 const root=new THREE.Group();root.name='ProceduralBuilding';
 scene.add(root);
 // Keep the upstairs floor slab independently renderable from downstairs.
 // All other upstairs geometry can still be culled by the story controller.
 const floorDeck=new THREE.Group();floorDeck.name='StructuralFloorDeck';
 const detachedFloor=Boolean(options.detachedFloor);
 (detachedFloor?scene:root).add(floorDeck);
 const ceiling=new THREE.Group();ceiling.name='CeilingOcclusionLayer';root.add(ceiling);
 const detailGroup=new THREE.Group();detailGroup.name='DetailedInteriorProps';
 root.add(detailGroup);
 const decorGroup=new THREE.Group();decorGroup.name='OptionalSmallDressing';
 detailGroup.add(decorGroup);
 const fixedDecorGroup=new THREE.Group();fixedDecorGroup.name='EssentialLightsAndWallDressings';
 detailGroup.add(fixedDecorGroup);
 const owned=new Set();
 const tmp=new THREE.Object3D();
 const color=(n)=>new THREE.Color(n);
 const tint=(a,b,t)=>color(a).lerp(color(b),t);
 function material(hex,options={}){
  const m=new THREE.MeshStandardMaterial({color:hex,roughness:.78,metalness:.08,...options});
  owned.add(m);return m;
 }
 function geometry(w,h,d){const g=new THREE.BoxGeometry(w,h,d);owned.add(g);return g;}
 const finish=layout.buildingProgram?.material||'timber';
 const drySurface=({
  timber:'wood',oak:'oak',marble:'marble',terracotta:'terracotta',
  tile:'tile',concrete:'concrete',brick:'oak'
 })[finish]||'wood';
 const wetSurface=finish==='marble'?'marble':
  finish==='terracotta'?'terracotta':'tile';
 const wallSurface=finish==='brick'?'brick':
  finish==='concrete'?'concrete':
  finish==='terracotta'?'paintedPlaster':'plaster';
 const floorWoodMat=createSurfaceMaterial(style?.floor||drySurface,owned,
  {roughness:style?.id==='sleek'?.38:.79,metalness:style?.metal||0});
 const floorTileMat=createSurfaceMaterial(style?.wet||wetSurface,owned,
  {roughness:style?.id==='sleek'?.33:.73});
 const ceilingMat=createSurfaceMaterial(style?.ceiling||'plaster',owned,
  {tint:style?0xffffff:0xece5db});
 const wallMat=createSurfaceMaterial(style?.wall||wallSurface,owned,
  {roughness:.87});
 const trimMat=createSurfaceMaterial(style?.trim||
  (finish==='brick'?'oak':'wood'),owned,
  {tint:style?0xffffff:palette.trim,roughness:.68,
   metalness:style?.metal||0});
 const textileMat=createSurfaceMaterial('fabric',owned,{roughness:.95});
 const emissive=material(0xffffff,{emissive:palette.light,emissiveIntensity:.80});
 // Tile in wet/service rooms, timber in living and circulation areas.
 // Each family is a single instanced draw call with a 1K PBR or local fallback
 // pattern, never one material/mesh per grid cell.
 const floorCells=layout.floors.filter(c=>!layout.floorHoles?.has(c.gz*GRID_W+c.gx));
 const wetTypes=new Set(['bath','kitchen','utility','landing']);
 for(const family of ['wood','tile']){
  const cells=floorCells.filter(tile=>{
   const room=layout.rooms.find(r=>r.id===tile.roomId);
   return (wetTypes.has(room?.type)?'tile':'wood')===family;
  });
  if(!cells.length)continue;
  const floors=new THREE.InstancedMesh(geometry(TILE+.012,.18,TILE+.012),
   family==='tile'?floorTileMat:floorWoodMat,cells.length);
  floors.name='PBRFloor_'+family+'_'+(family==='tile'?
   style?.wet||wetSurface:style?.floor||drySurface);floors.frustumCulled=false;
  cells.forEach((tile,i)=>{
   tmp.position.set(tile.x,0,tile.z);tmp.rotation.set(0,0,0);
   tmp.scale.set(1,1,1);tmp.updateMatrix();
   floors.setMatrixAt(i,tmp.matrix);
   const room=layout.rooms.find(r=>r.id===tile.roomId);
   const theme=room?ROOM_THEMES[room.type]:palette.hall;
   const base=tint(theme,0xffffff,.68);
   const shade=((tile.gx*7+tile.gz*11)%9)*.004;
   base.lerp(color(0xffffff),shade);
   floors.setColorAt(i,base);
  });
  floors.instanceMatrix.needsUpdate=true;
  if(floors.instanceColor)floors.instanceColor.needsUpdate=true;
  floorDeck.add(floors);
 }
 // Finish the real upper-floor opening with a thin structural underside
 // border. One instanced batch; no physics changes or additional downloads.
 const rim=stairwellRimSegments(layout);
 if(rim.length){
  const rimMesh=new THREE.InstancedMesh(geometry(1,1,1),trimMat,rim.length);
  rimMesh.name='StairwellOpeningRim';rimMesh.frustumCulled=false;
  rim.forEach((p,i)=>{
   tmp.position.set(p.x,-.15,p.z);
   tmp.rotation.set(0,0,0);
   tmp.scale.set(p.w,.13,p.d);
   tmp.updateMatrix();rimMesh.setMatrixAt(i,tmp.matrix);
  });
  rimMesh.instanceMatrix.needsUpdate=true;
  floorDeck.add(rimMesh);
 }
 // In a multi-storey building the actual upper deck replaces overlapping
 // lower ceiling tiles, so its underside is visible from downstairs.
 const roofCells=options.ceilingCells??layout.floors.filter(c=>
  !layout.ceilingHoles?.has(c.gz*GRID_W+c.gx));
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
 addWallFeatureVisuals(root,layout,owned);
 const fitoutVisuals=addInteriorFitoutVisuals(root,layout,owned,{
  trimMat,tileMat:floorTileMat,textileMat,ceilingMat,lightColor:palette.light
 });
 // Window glass uses actual openings cut from the solid exterior walls.
 // Rendered as four instanced batches with shared low-poly trim.
 addWindowVisuals(root,layout,owned);
 const signageVisuals=addSignageVisuals(root,layout,owned);
 const normalWalls=layout.walls.filter(w=>w.kind==='wall');
 const trimMesh=new THREE.InstancedMesh(geometry(1,1,1),trimMat,normalWalls.length);
 trimMesh.name='ArchitecturalBaseboards';trimMesh.frustumCulled=false;
 normalWalls.forEach((w,i)=>{
   tmp.position.set(w.x,.20,w.z);tmp.rotation.set(0,w.angle||0,0);tmp.scale.set(w.w+.045,.11,w.d+.045);tmp.updateMatrix();
   trimMesh.setMatrixAt(i,tmp.matrix);
 });
 trimMesh.instanceMatrix.needsUpdate=true;root.add(trimMesh);
 // Continuous crown molding and selective dado/chair rails. All profiles
 // follow the orthogonal wall segments, including walls beside door openings.
 const crownWalls=layout.walls.filter(w=>w.kind==='wall'||w.kind==='windowHead');
 const crownMesh=new THREE.InstancedMesh(geometry(1,1,1),trimMat,crownWalls.length);
 crownMesh.name='CrownMolding';
 crownWalls.forEach((w,i)=>{
  tmp.position.set(w.x,WALL_HEIGHT-.01,w.z);tmp.rotation.set(0,0,0);
  tmp.scale.set(w.w+.065,.115,w.d+.065);tmp.updateMatrix();
  crownMesh.setMatrixAt(i,tmp.matrix);
 });
 crownMesh.instanceMatrix.needsUpdate=true;root.add(crownMesh);
 const dadoTypes=new Set(['lounge','suite','dining','library','lobby','corridor']);
 const dadoWalls=normalWalls.filter(w=>{
  const {gx,gz}=((x,z)=>({gx:Math.floor(x/TILE+GRID_W/2),
    gz:Math.floor(z/TILE+GRID_H/2)}))(w.x,w.z);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=gx+dx,z=gz+dz;
   if(x<0||z<0||x>=GRID_W||z>=GRID_H)continue;
   const id=(layout.zoneGrid||layout.grid)[z*GRID_W+x];
   if(dadoTypes.has(layout.rooms.find(r=>r.id===id)?.type))return true;
  }
  return false;
 });
 const dadoMesh=new THREE.InstancedMesh(geometry(1,1,1),trimMat,dadoWalls.length);
 dadoMesh.name='ChairRailAndWallPanelTrim';
 dadoWalls.forEach((w,i)=>{
  tmp.position.set(w.x,1.28,w.z);tmp.rotation.set(0,0,0);
  tmp.scale.set(w.w+.038,.055,w.d+.038);tmp.updateMatrix();
  dadoMesh.setMatrixAt(i,tmp.matrix);
 });
 dadoMesh.instanceMatrix.needsUpdate=true;root.add(dadoMesh);
 // Doorway accent lighting follows the actual irregular wall topology.
 const highlights=[];
 for(const door of layout.doors){
   const room=layout.rooms.find(r=>r.id===door.roomId);
   const wide=door.axis==='x';
   highlights.push({x:door.x,z:door.z,y:WALL_HEIGHT-.29,
     w:wide?1.6:.055,d:wide?.055:1.6,c:ROOM_THEMES[room.type]});
 }
 for(const tile of layout.floors){
   if(!layout.rooms.find(r=>r.id===tile.roomId)?.circulation)continue;
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
 detailGroup.add(highlightsMesh);
 // Theme-consistent art, shelves and tabletop details share four GPU batches.
 const decorList=layout.decorations||[];
 addModelledDecor(fixedDecorGroup,decorList.filter(d=>
  d.source==='wall'||d.source==='ceiling'),owned,{textileMat});
 addModelledDecor(decorGroup,decorList.filter(d=>
  d.source==='floor'||d.source==='surface'),owned,{textileMat});
 const hemi=new THREE.HemisphereLight(style?.light||0xfff2e5,0x716b65,1.65);root.add(hemi);
 const sun=new THREE.DirectionalLight(0xffefe1,1.30);
 sun.position.set(-11,17,3);root.add(sun);
 const practical=addPracticalLights(root,layout);
 function setDaylight(hour){
  const light=daylightAt(hour);
  hemi.intensity=light.hemisphereIntensity;
  sun.intensity=light.sunIntensity;
  sun.color.setHex(light.sunColor);
  sun.position.set(light.sunPosition.x,light.sunPosition.y,light.sunPosition.z);
  // Ceiling accents are deliberately inexpensive emissive geometry, not
  // hundreds of new realtime lights in every room.
  emissive.emissiveIntensity=.22+(.82*(1-light.sunlight));
  if(fitoutVisuals.glow)
   fitoutVisuals.glow.emissiveIntensity=.17+(1-light.sunlight)*.72;
  practical.setDaylight(light.sunlight);
 }
 setDaylight(14);
 const doors=buildDoorVisuals(root,layout,owned);
 const items=new THREE.Group();items.name='SemanticFurniture';detailGroup.add(items);
 const holders=new Map();
 for(const p of layout.props)holders.set(p.id,addFurniture(items,p,owned,onAsset));
 const propStates=buildInteractivePropVisuals(holders,layout.props,owned);
 // Explicit opt-in diagnostic. Never show helper arrows in normal gameplay.
 if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('qaFacing'))
  addFacingDebug(detailGroup,layout,owned);
 let disposed=false;
 return {
  root,floorDeck,detachedFloor,ceiling,detailGroup,
  colors:palette,paletteName:palette.name,
  fitoutStats:{parts:fitoutVisuals.count,batches:fitoutVisuals.batches,
   signs:signageVisuals.count},
  setDaylight,
  setQualityBudget(budget){
   decorGroup.visible=budget?.showClutter!==false;
   practical.setBudget(budget?.practicalLights||0);
  },
  setLightingActive(value){
   hemi.visible=Boolean(value);sun.visible=Boolean(value);
   practical.setActive(value);
  },
  getLightReport(){return {
   available:practical.availableCount,active:practical.activeCount
  };},
  setFirstPerson(isFirst){ceiling.visible=isFirst;},
  tick(dt){doors.update(dt);propStates.update(dt);},
  setInteractionState(item,on){
   if(item.kind==='door')return doors.setOpen(item.door.roomId,on);
   return propStates.setState(item.prop?.id,on);
  },
  dispose(){
    if(disposed)return;disposed=true;
    scene.remove(root);
    if(detachedFloor)scene.remove(floorDeck);
    for(const resource of owned)resource.dispose();
    // Remote GLB buffers are intentionally cache-owned, not world-owned.
  }
 };
}
