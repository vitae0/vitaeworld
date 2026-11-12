// Pure rendering policy. Upper floors keep only their structural slab
// visible while the player is on the lower floor; upper walls, props,
// windows and interaction scenes remain culled for browser performance.
export function floorVisibilityPlan(building,current,firstPerson,playerY){
 const stairs=building.stairs||[];
 const onStairs=stairs.some(s=>
  playerY>s.from*building.levelHeight+.14&&
  playerY<s.to*building.levelHeight-.14);
 return building.stories.map((_,i)=>{
  const rooms=i===current||onStairs;
  return {
   rooms,
   // The NEXT floor's deck serves as the physical overhead slab while
   // standing below, but the rest of that story stays invisible.
   deck:i===current||i===current+1||onStairs,
   ceiling:firstPerson&&rooms
  };
 });
}
