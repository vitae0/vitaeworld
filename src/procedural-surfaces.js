// Procedural materials for Lab 18. New surfaces are generated locally from
// a small 256² tile, with zero network dependencies or proprietary textures.
export const PROCEDURAL_SURFACES=Object.freeze([
 'polishedConcrete','microcement','darkOak','walnut','lightParquet',
 'herringbone','blackMarble','travertine','terrazzo','industrialEpoxy',
 'rustMetal','agedTile','smoothWhite','warmPlaster','greige',
 'charcoalPanel','woodSlat','rawConcrete','darkBrick','limewash',
 'matteWhite','acoustic','darkCeiling','brushedSteel','darkMetal','lightOak'
]);
const types=new Set(PROCEDURAL_SURFACES);
const between=(x,a,b)=>Math.max(a,Math.min(b,x));
const noise=(x,y)=>{let n=Math.imul((x|0)+617,374761393)^Math.imul((y|0)+199,668265263);
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
export function proceduralSurfaceColor(kind,x,y){
 if(!types.has(kind))return null;
 const v=noise(x>>1,y>>1)*14-7;
 const grain=Math.sin(x*.15+Math.sin(y*.043)*1.5)*5;
 const px=x%256,py=y%256;
 const fine=(Math.sin(x*.33+y*.21)+Math.sin(y*.27+x*.10))*2;
 let r=180,g=180,b=180;
 if(['darkOak','walnut','lightParquet','herringbone','lightOak'].includes(kind)){
  const dark=kind==='darkOak',wal=kind==='walnut';
  const base=dark?[65,50,42]:wal?[117,76,49]:
   kind==='lightOak'?[200,167,115]:[198,163,117];
  const herring=kind==='herringbone';
  const seam=herring?
   ((Math.floor(x/52)+Math.floor(y/52))%2===0?
    (x+y)%52<3:(x-y+512)%52<3):
   py%42<2||(px<2&&Math.floor(y/42)%2===0);
  const n=v+grain+fine-(seam?37:0);
  r=base[0]+n;g=base[1]+n*.81;b=base[2]+n*.62;
 }else if(['polishedConcrete','microcement','industrialEpoxy','rawConcrete'].includes(kind)){
  const base=kind==='industrialEpoxy'?[77,91,97]:
   kind==='rawConcrete'?[139,137,130]:
   kind==='microcement'?[183,178,167]:[147,151,152];
  const swirl=Math.sin(x*.053+Math.cos(y*.062)*3)*4;
  const aggregate=kind==='rawConcrete'&&noise(x,y)>.975?-35:0;
  r=base[0]+v*.83+swirl+aggregate;
  g=base[1]+v*.83+swirl+aggregate;
  b=base[2]+v*.83+swirl+aggregate;
 }else if(['blackMarble','travertine','terrazzo','agedTile'].includes(kind)){
  const base=kind==='blackMarble'?[42,45,51]:kind==='travertine'?
   [192,180,157]:kind==='terrazzo'?[202,199,187]:[135,123,108];
  const marble=Math.sin(x*.071+Math.sin(y*.047)*5+
   Math.sin((x+y)*.017)*4);
  const vein=kind==='blackMarble'||kind==='travertine'?
   (marble>.96?kind==='blackMarble'?53:-47:0):0;
  const fleck=kind==='terrazzo'&&noise(x>>3,y>>3)>.78?
   -50:0;
  const grout=kind==='agedTile'&&(px%63<3||py%63<3)?-33:0;
  const n=v+vein+fleck+grout;
  r=base[0]+n;g=base[1]+n*.94;b=base[2]+n*.92;
 }else if(kind==='rustMetal'){
  const scratch=Math.sin(x*.53+y*.005)*5;
  const stain=noise(x>>4,y>>4)*60-27;
  const bolts=((px%85)<3||(py%85)<3)?-29:0;
  r=137+v+stain+scratch+bolts;g=76+v*.65+stain*.48+bolts;
  b=50+v*.5+stain*.36+bolts;
 }else if(['smoothWhite','warmPlaster','greige','limewash','matteWhite'].includes(kind)){
  const base=kind==='smoothWhite'?[231,232,227]:
   kind==='matteWhite'?[227,228,222]:
   kind==='warmPlaster'?[217,199,178]:
   kind==='limewash'?[213,204,183]:[186,177,163];
  const wash=kind==='limewash'?Math.sin(x*.026+y*.012)*7:
   kind==='warmPlaster'?fine*1.3:0;
  r=base[0]+v*.35+wash;g=base[1]+v*.35+wash;
  b=base[2]+v*.35+wash;
 }else if(['charcoalPanel','woodSlat','darkBrick','acoustic','darkCeiling'].includes(kind)){
  const base=kind==='charcoalPanel'?[58,62,67]:
   kind==='woodSlat'?[126,88,58]:
   kind==='darkBrick'?[86,66,61]:
   kind==='acoustic'?[122,120,112]:[47,50,55];
  const seam=kind==='woodSlat'?px%26<3:
   kind==='darkBrick'?py%38<3||(px+Math.floor(y/38)*31)%82<3:
   kind==='acoustic'?((px%58)<4||(py%58)<4):
   kind==='charcoalPanel'?px%85<2:false;
  const t=v*.7+fine-(seam?32:0);
  r=base[0]+t;g=base[1]+t;b=base[2]+t;
 }else if(['brushedSteel','darkMetal'].includes(kind)){
  const base=kind==='brushedSteel'?[153,157,160]:[61,65,69];
  const stripe=Math.sin(x*.72)*3;
  r=base[0]+v*.5+stripe;g=base[1]+v*.5+stripe;b=base[2]+v*.5+stripe;
 }
 return [between(Math.round(r),0,255),between(Math.round(g),0,255),
  between(Math.round(b),0,255)];
}
