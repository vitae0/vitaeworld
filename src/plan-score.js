// Geometry-only plan selection. This is a transparent rule-based ranker,
// not a claim of training on any third-party residential plan corpus.
// Generating three topologies is cheap; furnishing only the winner preserves
// browser performance and keeps the design scorer independently auditable.
const MAX_RATIO=5/3;
const PRIOR=Object.freeze({
 compact:{target:9,area:23},
 central:{target:17,area:27},
 grid:{target:18,area:28},
 courtyard:{target:17,area:28},
 branched:{target:8,area:27}
});
export function scoreTopology(layout){
 const prior=PRIOR[layout.buildingType]||PRIOR.compact;
 let aspect=0,size=0,shape=0;
 for(const room of layout.rooms){
  const w=room.xMax-room.xMin,d=room.zMax-room.zMin;
  const ratio=Math.max(w,d)/Math.max(.01,Math.min(w,d));
  const fill=room.area/Math.max(.01,w*d);
  aspect+=Math.max(0,ratio-MAX_RATIO)*80+Math.max(0,ratio-1.45)*2;
  shape+=Math.max(0,.88-fill)*12;
  size+=Math.abs(room.area-prior.area)/prior.area;
 }
 const internal=layout.doors.filter(d=>d.toRoomId>0).length;
 const count=Math.abs(layout.rooms.length-prior.target);
 const hall=layout.floors.filter(c=>c.roomId===0).length;
 // Prefer complete rooms with compact proportions, fewer walk-through
 // bedrooms, good furnishing area, and a reasonable corridor overhead.
 const score=100-aspect*3-size*.75-shape*2-internal*1.3
  -count*1.5-hall*.009;
 return +score.toFixed(3);
}
export function pickBestTopology(candidates){
 if(!candidates.length)throw Error('No candidate architecture');
 return candidates.map((layout,index)=>({layout,index,score:scoreTopology(layout)}))
  .sort((a,b)=>b.score-a.score||a.index-b.index)[0];
}
