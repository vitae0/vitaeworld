import * as THREE from 'three';

// Light distribution is deterministic and capped. A maximum of four small
// point lights can be active on ONE floor, with no realtime shadow maps.
// Lower settings simply use existing directional/hemispheric illumination.
const PRIORITY=Object.freeze({
 lounge:9,dining:8,kitchen:8,lobby:7,suite:7,
 office:6,studio:6,library:6,gallery:5,bath:4,wellness:4,
 games:5
});
export function practicalLightAnchors(layout,limit=4){
 const fixtures=(layout.decorations||[]).filter(d=>d.source==='ceiling');
 const rooms=new Map(layout.rooms.map(r=>[r.id,r]));
 const options=fixtures.map(d=>({
  x:d.x,z:d.z,roomId:d.roomId,
  roomType:rooms.get(d.roomId)?.type||'corridor',
  weight:PRIORITY[rooms.get(d.roomId)?.type]||0,
  area:rooms.get(d.roomId)?.area||0
 }));
 options.sort((a,b)=>b.weight-a.weight||b.area-a.area||
  a.roomId-b.roomId);
 const chosen=[];
 for(const light of options){
  if(chosen.length>=limit)break;
  if(chosen.some(p=>Math.hypot(p.x-light.x,p.z-light.z)<3.3))continue;
  chosen.push(light);
 }
 return chosen;
}
export function addPracticalLights(root,layout){
 const style=layout.interiorStyle||{};
 const anchors=practicalLightAnchors(layout,4);
 const lights=anchors.map((a,i)=>{
  const light=new THREE.PointLight(style.light||0xffe0ba,0,6.5,2);
  light.name='BudgetedPractical_'+i;
  light.position.set(a.x,2.75,a.z);
  light.castShadow=false;
  root.add(light);return light;
 });
 let enabled=false,count=0,night=.5;
 function refresh(){
  lights.forEach((light,i)=>{
   light.visible=enabled&&i<count;
   light.intensity=light.visible?(.22+night*.60):0;
  });
 }
 return {
  anchors,
  setBudget(n){count=Math.max(0,Math.min(lights.length,Math.floor(n||0)));refresh();},
  setActive(value){enabled=Boolean(value);refresh();},
  setDaylight(sunlight){
   night=Math.max(0,1-Math.max(0,Math.min(1,sunlight)));
   refresh();
  },
  get activeCount(){return enabled?count:0;},
  get availableCount(){return lights.length;}
 };
}
