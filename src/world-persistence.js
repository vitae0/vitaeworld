// Local-only versioned interaction state. No accounts, cloud storage or
// third-party tracking. Geometry and furniture stay deterministic by seed.
import {normalizeRecipe} from './scene-recipe.js';
export function worldStateKey(recipe){
 const r=normalizeRecipe(recipe);
 return 'vitaeworld:v1:state:'+encodeURIComponent(r.program)+'/'+
  encodeURIComponent(r.style)+'/'+encodeURIComponent(r.seed);
}
export function parseSavedStates(text){
 if(typeof text!=='string'||text.length>60000)return {};
 try{
  const value=JSON.parse(text);
  if(!value||value.version!==1||!value.states||
     typeof value.states!=='object'||Array.isArray(value.states))
   return {};
  return Object.fromEntries(Object.entries(value.states)
   .filter(([id,state])=>id.length<150&&typeof state==='boolean')
   .slice(0,2000));
 }catch{return {};}
}
export function serialiseSavedStates(states){
 const entries=Object.entries(states||{})
  .filter(([id,on])=>id.length<150&&typeof on==='boolean')
  .slice(0,2000);
 return JSON.stringify({version:1,states:Object.fromEntries(entries)});
}
