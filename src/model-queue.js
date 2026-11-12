// Deterministic, bounded GLB fetch/parse queue. No network request is
// launched for every identical furniture instance, and errors are observable.
// The browser receives local bundled models first, with the pinned CC0
// GitHub source only as a fallback in a raw development checkout.
export function validateGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20)
  throw Error('empty/truncated GLB');
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw Error('invalid GLB magic');
 if(view.getUint32(4,true)!==2)throw Error('GLB must be version 2');
 if(view.getUint32(8,true)!==buffer.byteLength)
  throw Error('GLB length mismatch');
 if(view.getUint32(12,true)+20>buffer.byteLength)
  throw Error('invalid GLB JSON chunk length');
 return buffer;
}
export function createModelQueue({
 fetchBuffer,parseBuffer,maxConcurrent=6,retries=2,report=()=>{}
}){
 const inFlight=new Map(),waiting=[];
 const metrics={requested:0,loaded:0,fallback:0,failed:0,
  active:0,queued:0,errors:[]};
 function record(error,primary,fallback){
  if(metrics.errors.length<40)metrics.errors.push({
   primary,fallback,error:String(error?.message||error)
  });
 }
 async function task(primary,secondary){
  metrics.active++;
  try{
   let lastError;
   const sources=[primary,...(secondary&&secondary!==primary?[secondary]:[])];
   for(let i=0;i<sources.length;i++){
    for(let attempt=0;attempt<retries;attempt++){
     try{
      const buffer=validateGLB(await fetchBuffer(sources[i]));
      const model=await parseBuffer(buffer,sources[i]);
      if(!model?.scene)throw Error('GLB parsed without scene');
      let meshes=0;
      model.scene.traverse?.(n=>{if(n.isMesh)meshes++;});
      if(!meshes)throw Error('GLB has no mesh');
      metrics.loaded++;
      if(i>0)metrics.fallback++;
      report({ok:true,primary,source:sources[i],fallback:i>0});
      return model;
     }catch(error){
      lastError=error;
      // A missing local resource must immediately use the known mirror.
      if(error?.status===404||error?.status===410)break;
     }
    }
   }
   metrics.failed++;record(lastError,primary,secondary);
   report({ok:false,primary,error:String(lastError?.message||lastError)});
   throw lastError||Error('Cannot load GLB');
  }finally{
   metrics.active--;
   pump();
  }
 }
 function pump(){
  while(metrics.active<maxConcurrent&&waiting.length){
   const next=waiting.shift();
   metrics.queued=waiting.length;
   // Resolve/reject from the scheduled async task, keeping a stable cache.
   task(next.primary,next.secondary).then(next.resolve,next.reject);
  }
 }
 function load(primary,secondary=null){
  if(inFlight.has(primary))return inFlight.get(primary);
  metrics.requested++;
  const job=new Promise((resolve,reject)=>{
   waiting.push({primary,secondary,resolve,reject});
   metrics.queued=waiting.length;pump();
  }).catch(error=>{inFlight.delete(primary);throw error;});
  inFlight.set(primary,job);return job;
 }
 return {load,metrics,clearErrors:()=>{metrics.errors.length=0;}};
}
