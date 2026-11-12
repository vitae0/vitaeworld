// Curated, explicitly catalog-verified CC0 Kenney fixture models.
// A failed 3D request keeps the original instanced procedural lamp visible.
export const FIXTURE_MODEL_IDS=Object.freeze([
 'lampwall','lampsquareceiling','ceilingfan'
]);
export function fixtureModelFor(decor){
 if(decor.source==='wall'&&decor.kind==='sconce')return 'lampwall';
 if(decor.source!=='ceiling')return null;
 if(decor.kind==='flush')
  return (decor.variant%5===0)?'ceilingfan':'lampsquareceiling';
 // Pendant and chandelier geometry remains purpose-built; a flat ceiling
 // lamp should not pretend to be a hanging chandelier.
 return null;
}
