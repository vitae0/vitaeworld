import * as THREE from 'three';

// Visible staircase follows the same rise/run as stairs.js sampling, so
// avatar ground height and the rendered treads never drift apart.
export function buildStairVisuals(scene,building){
 const root=new THREE.Group();root.name='TraversableStaircases';scene.add(root);
 const owned=new Set(),box=new THREE.BoxGeometry(1,1,1);owned.add(box);
 const treadMat=new THREE.MeshStandardMaterial({color:0x9b8067,roughness:.83});
 const riserMat=new THREE.MeshStandardMaterial({color:0x786557,roughness:.86});
 const railMat=new THREE.MeshStandardMaterial({color:0x424c4b,metalness:.45,roughness:.46});
 for(const m of [treadMat,riserMat,railMat])owned.add(m);
 const edge=(parent,x,y,z,w,h,d,mat)=>{
  const mesh=new THREE.Mesh(box,mat);
  mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
 };
 for(const stair of building.stairs){
  const flight=new THREE.Group();
  flight.name=stair.id;flight.position.set(stair.start.x,stair.from*building.levelHeight,stair.start.z);
  flight.rotation.y=Math.atan2(stair.dx,stair.dz);root.add(flight);
  const stepRun=stair.run/stair.steps,stepRise=stair.rise/stair.steps;
  for(let i=0;i<stair.steps;i++){
   const y=(i+1)*stepRise;
   const z=(i+.5)*stepRun;
   edge(flight,0,y-.065,z,stair.width,.13,stepRun+.008,treadMat);
   // Thin vertical risers stop the stairs from looking like floating blocks.
   edge(flight,0,y-stepRise/2,z-stepRun/2,stair.width,stepRise,.055,riserMat);
  }
  for(const side of [-1,1]){
   const lateral=side*(stair.width/2+.065);
   const from=new THREE.Vector3(lateral,.95,0);
   const to=new THREE.Vector3(lateral,.95+stair.rise,stair.run);
   const direction=to.clone().sub(from);
   const railGeometry=new THREE.CylinderGeometry(.038,.038,direction.length(),7);
   owned.add(railGeometry);
   const rail=new THREE.Mesh(railGeometry,railMat);
   rail.position.copy(from.add(to).multiplyScalar(.5));
   rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
   flight.add(rail);
   for(let i=0;i<=stair.steps;i+=4){
    const z=i*stepRun,y=(i*stepRise)+.48;
    edge(flight,lateral,y,z,.052,.96,.052,railMat);
   }
  }
 }
 return {root,dispose(){scene.remove(root);for(const r of owned)r.dispose();}};
}
