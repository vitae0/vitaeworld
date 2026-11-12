import {buildWorld} from './world.js';
import {buildStairVisuals} from './stair-visuals.js';
import {floorVisibilityPlan,visibleCeilingCells} from './floor-visibility.js';

// The old single-story renderer remains reusable and separately testable.
export function buildBuildingWorld(scene,building,paletteIndex=0,onAsset=()=>{}){
 const levels=building.stories.map((story,i)=>{
  const upper=building.stories[i+1]?.layout||null;
  const layer=buildWorld(scene,story.layout,paletteIndex,onAsset,{
   detachedFloor:story.index>0,
   ceilingCells:visibleCeilingCells(story.layout,upper)
  });
  layer.root.position.y=story.elevation;
  if(layer.detachedFloor)layer.floorDeck.position.y=story.elevation;
  return layer;
 });
 const stairs=buildStairVisuals(scene,building);
 let current=0,firstPerson=false,disposed=false,playerY=0;
 function update(){
  const states=floorVisibilityPlan(building,current,firstPerson,playerY);
  levels.forEach((layer,i)=>{
   layer.root.visible=states[i].rooms;
   layer.floorDeck.visible=states[i].deck;
   layer.ceiling.visible=states[i].ceiling;
   layer.detailGroup.visible=states[i].detail;
   // All floors are geometrically present, but one active sun/ambient
   // pair lights the entire building. Never double ambient intensity.
   layer.setLightingActive(i===current);
  });
 }
 update();
 return {root:levels[0]?.root,paletteName:levels[0]?.paletteName,
  setCurrentLevel(index){current=Math.max(0,Math.min(levels.length-1,index));update();},
  setPlayerHeight(y){
   const previous=playerY;playerY=y;
   const wasStairs=previous>.14&&previous<building.levelHeight-.14;
   const isStairs=y>.14&&y<building.levelHeight-.14;
   if(wasStairs!==isStairs)update();
  },
  setInteractionState(item,on){
   return levels[item.level]?.setInteractionState(item,on)??false;
  },
  tick(dt){
   for(const layer of levels)if(layer.root.visible&&layer.detailGroup.visible)
    layer.tick(dt);
  },
  getRenderReport(){
   const states=floorVisibilityPlan(building,current,firstPerson,playerY);
   return {allStoreysVisible:states.every(s=>s.rooms&&s.deck),
    current,tiers:states.map(s=>s.tier),
    full:states.filter(s=>s.detail).length,
    shells:states.filter(s=>!s.detail).length};
  },
  setDaylight(hour){
   for(const layer of levels)layer.setDaylight(hour);
  },
  setFirstPerson(value){firstPerson=Boolean(value);update();},
  dispose(){
   if(disposed)return;disposed=true;
   levels.forEach(level=>level.dispose());stairs.dispose();
  }
 };
}
