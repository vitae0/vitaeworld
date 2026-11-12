// Optional in-browser direction diagnostics. Open the prototype with
// ?qaFacing=1 to see a green arrow for companion-aligned models and
// amber arrows for default/native-axis-review candidates.
// Instanced arrows cost two draw calls per storey, only in debug mode.
import * as THREE from 'three';
import {DIRECTIONAL_ROLES} from './orientation.js';

export function addFacingDebug(root,layout,owned){
 const props=layout.props.filter(p=>p.solid&&DIRECTIONAL_ROLES.has(p.role));
 if(!props.length)return null;
 const barGeo=new THREE.BoxGeometry(1,1,1);
 const tipGeo=new THREE.ConeGeometry(.5,1,6);
 const mat=new THREE.MeshBasicMaterial({vertexColors:false});
 for(const resource of [barGeo,tipGeo,mat])owned.add(resource);
 const bar=new THREE.InstancedMesh(barGeo,mat,props.length);
 const tip=new THREE.InstancedMesh(tipGeo,mat,props.length);
 bar.name='QA_FACING_SHAFT';tip.name='QA_FACING_TIP';
 const pivot=new THREE.Object3D();
 const parent=new THREE.Group();
 parent.name='QA_FACING_ARROWS';
 root.add(parent);
 parent.add(bar,tip);
 props.forEach((p,i)=>{
  const c=new THREE.Color(p.faceTarget?0x61ffb3:0xffbd5b);
  pivot.rotation.set(0,p.angle,0);
  pivot.position.set(p.x,(p.y??.1)+p.h+.14,p.z-.29);
  pivot.scale.set(.037,.037,.49);
  // Our forward axis is -Z; rotate the positions with the object yaw.
  const x=-Math.sin(p.angle)*.29,z=-Math.cos(p.angle)*.29;
  pivot.position.set(p.x+x,(p.y??.1)+p.h+.18,p.z+z);
  pivot.updateMatrix();bar.setMatrixAt(i,pivot.matrix);bar.setColorAt(i,c);
  const tx=-Math.sin(p.angle)*.64,tz=-Math.cos(p.angle)*.64;
  pivot.position.set(p.x+tx,(p.y??.1)+p.h+.18,p.z+tz);
  pivot.rotation.set(-Math.PI/2,p.angle,0,'YXZ');
  pivot.scale.set(.16,.18,.16);
  pivot.updateMatrix();tip.setMatrixAt(i,pivot.matrix);tip.setColorAt(i,c);
 });
 bar.instanceMatrix.needsUpdate=true;tip.instanceMatrix.needsUpdate=true;
 bar.instanceColor.needsUpdate=true;tip.instanceColor.needsUpdate=true;
 return parent;
}
