// Shareable, fully deterministic world recipe. No server, storage or
// third-party tracker. The URL is enough to reconstruct the same plan.
import {BUILDING_TYPE_IDS} from './topology.js';
import {BUILDING_PROGRAMS} from './building-programs.js';
import {STYLE_FAMILIES} from './style-families.js';
const STYLES=new Set([...BUILDING_TYPE_IDS,'auto']);
export function normalizeRecipe(data={}){
 const raw=String(data.seed??'vitae-001').trim();
 const seed=raw.slice(0,80)||'vitae-001';
 const style=STYLES.has(data.style)?data.style:'auto';
 const program=Object.hasOwn(BUILDING_PROGRAMS,data.program)?
  data.program:'family_house';
 const interior=Object.hasOwn(STYLE_FAMILIES,data.interior)?
  data.interior:'auto';
 return {seed,style,program,interior};
}
export function recipeFromQuery(search){
 const params=new URLSearchParams(search||'');
 return normalizeRecipe({
  seed:params.get('seed')||'vitae-001',
  style:params.get('style')||'auto',
  program:params.get('program')||'family_house',
  interior:params.get('interior')||'auto'
 });
}
export function recipeQuery(recipe,search=''){
 const safe=normalizeRecipe(recipe),params=new URLSearchParams(search);
 params.set('seed',safe.seed);
 params.set('style',safe.style);
 params.set('program',safe.program);
 params.set('interior',safe.interior);
 return '?'+params.toString();
}
