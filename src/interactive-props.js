import * as THREE from 'three';

// Lightweight local interactions on loaded furniture holders. The GLB can
// arrive later; these state parts remain attached to its stable holder.
// They deliberately use no per-object realtime lights or animation mixers.
export function buildInteractivePropVisuals(propHolders,props,owned){
 const lightMaterial=new THREE.MeshStandardMaterial({color:0xc7efff,
  emissive:0x5ccbf9,emissiveIntensity:1.5,roughness:.36});
 const screenMaterial=new THREE.MeshStandardMaterial({color:0x80d6ec,
  emissive:0x3aa8df,emissiveIntensity:1.8,roughness:.23});
 const doorMaterial=new THREE.MeshStandardMaterial({color:0xa48f7d,roughness:.78});
 const hotMaterial=new THREE.MeshStandardMaterial({color:0xffa25b,
  emissive:0xff591c,emissiveIntensity:1.1,roughness:.65});
 for(const mat of [lightMaterial,screenMaterial,doorMaterial,hotMaterial])owned.add(mat);
 const shapes=new Map();
 const create=(g,mat)=>{owned.add(g);return new THREE.Mesh(g,mat);};
 for(const p of props){
  const holder=propHolders.get(p.id);
  if(!holder)continue;
  let target;
  if(p.role==='storage'||p.role==='coldStorage'){
   // An articulated overlay gives a readable open/closed state to fixed,
   // non-rigged Kenney cabinets without mutating the shared source GLB.
   const pivot=new THREE.Group();
   pivot.position.set(-p.modelW*.43,p.h*.47,-p.modelD*.53);
   const panel=create(new THREE.BoxGeometry(
     Math.min(1,p.modelW*.78),Math.min(1.6,p.h*.86),.035),doorMaterial);
   panel.position.x=Math.min(1,p.modelW*.78)*.5;
   pivot.add(panel);holder.add(pivot);
   target={type:'hinge',node:pivot,goal:0};
  }else if(p.role==='screen'){
   const panel=create(new THREE.BoxGeometry(
     Math.max(.3,p.modelW*.85),Math.max(.17,p.h*.50),.015),screenMaterial);
   panel.position.set(0,p.h*.62,-p.modelD*.55);
   panel.visible=false;holder.add(panel);
   target={type:'visible',node:panel};
  }else if(p.role==='lighting'){
   const bulb=create(new THREE.SphereGeometry(.13,8,6),lightMaterial);
   bulb.position.set(0,Math.min(p.h*.82,p.h-.10),0);
   bulb.visible=false;holder.add(bulb);
   target={type:'visible',node:bulb};
  }else if(p.role==='sink'||p.role==='shower'){
   const stream=create(new THREE.CylinderGeometry(.027,.034,
     p.role==='shower'?1.15:.25,8),lightMaterial);
   stream.position.set(0,p.role==='shower'?1.22:p.h*.83,-.05);
   stream.visible=false;holder.add(stream);
   target={type:'visible',node:stream};
  }else if(p.role==='cooking'){
   const coil=create(new THREE.TorusGeometry(.24,.024,6,24),hotMaterial);
   coil.rotation.x=Math.PI/2;
   coil.position.y=p.h+.012;
   coil.visible=false;holder.add(coil);
   target={type:'visible',node:coil};
  }
  if(target)shapes.set(p.id,target);
 }
 return {
  setState(propId,on){
   const item=shapes.get(propId);if(!item)return false;
   if(item.type==='hinge')item.goal=on?-1.16:0;
   else item.node.visible=Boolean(on);
   return true;
  },
  update(dt){
   const step=Math.max(0,Math.min(dt,.05))*5.6;
   for(const item of shapes.values()){
    if(item.type!=='hinge')continue;
    const delta=item.goal-item.node.rotation.y;
    if(Math.abs(delta)<.0001)continue;
    item.node.rotation.y+=Math.sign(delta)*Math.min(Math.abs(delta),step);
   }
  },
  get count(){return shapes.size;}
 };
}
