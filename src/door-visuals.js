import * as THREE from 'three';
import {DOOR_HEIGHT,DOOR_WIDTH} from './topology.js';
import {doorStyleFor} from './door-styles.js';

// All doors and handles are instanced; glass really replaces the solid centre
// instead of putting a transparent pane on top of an opaque board.
export function buildDoorVisuals(root,layout,owned){
 const internal=layout.doors;
 const specs=[...internal.map(d=>({...d,...doorStyleFor(layout,d)})),
  ...(layout.exteriorDoor?
    [{...layout.exteriorDoor,...doorStyleFor(layout,layout.exteriorDoor)}]:[])];
 const size=DOOR_WIDTH-.045,height=DOOR_HEIGHT-.035;
 const wood=new THREE.MeshStandardMaterial({color:0x90735e,roughness:.68});
 const metal=new THREE.MeshStandardMaterial({color:0xebc9a0,metalness:.57,roughness:.29});
 const glass=new THREE.MeshPhysicalMaterial({color:0x9fd9e0,metalness:0,
  roughness:.08,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide});
 const frosted=new THREE.MeshPhysicalMaterial({color:0xd7e1e2,metalness:0,
  roughness:.92,transparent:true,opacity:.76,depthWrite:false,side:THREE.DoubleSide});
 for(const m of [wood,metal,glass,frosted])owned.add(m);
 const types={
  body:{material:wood,shape:[size,height,.057],count:specs.filter(x=>x.finish==='opaque').length},
  railH:{material:wood,shape:[size,.23,.072],count:specs.filter(x=>x.finish!=='opaque').length*2},
  railV:{material:wood,shape:[.13,height-.46,.072],count:specs.filter(x=>x.finish!=='opaque').length*2},
  glass:{material:glass,shape:[size-.24,height-.43,.020],count:specs.filter(x=>x.finish==='glazed').length},
  frosted:{material:frosted,shape:[size-.24,height-.43,.020],count:specs.filter(x=>x.finish==='frosted').length},
  handle:{material:metal,shape:[.12,.047,.20],count:specs.length}
 };
 const batches={};
 for(const [name,def] of Object.entries(types)){
  if(!def.count)continue;
  const geom=new THREE.BoxGeometry(...def.shape);owned.add(geom);
  const mesh=new THREE.InstancedMesh(geom,def.material,def.count);
  mesh.name='Door_'+name;mesh.frustumCulled=false;
  batches[name]=mesh;root.add(mesh);
 }
 const progress=new Float32Array(specs.length);
 const target=new Float32Array(specs.length);
 const byRoom=new Map(internal.map((d,i)=>[d.roomId,i]));
 // Pre-compute every per-part instance location to avoid allocating meshes
 // each animation frame and guarantee deterministic geometry.
 const entries=specs.map((d,i)=>({door:d,i,instances:[]}));
 const counts=Object.fromEntries(Object.keys(batches).map(k=>[k,0]));
 function register(entry,name,x,y,z){
  if(!batches[name])return;
  entry.instances.push({name,index:counts[name]++,x,y,z});
 }
 for(const e of entries){
  const d=e.door;
  if(d.finish==='opaque')register(e,'body',0,0,0);
  else{
   register(e,'railH',0,height*.5-.115,0);
   register(e,'railH',0,-height*.5+.115,0);
   register(e,'railV',-(size*.5-.065),0,0);
   register(e,'railV',size*.5-.065,0,0);
   register(e,d.finish,0,0,0);
  }
  register(e,'handle',size*.32,-.05,-.070);
 }
 const pivot=new THREE.Object3D(),part=new THREE.Object3D();
 const matrix=new THREE.Matrix4();
 const centerY=.10+height/2;
 function updateOne(e){
  const d=e.door,alongX=d.axis==='x',t=progress[e.i];
  const startAngle=alongX?0:Math.PI/2;
  const endAngle=alongX?-(d.dz||1)*Math.PI/2:(d.dx>0?Math.PI:0);
  const angle=startAngle+(endAngle-startAngle)*t;
  const hingeX=d.x-(alongX?size/2:0);
  const hingeZ=d.z+(alongX?0:size/2);
  pivot.position.set(hingeX+Math.cos(angle)*size/2,centerY,
    hingeZ-Math.sin(angle)*size/2);
  pivot.rotation.set(0,angle,0);
  pivot.scale.set(1,1,1);pivot.updateMatrix();
  for(const item of e.instances){
   part.position.set(item.x,item.y,item.z);
   part.rotation.set(0,0,0);part.scale.set(1,1,1);
   part.updateMatrix();
   matrix.multiplyMatrices(pivot.matrix,part.matrix);
   batches[item.name].setMatrixAt(item.index,matrix);
  }
 }
 entries.forEach(updateOne);
 for(const mesh of Object.values(batches))mesh.instanceMatrix.needsUpdate=true;
 return {
  get length(){return specs.length;},
  styles:specs.map(d=>({roomId:d.roomId??null,finish:d.finish,
   exterior:Boolean(d.exterior),locked:Boolean(d.locked)})),
  setOpen(roomId,isOpen){
   const index=byRoom.get(roomId);
   if(index===undefined)return false;
   target[index]=isOpen?1:0;
   return true;
  },
  update(dt){
   const dirty=new Set(),step=Math.min(.05,Math.max(0,dt))*4.8;
   for(const e of entries){
    const i=e.i;
    if(Math.abs(target[i]-progress[i])<.0001)continue;
    progress[i]+=Math.sign(target[i]-progress[i])*
       Math.min(step,Math.abs(target[i]-progress[i]));
    updateOne(e);
    for(const p of e.instances)dirty.add(p.name);
   }
   for(const name of dirty)batches[name].instanceMatrix.needsUpdate=true;
  },
  getOpen(roomId){
   const index=byRoom.get(roomId);
   return index!==undefined&&target[index]===1;
  }
 };
}
