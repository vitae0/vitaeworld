import * as THREE from 'three';

// Shared door leaf & handle meshes, one GPU draw call each per floor.
// Door panels are genuine moving objects, independent from the static
// lintel/wall mesh. Geometry matches the 1.10 m topology doorway.
export function buildDoorVisuals(root,layout,owned){
 const doors=layout.doors,leafWidth=1.06;
 const leafGeo=new THREE.BoxGeometry(1,1,1);
 const handleGeo=new THREE.BoxGeometry(1,1,1);
 const wood=new THREE.MeshStandardMaterial({color:0x91755e,roughness:.73});
 const metal=new THREE.MeshStandardMaterial({color:0xe6ccb0,metalness:.55,roughness:.27});
 for(const o of [leafGeo,handleGeo,wood,metal])owned.add(o);
 const leafs=new THREE.InstancedMesh(leafGeo,wood,doors.length);
 const handles=new THREE.InstancedMesh(handleGeo,metal,doors.length);
 leafs.name='InteractiveDoors';handles.name='DoorHandles';
 leafs.frustumCulled=false;handles.frustumCulled=false;
 const world=new THREE.Object3D();
 const opened=new Set();
 const byId=new Map(doors.map((d,i)=>[d.roomId,i]));
 function matrixFor(door,open){
  const alongX=door.axis==='x';
  const hx=door.x-(alongX?leafWidth/2:0);
  const hz=door.z+(alongX?0:leafWidth/2);
  const angle=alongX?(open?-(door.dz||1)*Math.PI/2:0):
    (open?(door.dx>0?Math.PI:0):Math.PI/2);
  const vx=Math.cos(angle),vz=-Math.sin(angle);
  return {x:hx+vx*leafWidth/2,z:hz+vz*leafWidth/2,angle,vx,vz};
 }
 function updateOne(i){
  const door=doors[i],pose=matrixFor(door,opened.has(door.roomId));
  world.position.set(pose.x,1.28,pose.z);
  world.rotation.set(0,pose.angle,0);
  world.scale.set(leafWidth,2.30,.055);
  world.updateMatrix();leafs.setMatrixAt(i,world.matrix);
  // Small simple handle, visible without a separate GLB request.
  world.position.set(pose.x+pose.vx*.34,1.16,pose.z+pose.vz*.34);
  world.rotation.set(0,pose.angle,0);
  world.scale.set(.14,.055,.16);
  world.updateMatrix();handles.setMatrixAt(i,world.matrix);
 }
 doors.forEach((_,i)=>updateOne(i));
 leafs.instanceMatrix.needsUpdate=true;handles.instanceMatrix.needsUpdate=true;
 root.add(leafs,handles);
 return {
  setOpen(roomId,isOpen){
   const i=byId.get(roomId);if(i===undefined)return false;
   if(isOpen)opened.add(roomId);else opened.delete(roomId);
   updateOne(i);
   leafs.instanceMatrix.needsUpdate=true;
   handles.instanceMatrix.needsUpdate=true;
   return true;
  },
  getOpen(roomId){return opened.has(roomId);}
 };
}
