import * as THREE from 'three';

// Exterior windows are read from real openings in topology.js.
// Every repeated part is rendered as one InstancedMesh per shape/material.
// No window adds a PointLight, animation mixer or model download.
export function addWindowVisuals(root,layout,owned){
 const windows=layout.windows||[];
 if(!windows.length)return {count:0};
 const kind=layout.buildingProgram?.category||'konut';
 const finish=layout.buildingProgram?.material||'timber';
 const frameColor=finish==='concrete'?0x394c52:
  finish==='brick'?0xeee5d9:finish==='marble'?0xebe9df:0x847666;
 const frame=new THREE.MeshStandardMaterial({color:frameColor,
  roughness:.60,metalness:finish==='concrete'?.35:.08});
 const glass=new THREE.MeshPhysicalMaterial({color:0xb9e3ed,
  metalness:.1,roughness:.12,transparent:true,opacity:.33,
  depthWrite:false,side:THREE.DoubleSide});
 const fabric=new THREE.MeshStandardMaterial({color:0xe9ded0,
  roughness:.99,side:THREE.DoubleSide});
 const sill=new THREE.MeshStandardMaterial({color:0xd9cbbb,roughness:.8});
 for(const material of [frame,glass,fabric,sill])owned.add(material);
 const boxes={frame:[],glass:[],fabric:[],sill:[]};
 const local=(w,x,y,z,width,height,depth,role)=>{
  // All parts use the aperture centre in 3D; front wall is oriented
  // along X or Z according to topology's actual exterior wall axis.
  const angle=w.axis==='x'?0:Math.PI/2;
  const cs=Math.cos(angle),sn=Math.sin(angle);
  boxes[role].push({
   x:w.x+cs*x+sn*z,
   y:w.bottom+w.height/2+y,
   z:w.z-sn*x+cs*z,
   width,height,depth,angle
  });
 };
 for(const w of windows){
  const width=w.width,height=w.height;
  // Local +Z maps to world +Z for X walls and world +X for Z walls.
  // This puts curtains on the *inside* and exterior ledges outside.
  const outward=w.axis==='x'?w.dz:w.dx;
  const bar=.052,thick=.095;
  const dx=width/2-bar/2,dy=height/2-bar/2;
  local(w,0,dy,0,width,bar,thick,'frame');
  local(w,0,-dy,0,width,bar,thick,'frame');
  local(w,-dx,0,0,bar,height,thick,'frame');
  local(w,dx,0,0,bar,height,thick,'frame');
  local(w,0,0,0,.038,height-.13,.068,'frame');
  // Glass is a real transparent pane inside the carved masonry aperture.
  local(w,0,0,0,width-.12,height-.12,.013,'glass');
  // Shallow exterior sill and two trim details identify the façade.
  local(w,0,-height/2-.037,outward*.08,width+.13,.078,.19,'sill');
  local(w,0,height/2+.10,outward*.02,width+.12,.052,.14,'sill');
  // Privacy is handled in the topology generator: baths/utility spaces
  // never get transparent exterior glass. Curtains face into other rooms.
  if(kind!=='endüstri'&&kind!=='ticaret'&&w.type!=='corridor'){
   const key=Math.abs(Math.round(w.x*101+w.z*89));
   const half=width*.22;
   // Slightly folded curtains leave central glass visible from the room.
   if(key%4!==0)for(const side of [-1,1]){
    local(w,side*width*.325,-.035,-outward*.094,half,height*.91,.023,'fabric');
   }
  }
 }
 // Street-side canopy and a small entrance fascia help distinguish
 // public storefronts from domestic facades. They never block the door.
 if(layout.exteriorDoor){
  const entry=layout.exteriorDoor;
  const commercial=['ticaret','konaklama'].includes(kind);
  const angle=entry.axis==='x'?0:Math.PI/2;
  const signWidth=commercial?1.74:1.34;
  const canopyMat=new THREE.MeshStandardMaterial({
   color:commercial?0x43616d:0x9c8771,metalness:commercial?.3:.1,roughness:.66
  });
  owned.add(canopyMat);
  const awningGeo=new THREE.BoxGeometry(signWidth,.11,.60);
  const fasciaGeo=new THREE.BoxGeometry(signWidth,.23,.085);
  owned.add(awningGeo);owned.add(fasciaGeo);
  const awning=new THREE.Mesh(awningGeo,canopyMat);
  awning.name='FacadeEntryCanopy';
  awning.position.set(entry.x+entry.dx*.32,2.88,
    entry.z+entry.dz*.32);
  awning.rotation.y=angle;
  root.add(awning);
  const fascia=new THREE.Mesh(fasciaGeo,canopyMat);
  fascia.name='FacadeEntryFascia';
  fascia.position.set(entry.x+entry.dx*.09,3.02,
    entry.z+entry.dz*.09);
  fascia.rotation.y=angle;
  root.add(fascia);
 }
 const geo=new THREE.BoxGeometry(1,1,1);owned.add(geo);
 const node=new THREE.Object3D();
 for(const [role,list] of Object.entries(boxes)){
  if(!list.length)continue;
  const mat={frame,glass,fabric,sill}[role];
  const mesh=new THREE.InstancedMesh(geo,mat,list.length);
  mesh.name='FaçadeWindow_'+role;
  mesh.frustumCulled=false;
  for(let i=0;i<list.length;i++){
   const p=list[i];
   node.position.set(p.x,p.y,p.z);
   node.rotation.set(0,p.angle,0);
   node.scale.set(p.width,p.height,p.depth);
   node.updateMatrix();
   mesh.setMatrixAt(i,node.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  root.add(mesh);
 }
 return {count:windows.length};
}
