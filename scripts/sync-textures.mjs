// Build-time, licensed texture vendor. Requires Node >=20.
// Only fetches CC0 maps from Poly Haven's official API + CDN.
// Can be run locally or in the GitHub Pages workflow. Missing network does
// not break the playable fallback; the console reports exactly what synced.
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

const ASSETS=[
 'white_plaster_02','wood_planks','tiled_floor_001','fabric_pattern_05',
 'laminate_floor_02','marble_tiles','terracotta_floor_tiles',
 'brick_wall_07','painted_plaster_wall','concrete_floor'
];
const KINDS=[
 {name:'Diffuse',aliases:['diffuse','col','col_01','albedo','basecolor']},
 {name:'Normal',aliases:['nor_gl','normal_gl','normalgl']},
 {name:'Rough',aliases:['rough','roughness']}
];
const outDir='public/textures';
const wait=(ms)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('download timeout')),ms));
const fetchSafe=async(url,timeout=15000)=>{
 const response=await Promise.race([
  fetch(url,{headers:{'User-Agent':'VitaeWorld-CC0-Asset-Sync/1.0'}}),wait(timeout)
 ]);
 if(!response.ok)throw Error('HTTP '+response.status+' '+url);
 return response;
};
function chooseFile(manifest,aliases){
 const entry=Object.entries(manifest).find(([name,value])=>
  aliases.includes(name.toLowerCase())&&value&&typeof value==='object');
 if(!entry)return null;
 const resolutions=entry[1],rank=['1k','512','2k'];
 for(const res of rank){
  const variants=resolutions[res];
  if(!variants)continue;
  for(const type of ['jpg','jpeg']){
   const file=variants[type];
   if(file?.url&&
      (file.url.startsWith('https://dl.polyhaven.org/')||
       file.url.startsWith('https://cdn.polyhaven.com/'))&&
      (!file.size||file.size<=3_000_000))return file.url;
  }
 }
 return null;
}
await mkdir(outDir,{recursive:true});
const records=[],issues=[];
for(const id of ASSETS){
 let files;
 try{files=await (await fetchSafe('https://api.polyhaven.com/files/'+id)).json();}
 catch(error){issues.push(id+': API '+error.message);continue;}
 for(const kind of KINDS){
  const url=chooseFile(files,kind.aliases);
  if(!url){issues.push(id+'/'+kind.name+': no 1K JPG map');continue;}
  try{
   const res=await fetchSafe(url,20000),bytes=Buffer.from(await res.arrayBuffer());
   if(bytes.length>3_000_000||bytes.length<2000||bytes[0]!==0xff||bytes[1]!==0xd8)
    throw Error('invalid JPEG / size');
   const filename=id+'_'+kind.name+'.jpg';
   await writeFile(join(outDir,filename),bytes);
   records.push({asset:id,map:kind.name,file:filename,bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),url});
  }catch(error){issues.push(id+'/'+kind.name+': '+error.message);}
 }
}
await writeFile(join(outDir,'sources.json'),JSON.stringify({
 license:'CC0 1.0',provider:'Poly Haven',api:'https://api.polyhaven.com/',
 assets:records,issues
},null,2)+'\n');
console.log('Poly Haven textures: '+records.length+'/'+(ASSETS.length*KINDS.length)+' synced');
for(const issue of issues)console.warn('Texture fallback: '+issue);
if(process.argv.includes('--strict')&&records.length<ASSETS.length*KINDS.length)process.exitCode=1;
