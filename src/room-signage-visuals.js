import * as THREE from 'three';

// One text atlas and one instanced frame batch for every story. Thousands of
// separate signs/texture uploads would be absurd in a browser-first world.
export function addSignageVisuals(root,layout,owned){
 const signs=layout.signage||[];
 if(!signs.length)return {count:0,batches:0};
 const columns=4,rows=Math.ceil(signs.length/columns);
 const canvas=document.createElement('canvas');
 canvas.width=columns*256;canvas.height=rows*64;
 const ctx=canvas.getContext('2d');
 if(!ctx)return {count:0,batches:0};
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const style=layout.interiorStyle||{};
 for(let i=0;i<signs.length;i++){
  const x=i%columns*256,y=Math.floor(i/columns)*64;
  ctx.fillStyle=['rusty','industrial','brutalist'].includes(style.id)?
   '#3c3d3b':'#28343c';
  ctx.fillRect(x+3,y+3,250,58);
  ctx.strokeStyle=style.id==='rusty'?'#b98057':'#90acaa';
  ctx.lineWidth=2;ctx.strokeRect(x+9,y+9,238,46);
  ctx.font='600 25px system-ui,sans-serif';
  ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.fillStyle='#f3f4ea';
  ctx.fillText(signs[i].label,x+128,y+32,220);
 }
 const atlas=new THREE.CanvasTexture(canvas);
 atlas.colorSpace=THREE.SRGBColorSpace;
 atlas.anisotropy=2;owned.add(atlas);
 const faceMaterial=new THREE.MeshBasicMaterial({
  map:atlas,side:THREE.FrontSide,transparent:false
 });
 const frameMaterial=new THREE.MeshStandardMaterial({
  color:style.metal>.45?0x3e4d50:0x725f4b,
  metalness:style.metal||.1,roughness:.5
 });
 owned.add(faceMaterial);owned.add(frameMaterial);
 const frameGeometry=new THREE.BoxGeometry(1,1,1);owned.add(frameGeometry);
 const frames=new THREE.InstancedMesh(frameGeometry,frameMaterial,signs.length);
 frames.name='InteriorDoorwaySignFrames';
 frames.frustumCulled=false;
 const t=new THREE.Object3D(),vertices=[],uv=[],indices=[];
 for(let i=0;i<signs.length;i++){
  const s=signs[i],c=Math.cos(s.angle),sn=Math.sin(s.angle);
  t.position.set(s.x,s.y,s.z);
  t.rotation.set(0,s.angle,0);
  t.scale.set(s.width+.07,s.height+.048,.035);
  t.updateMatrix();frames.setMatrixAt(i,t.matrix);
  const cx=s.x+sn*.022,cz=s.z+c*.022;
  const w=s.width/2,h=s.height/2;
  for(const [dx,dy] of [[-w,-h],[w,-h],[w,h],[-w,h]]){
   vertices.push(cx+c*dx,s.y+dy,cz-sn*dx);
  }
  const col=i%columns,row=Math.floor(i/columns);
  const u0=(col+0.035)/columns,u1=(col+.965)/columns;
  const v0=1-(row+.935)/rows,v1=1-(row+.065)/rows;
  uv.push(u0,v0,u1,v0,u1,v1,u0,v1);
  const a=i*4;indices.push(a,a+1,a+2,a,a+2,a+3);
 }
 frames.instanceMatrix.needsUpdate=true;
 root.add(frames);
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geom.setIndex(indices);
 geom.computeVertexNormals();owned.add(geom);
 const text=new THREE.Mesh(geom,faceMaterial);
 text.name='InteriorRoomSignsAtlas';
 text.frustumCulled=false;root.add(text);
 return {count:signs.length,batches:2};
}
