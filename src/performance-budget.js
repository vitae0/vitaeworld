// Pure browser-first render budget. Rendering both full storeys remains the
// default; only non-essential small decorations, dynamic practical lights and
// pixel density are adjustable. No telemetry or external FPS service.
export const PERFORMANCE_MODES=Object.freeze([
 'auto','economy','balanced','cinematic'
]);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function qualityBudget(mode='auto',{
 width=1280,devicePixelRatio=1,deviceMemory=8
}={}){
 if(!PERFORMANCE_MODES.includes(mode))mode='auto';
 const mobile=width<=820||deviceMemory<=4;
 const selected=mode==='auto'?(mobile?'economy':'balanced'):mode;
 const settings={
  economy:{pixelRatio:mobile?1:1.05,practicalLights:0,
   showClutter:false,shadowMaps:false},
  balanced:{pixelRatio:mobile?1.1:1.42,practicalLights:2,
   showClutter:true,shadowMaps:false},
  cinematic:{pixelRatio:mobile?1.32:1.72,practicalLights:4,
   showClutter:true,shadowMaps:false}
 }[selected];
 const maxPixelRatio=Math.max(.6,Number(devicePixelRatio)||1);
 return {...settings,selected,mode,mobile,
  pixelRatio:+clamp(settings.pixelRatio,.60,maxPixelRatio).toFixed(2),
  minimumPixelRatio:+clamp(mobile?.70:.85,.60,maxPixelRatio).toFixed(2),
  targetFps:mobile?30:55};
}
export function adaptivePixelRatio({
 current,minimum,maximum,fps,targetFps,lowSamples=0,highSamples=0
}){
 if(![current,minimum,maximum,fps,targetFps].every(Number.isFinite))
  return {current,lowSamples:0,highSamples:0,changed:false};
 const low=fps<targetFps-6,high=fps>targetFps+11;
 const down=low?lowSamples+1:0,up=high?highSamples+1:0;
 if(down>=4&&current>minimum+.01)
  return {current:+Math.max(minimum,current-.12).toFixed(2),
   lowSamples:0,highSamples:0,changed:true};
 if(up>=7&&current<maximum-.01)
  return {current:+Math.min(maximum,current+.06).toFixed(2),
   lowSamples:0,highSamples:0,changed:true};
 return {current,lowSamples:down,highSamples:up,changed:false};
}
