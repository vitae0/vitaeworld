import {buildWorld} from './world.js';
import {buildStairVisuals} from './stair-visuals.js';
import {floorVisibilityPlan} from './floor-visibility.js';

// The old single-story renderer remains reusable and separately testable.
export function buildBuildingWorld(scene,building,paletteIndex=0,onAsset=()=>{}){
 const levels=building.stories.map(story=>{
  const layer=buildWorld(scene,story.layout,paletteIndex,onAsset,{
   detachedFloor:story.index>0
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
   for(const layer of levels)if(layer.root.visible)layer.tick(dt);
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
