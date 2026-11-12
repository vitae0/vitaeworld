import * as THREE from 'three';

// World-space panels follow structural wall faces without modifying the
// navmesh. GPU-instanced per category, so decorative trims stay inexpensive.
export function addWallFeatureVisuals(root,layout,owned){
 const pieces=layout.wallFeatures||[];
 if(!pieces.length)return {count:0};
 const style=layout.interiorStyle||{};
 const mats={
  slat:new THREE.MeshStandardMaterial({color:style.trim==='lightOak'?
   0xc2a17d:style.accent||0x997e6c,roughness:.73,metalness:style.metal||0}),
  panel:new THREE.MeshStandardMaterial({color:style.accent||0x837c78,
   roughness:.64,metalness:style.metal||0}),
  industrial:new THREE.MeshStandardMaterial({color:0x676a69,
   roughness:.54,metalness:.65}),
  wainscot:new THREE.MeshStandardMaterial({color:style.accent||0xc0a080,
   roughness:.78,metalness:.10})
 };
 for(const m of Object.values(mats))owned.add(m);
 const geom=new THREE.BoxGeometry(1,1,1);owned.add(geom);
 const tmp=new THREE.Object3D(),group=new THREE.Group();
 group.name='ProceduralWallTreatments';
 for(const kind of Object.keys(mats)){
  const parts=pieces.filter(p=>p.kind===kind);
  if(!parts.length)continue;
  const mesh=new THREE.InstancedMesh(geom,mats[kind],parts.length);
  mesh.name='WallTreatment_'+kind;
  mesh.frustumCulled=false;
  parts.forEach((p,i)=>{
   tmp.position.set(p.x,p.y,p.z);
   tmp.rotation.set(0,0,0);
   tmp.scale.set(p.w,p.h,p.d);
   tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
 }
 root.add(group);
 return {group,count:pieces.length};
}
