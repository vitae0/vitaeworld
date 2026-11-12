// Build-time CC0 asset vendor: copies all used furniture + fixture GLBs and
// both character GLBs into this site's own public directory.
// No per-object GitHub fetches from the player's browser in production.
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {FURNITURE} from '../src/semantics.js';
import {FIXTURE_MODEL_IDS} from '../src/fixture-specs.js';

const REV='3ddcc695adbba9fb918cf31b7c139b3f95b76910';
const RAW='https://raw.githubusercontent.com/';
const base=RAW+'Hidencod/tge-assets/'+REV+'/packs/furniture-kit/';
const AVATARS=[
 {id:'hero',url:RAW+'programasweights/avatar/a488723e3a93d73d5c562d88f8a85353c37bc721/public/assets/character.glb'},
 {id:'rogue',url:RAW+'sion-rgb/tactical-slash/8bf8d835cb7afa7cb3f4d893b0966c6b4e9b7727/assets/characters/player/player_archer.glb'}
];
const ids=[...new Set([...FURNITURE.map(x=>x.model),...FIXTURE_MODEL_IDS])].sort();
const items=[
 ...ids.map(id=>({id,kind:'furniture',url:base+id+'.glb',path:'furniture/'+id+'.glb'})),
 ...AVATARS.map(a=>({...a,kind:'avatar',path:'avatars/'+a.id+'.glb'}))
];
const dir='public/models',strict=process.argv.includes('--strict');
const pool=8,maxAttempts=4;
const results=Array(items.length),failures=[];
let next=0,done=0;
function validate(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<20||view.getUint32(0,true)!==0x46546c67||
    view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length)
  throw Error('Invalid GLB magic/version/byte length');
 const jsonLength=view.getUint32(12,true);
 if(jsonLength<2||jsonLength+20>bytes.length)
  throw Error('Invalid GLB header');
}
async function download(item){
 let last;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),26000);
   let response;
   try{
    response=await fetch(item.url,{signal:controller.signal,
     headers:{'User-Agent':'VitaeWorld-CC0-Asset-Vendor/1.0'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    validate(bytes);
    const hash=createHash('sha256').update(bytes).digest('hex');
    const filename=join(dir,item.path);
    await mkdir(dirname(filename),{recursive:true});
    await writeFile(filename,bytes);
    return {...item,bytes:bytes.length,sha256:hash};
   }finally{clearTimeout(timeout);}
  }catch(err){
   last=err;
   if(attempt<maxAttempts-1)await new Promise(done=>
    setTimeout(done,350*(attempt+1)*(attempt+1)));
  }
 }
 throw Error(item.id+': '+String(last?.message||last));
}
async function worker(){
 while(next<items.length){
  const i=next++,item=items[i];
  try{results[i]=await download(item);}
  catch(err){
   failures.push(String(err));
   // Never retain a stale file in a partial local build.
   await rm(join(dir,item.path),{force:true}).catch(()=>{});
  }
  done++;
  if(done%20===0||done===items.length)
   console.log('CC0 models '+done+'/'+items.length);
 }
}
await mkdir(dir,{recursive:true});
await Promise.all(Array.from({length:pool},worker));
const records=results.filter(Boolean);
const manifest={
 version:1,provider:'Kenney, Quaternius, KayKit via pinned source mirrors',
 license:'CC0 1.0',
 furnitureRevision:REV,
 expected:items.length,downloaded:records.length,
 assets:records,failures
};
await writeFile(join(dir,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('CC0 bundled models: '+records.length+'/'+items.length+
 ' ('+(records.reduce((sum,x)=>sum+x.bytes,0)/1e6).toFixed(2)+' MB)');
for(const err of failures)console.warn('Model unavailable:',err);
if(strict&&failures.length)process.exitCode=1;
