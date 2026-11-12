// Low-draw-call decorative geometry. The data generator lives in decor.js;
// all visual pieces are batched into just four instanced meshes.
import * as THREE from 'three';

export function addDecorVisuals(parent,decorations,owned,{textileMat=null}={}){
 const components={box:[],round:[],leaf:[],glow:[],rug:[]};
 const put=(kind,base,x,y,z,w,h,d,color,tilt=0)=>{
  const a=base.angle||0,c=Math.cos(a),s=Math.sin(a);
  components[kind].push({
   x:base.x+c*x+s*z,y:(base.source==='surface'?base.y:base.y)+y,
   z:base.z-s*x+c*z,w,h,d,color,angle:a,tilt
  });
 };
 const box=(b,x,y,z,w,h,d,c)=>put('box',b,x,y,z,w,h,d,c);
 const round=(b,x,y,z,w,h,d,c)=>put('round',b,x,y,z,w,h,d,c);
 const leaf=(b,x,y,z,w,h,d,c)=>put('leaf',b,x,y,z,w,h,d,c);
 for(const item of decorations){
  const ink=item.color,paper=item.paper,accent=item.accent,green=item.leaf;
  if(item.source==='floor'){
   // Cloth base is one shared textured instanced mesh. Geometric fringe and
   // kilim stripes read clearly even in the lowest mobile quality preset.
   put('rug',item,0,.014,0,item.w,.022,item.d,item.paper);
   box(item,0,.028,0,item.w*.88,.003,item.d*.83,item.color);
   if(item.kind==='kilim'){
    for(const side of [-1,1]){
     box(item,side*item.w*.38,.031,0,.042,.006,item.d*.77,item.accent);
     for(let i=-3;i<=3;i++){
      box(item,i*item.w*.10,.033,side*item.d*.30,
       item.w*.064,.004,item.d*.045,item.accent);
     }
    }
   }else box(item,0,.03,0,item.w*.67,.003,item.d*.65,item.accent);
   continue;
  }
  if(item.source==='ceiling'){
   // Four inexpensive fixture families. Bright diffusers are emissive;
   // point lights are deliberately omitted to protect mobile FPS.
   box(item,0,.29,0,.22,.08,.22,ink);
   if(item.kind==='flush'){
    round(item,0,.12,0,.49,.12,.49,accent);
    put('glow',item,0,.065,0,.42,.11,.42,0xffebc7);
   }else if(item.kind==='track'){
    box(item,0,.19,0,.84,.08,.12,ink);
    for(const x of [-.27,0,.27]){
     box(item,x,.035,0,.12,.16,.13,accent);
     put('glow',item,x,-.045,0,.14,.12,.14,0xffd8a5);
    }
   }else if(item.kind==='chandelier'){
    box(item,0,.09,0,.065,.39,.065,ink);
    for(let i=0;i<5;i++){
     const a=i*Math.PI*2/5,x=Math.sin(a)*.35,z=Math.cos(a)*.35;
     box(item,x,-.12,z,.045,.095,.045,accent);
     put('glow',item,x,-.19,z,.17,.17,.17,0xffecc8);
    }
   }else{
    box(item,0,.04,0,.055,.42,.055,ink);
    round(item,0,-.16,0,.50,.19,.50,accent);
    put('glow',item,0,-.25,0,.32,.12,.32,0xffe4bd);
   }
   continue;
  }
  if(item.source==='wall'){
   if(item.kind==='poster'){
    box(item,0,0,0,item.w,item.h,.039,ink);
    box(item,0,0,.028,item.w-.065,item.h-.065,.019,paper);
    box(item,0,.12,.043,item.w*.63,.16,.018,accent);
    box(item,0,-.04,.043,item.w*.68,.11,.018,green);
    box(item,-.12,-.19,.045,item.w*.28,.055,.018,ink);
   }else if(item.kind==='art'){
    box(item,0,0,0,item.w,item.h,.058,ink);
    box(item,0,0,.039,item.w-.09,item.h-.09,.021,paper);
    // Five simple compositions share a palette but differ in visual rhythm.
    if(item.variant%5===0){
     round(item,-.12,.07,.058,.20,.20,.025,accent);
     box(item,.12,-.10,.060,.29,.20,.025,green);
    }else if(item.variant%5===1){
     box(item,-.17,0,.060,.17,.43,.026,accent);
     box(item,.06,.04,.060,.23,.35,.026,green);
     box(item,.22,-.15,.063,.10,.12,.026,ink);
    }else if(item.variant%5===2){
     round(item,.10,.10,.058,.25,.25,.027,accent);
     box(item,-.12,-.13,.061,.34,.17,.025,ink);
    }else if(item.variant%5===3){
     box(item,0,.14,.059,.51,.11,.025,green);
     box(item,-.10,-.01,.061,.31,.11,.025,accent);
     box(item,.08,-.16,.062,.36,.12,.025,ink);
    }else{
     round(item,0,.07,.060,.29,.29,.026,green);
     box(item,0,-.13,.061,.53,.13,.025,accent);
    }
   }else if(item.kind==='shelf'){
    box(item,0,-.13,.09,.78,.055,.23,ink);
    box(item,-.23,.08,.09,.11,.36,.12,accent);
    box(item,-.08,.04,.09,.13,.28,.13,paper);
    box(item,.06,.075,.09,.10,.35,.11,green);
    round(item,.27,.01,.10,.16,.19,.16,accent);
    leaf(item,.27,.18,.10,.18,.23,.16,green);
   }else if(item.kind==='sconce'){
    box(item,0,0,.08,.19,.24,.14,ink);
    put('glow',item,0,.06,.17,.15,.16,.10,0xffe7b3);
    box(item,0,-.15,.11,.09,.06,.16,accent);
   }
   continue;
  }
  // Tabletop models use local bottom Y=0, so they sit on the supporting
  // furniture's top without borrowing any physics collider.
  if(item.kind==='book-stack'||item.kind==='magazine'){
   for(let i=0;i<(item.kind==='magazine'?2:3);i++){
    box(item,0,.016+i*.038,0,item.w-(i%2)*.02,.035,
     item.d, i%2?accent:paper);
   }
  }else if(item.kind==='plate'){
   round(item,0,.018,0,item.w,.035,item.d,paper);
   round(item,0,.038,0,item.w*.55,.02,item.d*.55,accent);
  }else if(item.kind==='tray'){
   box(item,0,.020,0,item.w,.04,item.d,ink);
   box(item,0,.045,0,item.w*.78,.02,item.d*.72,paper);
  }else if(item.kind==='vase'||item.kind==='jar'){
   round(item,0,item.h*.39,0,item.w,item.h*.78,item.d,accent);
   round(item,0,item.h*.80,0,item.w*.48,item.h*.25,item.d*.48,ink);
   if(item.kind==='vase'){
    leaf(item,0,item.h+.055,0,.17,.22,.17,green);
   }else round(item,0,item.h+.01,0,item.w*.92,.045,item.d*.92,paper);
  }else if(item.kind==='succulent'){
   round(item,0,.055,0,item.w*.94,.11,item.d*.94,ink);
   leaf(item,0,.18,0,item.w*.92,.20,item.d*.92,green);
   leaf(item,-.055,.17,.01,.11,.17,.12,accent);
  }else if(item.kind==='candle'){
   round(item,0,.073,0,item.w,.145,item.d,paper);
   put('glow',item,0,.17,0,.044,.075,.044,0xffc16b);
  }else if(item.kind==='bowl'){
   round(item,0,.055,0,item.w,.11,item.d,ink);
   round(item,0,.11,0,item.w*.75,.02,item.d*.75,paper);
  }else if(item.kind==='pencil-cup'){
   round(item,0,.067,0,item.w,.135,item.d,accent);
   box(item,-.023,.16,0,.019,.16,.019,ink);
   box(item,.027,.15,.018,.019,.13,.019,green);
   box(item,.005,.16,-.018,.019,.15,.019,paper);
  }else if(item.kind==='sculpture'){
   box(item,0,.053,0,item.w,.10,item.d,ink);
   round(item,0,.17,0,item.w*.70,.20,item.d*.72,accent);
  }
 }
 const shared=new THREE.Group();shared.name='DressedInteriors';parent.add(shared);
 const geo={
  box:new THREE.BoxGeometry(1,1,1),
  round:new THREE.CylinderGeometry(.5,.5,1,10),
  leaf:new THREE.IcosahedronGeometry(.5,1),
  glow:new THREE.IcosahedronGeometry(.5,1),
  rug:new THREE.BoxGeometry(1,1,1)
 };
 const materials={
  box:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84,metalness:0}),
  round:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.70,metalness:.04}),
  leaf:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:0}),
  glow:new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffddb0,emissiveIntensity:.55}),
  rug:textileMat||new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97})
 };
 const transform=new THREE.Object3D();
 for(const kind of Object.keys(components)){
  const parts=components[kind];
  if(!parts.length){owned.add(geo[kind]);owned.add(materials[kind]);continue;}
  const mesh=new THREE.InstancedMesh(geo[kind],materials[kind],parts.length);
  mesh.name='RoomDecor_'+kind;mesh.frustumCulled=false;
  for(let i=0;i<parts.length;i++){
   const p=parts[i];
   transform.position.set(p.x,p.y,p.z);
   transform.rotation.set(p.tilt,p.angle,0);
   transform.scale.set(p.w,p.h,p.d);
   transform.updateMatrix();
   mesh.setMatrixAt(i,transform.matrix);
   mesh.setColorAt(i,new THREE.Color(p.color));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  owned.add(geo[kind]);owned.add(materials[kind]);shared.add(mesh);
 }
 return shared;
}
