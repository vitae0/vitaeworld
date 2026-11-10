import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// Asset files stay external in this early lab. Every URL is pinned to an audited revision.
// All the assets below have explicit CC0 provenance in ASSETS.md.
const KENNEY_REV='3ddcc695adbba9fb918cf31b7c139b3f95b76910';
const QUATERNIUS_REV='a488723e3a93d73d5c562d88f8a85353c37bc721';
const KAYKIT_REV='8bf8d835cb7afa7cb3f4d893b0966c6b4e9b7727';
export const FURNITURE_BASE=`https://raw.githubusercontent.com/Hidencod/tge-assets/${KENNEY_REV}/packs/furniture-kit/`;
export const CHARACTERS=[
 {id:'hero',label:'QUATERNIUS',description:'Stylized humanoid (CC0)',
  url:`https://raw.githubusercontent.com/programasweights/avatar/${QUATERNIUS_REV}/public/assets/character.glb`,
  facing:0},
 {id:'rogue',label:'KAYKIT',description:'Animated stylized adventurer (CC0)',
  url:`https://raw.githubusercontent.com/sion-rgb/tactical-slash/${KAYKIT_REV}/assets/characters/player/player_archer.glb`,
  facing:Math.PI}
];
const loader=new GLTFLoader();
const cache=new Map();
export function loadGLB(url) {
 if(!cache.has(url)){
   const task=loader.loadAsync(url).catch((error)=>{
     cache.delete(url); throw error;
   });
   cache.set(url,task);
 }
 return cache.get(url);
}
function markShared(node) {
 node.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.userData.sharedAsset=true;}});
}
function normalized(model,desiredHeight=1.8,footprint=null,animated=false) {
 const instance=animated?cloneSkeleton(model):model.clone(true);
 instance.updateMatrixWorld(true);
 const bound=new THREE.Box3().setFromObject(instance);
 const sz=bound.getSize(new THREE.Vector3());
 const center=bound.getCenter(new THREE.Vector3());
 if(sz.y<0.01 || !Number.isFinite(sz.y))throw Error('Invalid GLB bounds');
 const scale=footprint
   ? Math.min(footprint.w/Math.max(sz.x,0.05),footprint.d/Math.max(sz.z,0.05),
        desiredHeight/Math.max(sz.y,0.05))
   : desiredHeight/sz.y;
 instance.scale.multiplyScalar(scale);
 instance.position.set(-center.x*scale,-bound.min.y*scale,-center.z*scale);
 markShared(instance);
 return instance;
}
function placeholder(spec,owned) {
 const group=new THREE.Group();
 const color=new THREE.MeshStandardMaterial({color:0x768e9f,roughness:0.85});
 const accent=new THREE.MeshStandardMaterial({color:0xc4d9d6,roughness:0.75});
 owned.add(color);owned.add(accent);
 const box=(w,h,d,x,y,z,material=color)=>{
   const g=new THREE.BoxGeometry(w,h,d);
   owned.add(g);
   const mesh=new THREE.Mesh(g,material);
   mesh.position.set(x,y,z);group.add(mesh);
 };
 const {w,d,h,model}=spec;
 if(model.includes('rug'))box(w,0.025,d,0,0.018,0,accent);
 else if(model.includes('plant')){
   box(w*0.65,h*0.24,d*0.65,0,h*0.12,0);
   const g=new THREE.IcosahedronGeometry(w*0.48,0);owned.add(g);
   const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x4ea989}));
   owned.add(mesh.material);mesh.position.y=h*0.68;group.add(mesh);
 }else if(model.includes('bed') || model.includes('sofa')){
   box(w,h*0.34,d,0,h*0.2,0);
   box(w,h*0.45,d*0.14,0,h*0.52,-d*0.44,accent);
 }else if(model.includes('chair')){
   box(w,h*0.12,d,0,h*0.47,0);
   box(w,h*0.45,d*0.14,0,h*0.72,-d*0.4,accent);
 }else if(model.includes('table') || model.includes('desk')){
   box(w,0.12,d,0,h-0.09,0,accent);
   for(const x of [-w*0.36,w*0.36])for(const z of [-d*0.36,d*0.36])
     box(0.1,h*0.75,0.1,x,h*0.38,z);
 }else box(w*0.94,h*0.95,d*0.92,0,h*0.48,0);
 return group;
}
export function addFurniture(group,spec,owned,onProgress=()=>{}) {
 const holder=new THREE.Group();
 holder.position.set(spec.x,0.1,spec.z);
 holder.rotation.y=spec.angle||0;
 const standIn=placeholder(spec,owned);
 holder.add(standIn);group.add(holder);
 loadGLB(FURNITURE_BASE+spec.model+'.glb').then((gltf)=>{
   if(!holder.parent)return;
   const target=normalized(gltf.scene,spec.h,{w:spec.w,d:spec.d});
   // Keep the bounding-box floor offset applied by normalized().
   holder.remove(standIn);
   holder.add(target);
   onProgress(true);
 }).catch((error)=>{
   console.warn('Asset fallback:',spec.model,error);
   onProgress(false);
 });
 return holder;
}
export function addCharacter(parent,characterIndex,notify=()=>{}) {
 const container=new THREE.Group();
 parent.add(container);
 const definition=CHARACTERS[characterIndex]||CHARACTERS[0];
 const state={group:container,ready:false,mixer:null,bones:[],basePositions:[],definition};
 loadGLB(definition.url).then(gltf=>{
   if(!container.parent)return;
   const mesh=normalized(gltf.scene,1.8,null,true);
   mesh.rotation.y=definition.facing;
   container.add(mesh);
   state.ready=true;
   state.mesh=mesh;
   if(gltf.animations.length){
     state.mixer=new THREE.AnimationMixer(mesh);
     const clip=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];
     state.mixer.clipAction(clip).play();
     state.clips=gltf.animations;
   }
   mesh.traverse(o=>{
     if(o.isBone && /upperarm|upperleg|thigh/i.test(o.name.toLowerCase())){
       state.bones.push({bone:o,rx:o.rotation.x});
     }
   });
   notify(true);
 }).catch(err=>{console.warn('Character download failed',err);notify(false);});
 return state;
}
export function animateCharacter(state,dt,seconds,moving) {
 if(!state?.ready)return;
 if(state.mixer){
   if(state.clips?.length){
     const clip=state.clips.find(a=>moving?/run|walk|jog/i.test(a.name):/idle/i.test(a.name));
     if(clip && state.activeClip!==clip){
       const next=state.mixer.clipAction(clip);
       if(state.activeAction)state.activeAction.fadeOut(0.17);
       next.reset().fadeIn(0.17).play();
       state.activeAction=next;state.activeClip=clip;
     }
   }
   state.mixer.update(dt);
 }else if(state.mesh){
   state.mesh.position.y= moving?Math.sin(seconds*11)*0.035:Math.sin(seconds*1.6)*0.01;
   state.bones.forEach(({bone,rx},i)=>{
     bone.rotation.x=rx+(moving?Math.sin(seconds*9+(i%2)*Math.PI)*0.19:0);
   });
 }
}
