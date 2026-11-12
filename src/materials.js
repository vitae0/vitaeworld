import * as THREE from 'three';

// Procedural texture is the offline fallback. In deployed builds, the CC0
// Poly Haven maps downloaded by scripts/sync-textures.mjs replace it.
// Small source bitmaps and no displacement maps keep mobile memory bounded.
const ASSET={plaster:'white_plaster_02',wood:'wood_planks',
 tile:'tiled_floor_001',fabric:'fabric_pattern_05'};
let manifestPromise;
function manifest(){
 if(!manifestPromise){
  manifestPromise=fetch(import.meta.env.BASE_URL+'textures/sources.json')
   .then(r=>r.ok?r.json():null).catch(()=>null);
 }
 return manifestPromise;
}
function hash(x,z){let v=Math.imul(x+9187,73856093)^Math.imul(z+1729,19349663);
 v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;}
function fallbackMap(kind){
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d',{alpha:false});
 const img=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const n=hash(x>>1,y>>1)*13-6.5;
  let r,g,b;
  if(kind==='wood'){
   const plank=Math.floor(y/48),grain=(Math.sin(x*.12+Math.sin(y*.06)*2)+Math.sin(x*.33+y*.11))*.5;
   const groove=y%48<=2||x%256<2&&plank%2===0?-45:0;
   const shade=grain*9+n+groove+(plank%2?7:-7);
   r=166+shade;g=125+shade*.9;b=86+shade*.55;
  }else if(kind==='tile'){
   const grout=(x%64<3||y%64<3)?-60:0,shade=n*.64+grout;
   r=210+shade;g=206+shade;b=190+shade;
  }else if(kind==='fabric'){
   const weave=(x%5<2?-10:4)+(y%5<2?-7:3)+n*.36;
   r=185+weave;g=169+weave;b=147+weave;
  }else{
   r=222+n;g=219+n;b=208+n;
  }
  const i=(y*256+x)*4;
  img.data[i]=Math.max(0,Math.min(255,r));
  img.data[i+1]=Math.max(0,Math.min(255,g));
  img.data[i+2]=Math.max(0,Math.min(255,b));
  img.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy=2;
 return texture;
}
const loader=new THREE.TextureLoader();
function configure(texture,srgb){
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
 texture.anisotropy=2;
 return texture;
}
export function createSurfaceMaterial(kind,owned,{tint=0xffffff,
 roughness=.85,metalness=0}={}){
 if(!ASSET[kind])throw Error('Unrecognized surface: '+kind);
 const defaultMap=fallbackMap(kind);
 const mat=new THREE.MeshStandardMaterial({color:tint,map:defaultMap,
  roughness,metalness});
 owned.add(mat);owned.add(defaultMap);
 let disposed=false;
 const originalDispose=mat.dispose.bind(mat);
 mat.dispose=()=>{disposed=true;originalDispose();};
 manifest().then(async data=>{
  if(!data||disposed)return;
  const records=(data.assets||[]).filter(r=>r.asset===ASSET[kind]);
  const get=type=>records.find(r=>r.map===type)?.file;
  for(const [role,type] of [['map','Diffuse'],['normalMap','Normal'],['roughnessMap','Rough']]){
   const file=get(type);
   if(!file)continue;
   try{
    const tex=configure(await loader.loadAsync(
      import.meta.env.BASE_URL+'textures/'+encodeURIComponent(file)),
      role==='map');
    if(disposed){tex.dispose();continue;}
    owned.add(tex);mat[role]=tex;mat.needsUpdate=true;
   }catch{ /* Keep the original patterned texture and constant roughness. */ }
  }
 });
 return mat;
}
