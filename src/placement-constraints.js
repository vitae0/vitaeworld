// Physical furnishing constraints independent from the learned position model.
// Windows are genuine openings, so tall furniture must not cover their glass.
// Short desks, sofas and low cabinets remain eligible near daylight.
const OBSTRUCTIVE_ROLES=new Set([
 'storage','coldStorage','screen','mediaStorage','display','shower'
]);
export function blocksWindow(layout,room,asset,position){
 if(!asset||!position||!OBSTRUCTIVE_ROLES.has(asset.role)||
    asset.h<1.12)return false;
 const windows=layout.windows||[];
 for(const opening of windows){
  if(opening.roomId!==room.id)continue;
  // A height check covers furniture tall enough to cover the opening.
  // A low dresser that stays below the sill is permitted.
  if(asset.h+.10<=opening.bottom+.06)continue;
  const along=opening.axis==='x'?'x':'z';
  const normal=opening.axis==='x'?'z':'x';
  const length=along==='x'?position.w:position.d;
  const depth=normal==='x'?position.w:position.d;
  const tangential=Math.abs(position[along]-opening[along]);
  const closeToWall=Math.abs(position[normal]-opening[normal])-depth/2;
  if(tangential<(length+opening.width)/2+.08&&closeToWall<.42)
   return true;
 }
 return false;
}
