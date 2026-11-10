// Three.js world-space contract: a directional object's functional front is -Z.
// A positive Y rotation turns that front toward -X.
const TAU=Math.PI*2;
export const CARDINAL_YAWS=Object.freeze([0,Math.PI/2,Math.PI,-Math.PI/2]);
export function normalizeYaw(angle){
 return ((angle+Math.PI)%TAU+TAU)%TAU-Math.PI;
}
export function yawToward(origin,target){
 return Math.atan2(-(target.x-origin.x),-(target.z-origin.z));
}
export function forwardFromYaw(yaw){
 return {x:-Math.sin(yaw),z:-Math.cos(yaw)};
}
export function cardinalToward(origin,target){
 const desired=yawToward(origin,target);
 return CARDINAL_YAWS.reduce((best,yaw)=>
  Math.cos(yaw-desired)>Math.cos(best-desired)?yaw:best,CARDINAL_YAWS[0]);
}
export function facingScore(yaw,origin,target){
 const d=Math.hypot(target.x-origin.x,target.z-origin.z);
 if(d<.01)return 1;
 const forward=forwardFromYaw(yaw);
 return (1+(forward.x*(target.x-origin.x)+forward.z*(target.z-origin.z))/d)/2;
}
export const DIRECTIONAL_ROLES=new Set([
 'bed','sofa','chair','deskChair','diningChair','screen','mediaStorage',
 'desk','storage','display','bath','toilet','sink','coldStorage','cooking',
 'counter','media','shower','bench','lighting'
]);
// Model-native forward conventions are separate from semantic world yaw.
// This pack is treated as +Z front for directional meshes, while procedural
// placeholders and world-space layout use -Z. Any model-specific audit
// correction can be added to MODEL_FRONT_OVERRIDES.
const MODEL_FRONT_OVERRIDES=Object.freeze({
 // All corrections are 0 or PI, so rectangular physical footprints stay valid.
 // Symmetric assets like rugs/plants/tables are never inverted.
});
export function modelYawCorrection(model,role){
 if(Object.hasOwn(MODEL_FRONT_OVERRIDES,model))return MODEL_FRONT_OVERRIDES[model];
 return DIRECTIONAL_ROLES.has(role)?Math.PI:0;
}
