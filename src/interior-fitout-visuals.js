import * as THREE from 'three';

// Every repeated profile is one InstancedMesh; no GLB loads or collision
// bodies. PBR materials are borrowed from the current story's palette.
export function addInteriorFitoutVisuals(root,layout,owned,{
 trimMat,tileMat,textileMat,ceilingMat,lightColor=0xffdfb4
}={}){
 const data=layout.fitout?.pieces||[];
 if(!data.length)return {count:0,batches:0};
 const glow=new THREE.MeshStandardMaterial({
  color:0xe8ded0,emissive:lightColor,emissiveIntensity:.56,
  roughness:.54,metalness:.10
 });
 owned.add(glow);
 const accents=new THREE.MeshStandardMaterial({
  color:layout.interiorStyle?.accent||0xb8a28d,
  roughness:.72,metalness:layout.interiorStyle?.metal||0
 });
 owned.add(accents);
 const group=new THREE.Group();group.name='InteriorFinalFinishes';root.add(group);
 const byRole={
  casing:[],threshold:[],tile:[],acoustic:[],accent:[],
  ceiling:[],glow:[]
 };
 const roleOf={
  jamb:'casing',overDoor:'casing',threshold:'threshold',
  bathTile:'tile',serviceTile:'tile',backsplash:'tile',
  acousticPanel:'acoustic',headboard:'acoustic',
  featurePanel:'accent',galleryPanel:'accent',
  ceilingCove:'ceiling',wayfinding:'glow'
 };
 for(const part of data){
  const role=roleOf[part.kind];
  if(role)byRole[role].push(part);
 }
 const base=new THREE.BoxGeometry(1,1,1);owned.add(base);
 const transform=new THREE.Object3D();
 let batches=0;
 for(const [role,parts] of Object.entries(byRole)){
  if(!parts.length)continue;
  const mat=({
   casing:trimMat,threshold:trimMat,tile:tileMat,
   acoustic:textileMat||accents,accent:accents,
   ceiling:ceilingMat,glow
  })[role];
  const mesh=new THREE.InstancedMesh(base,mat,parts.length);
  mesh.name='InteriorFinish_'+role;
  mesh.frustumCulled=false;
  for(let i=0;i<parts.length;i++){
   const p=parts[i];
   transform.position.set(p.x,p.y,p.z);
   transform.rotation.set(0,0,0);
   transform.scale.set(p.w,p.h,p.d);
   transform.updateMatrix();
   mesh.setMatrixAt(i,transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  group.add(mesh);batches++;
 }
 return {count:data.length,batches,group,glow};
}
