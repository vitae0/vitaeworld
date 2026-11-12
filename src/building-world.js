import {buildWorld} from './world.js';
import {buildStairVisuals} from './stair-visuals.js';

// The old single-story renderer remains reusable and separately testable.
export function buildBuildingWorld(scene,building,paletteIndex=0,onAsset=()=>{}){
 const levels=building.stories.map(story=>{
  const layer=buildWorld(scene,story.layout,paletteIndex,onAsset);
  layer.root.position.y=story.elevation;
  return layer;
 });
 const stairs=buildStairVisuals(scene,building);
 let current=0,firstPerson=false,disposed=false,playerY=0;
 function update(){
  levels.forEach((layer,i)=>{
   // Keep adjacent floors visible during climbing, but do not let lower
   // ceilings mask the player while exploring upper floors.
   const onStairs=building.stairs.some(s=>playerY>
    s.from*building.levelHeight+.14&&playerY<
    s.to*building.levelHeight-.14);
   layer.root.visible=i===current||onStairs;
   layer.ceiling.visible=firstPerson&&(i===current||onStairs);
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
  setFirstPerson(value){firstPerson=Boolean(value);update();},
  dispose(){
   if(disposed)return;disposed=true;
   levels.forEach(level=>level.dispose());stairs.dispose();
  }
 };
}
