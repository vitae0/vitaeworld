import * as THREE from 'three';
import {FURNITURE_BASE,loadGLB} from './assets.js';
import {addDecorVisuals} from './decor-visuals.js';
import {fixtureModelFor} from './fixture-specs.js';

// A single GLB download per fixture model is cached by assets.js.
// Each source mesh becomes one InstancedMesh per story, irrespective of
// how many wall sconces and ceiling fixtures were generated.
export function addModelledDecor(root,decorations,owned,options={}){
 const pure=[],fixtures=new Map();
 for(const decor of decorations){
  const model=fixtureModelFor(decor);
  if(!model){pure.push(decor);continue;}
  if(!fixtures.has(model))fixtures.set(model,[]);
  fixtures.get(model).push(decor);
 }
 addDecorVisuals(root,pure,owned,options);
 const pending=[];
 for(const [model,items] of fixtures){
  const fallback=addDecorVisuals(root,items,owned,options);
  fallback.name='Fallback_'+model;
  const task=loadGLB(FURNITURE_BASE+model+'.glb').then(gltf=>{
   if(!root.parent)return;
   const scene=gltf.scene;
   scene.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(scene);
   const size=bounds.getSize(new THREE.Vector3());
   const center=bounds.getCenter(new THREE.Vector3());
   const source=[];
   scene.traverse(o=>{
    if(o.isMesh&&!o.isSkinnedMesh&&o.geometry&&o.material)
     source.push(o);
   });
   if(source.length===0||![size.x,size.y,size.z].every(Number.isFinite)||
      Math.min(size.x,size.y,size.z)<.00001)return;
   const batched=new THREE.Group();batched.name='CC0_Kenney_'+model;
   const instance=new THREE.Object3D();
   const offset=new THREE.Matrix4(),base=new THREE.Matrix4();
   for(const part of source){
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,items.length);
    mesh.name=model+'_mesh';mesh.frustumCulled=false;
    for(let i=0;i<items.length;i++){
     const item=items[i];
     // Surface-mounted lamps may project beyond the thin wall-object
     // bounding box; the depth limit prevents entering pedestrian space.
     const depth=Math.max(item.source==='wall'?.20:.30,item.d);
     const fit=Math.min(item.w/size.x,item.h/size.y,depth/size.z);
     const scale=Math.max(.0001,fit);
     const bottom=item.source==='ceiling'
       ?item.y+item.h-size.y*scale
       :item.y-size.y*scale/2;
     instance.position.set(item.x,bottom,item.z);
     instance.rotation.set(0,item.angle||0,0);
     instance.scale.set(scale,scale,scale);
     instance.updateMatrix();
     offset.makeTranslation(-center.x,-bounds.min.y,-center.z);
     base.copy(instance.matrix).multiply(offset).multiply(part.matrixWorld);
     mesh.setMatrixAt(i,base);
    }
    mesh.instanceMatrix.needsUpdate=true;
    batched.add(mesh);
   }
   // Old worlds can be discarded while a GLB is downloading. Check again
   // before committing to the visible scene.
   if(!root.parent)return;
   root.add(batched);
   fallback.visible=false;
  }).catch(error=>{
   // Keep deterministic, emissive procedural fixtures on offline devices.
   console.warn('3D fixture unavailable; procedural fallback:',model,error);
  });
  pending.push(task);
 }
 return {pending};
}
