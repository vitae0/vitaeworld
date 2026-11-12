// Pure, deterministic solar/sky lighting for the browser-first world.
// Time-of-day changes shared light intensity and colors, not shadow maps.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const skyNight=[9,21,34],skyDawn=[108,94,102],skyDay=[132,188,220];
function mixHex(a,b,t){
 const u=clamp(t,0,1);
 return ((Math.round(lerp(a[0],b[0],u))<<16)|
  (Math.round(lerp(a[1],b[1],u))<<8)|
   Math.round(lerp(a[2],b[2],u)));
}
export const normalizeHour=hour=>((Number(hour)||0)%24+24)%24;
export function daylightAt(hour){
 const h=normalizeHour(hour);
 // Sunrise 06:00, sunset 18:00, warm extended twilight either side.
 const elevation=Math.sin((h-6)*Math.PI/12);
 const solar=Math.max(0,elevation);
 const sunlight=Math.pow(solar,.72);
 const twilight=clamp((elevation+.19)/.46,0,1);
 const sky=twilight<.55?
  mixHex(skyNight,skyDawn,twilight/.55):
  mixHex(skyDawn,skyDay,(twilight-.55)/.45);
 const warm=clamp(1-Math.abs(elevation)*3.1,0,1);
 const solarAngle=(h-6)*Math.PI/12;
 return Object.freeze({
  hour:h,solarElevation:elevation,
  sunlight,twilight,
  sunIntensity:.018+sunlight*1.65,
  hemisphereIntensity:.47+sunlight*1.18,
  sunColor:mixHex([255,224,184],[255,246,226],1-warm),
  skyColor:sky,
  fogColor:mixHex(skyNight,[120,158,168],Math.pow(twilight,.78)),
  exposure:.76+sunlight*.44,
  sunPosition:{
   x:Math.cos(solarAngle)*-15,
   y:Math.max(1,solar*23),
   z:Math.sin(solarAngle)*-13
  }
 });
}
