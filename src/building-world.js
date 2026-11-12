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
 let current=0,firstPerson=false,disposed=false;
 function update(){
  levels.forEach((layer,i)=>{
   // Keep adjacent floors visible during climbing, but do not let lower
   // ceilings mask the player while exploring upper floors.
   layer.root.visible=Math.abs(i-current)<=1;
   layer.ceiling.visible=firstPerson&&i>=current;
  });
 }
 update();
 return {root:levels[0]?.root,paletteName:levels[0]?.paletteName,
  setCurrentLevel(index){current=Math.max(0,Math.min(levels.length-1,index));update();},
  setFirstPerson(value){firstPerson=Boolean(value);update();},
  dispose(){
   if(disposed)return;disposed=true;
   levels.forEach(level=>level.dispose());stairs.dispose();
  }
 };
}
