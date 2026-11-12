// Lab 18: deterministic design-language catalogue. No extra downloads.
const P=(id,label,floor,wet,wall,trim,ceiling,accent,metal,light,decor,wallFeature)=>Object.freeze({
 id,label,floor,wet,wall,trim,ceiling,accent,metal,light,decor,wallFeature
});
export const STYLE_FAMILIES=Object.freeze({
 modern:P('modern','Modern','microcement','travertine','greige','darkMetal','matteWhite',0xa99885,.18,0xffe6ca,.73,'slat'),
 sleek:P('sleek','Sleek','polishedConcrete','blackMarble','smoothWhite','brushedSteel','matteWhite',0x556772,.43,0xecf5ff,.43,'panel'),
 rusty:P('rusty','Rusty','agedTile','rustMetal','agedPlaster','rustMetal','darkCeiling',0x8c4f35,.55,0xffb36c,1.20,'industrial'),
 industrial:P('industrial','Industrial','industrialEpoxy','concrete','rawConcrete','darkMetal','darkCeiling',0x69777a,.58,0xffd59c,.85,'industrial'),
 minimal:P('minimal','Minimal','lightParquet','microcement','smoothWhite','lightOak','matteWhite',0xd7cdbb,.08,0xfff1df,.33,'none'),
 warmLuxury:P('warmLuxury','Warm Luxury','walnut','travertine','limewash','brushedSteel','acoustic',0xbfa887,.26,0xffdbad,.88,'wainscot'),
 scandinavian:P('scandinavian','Scandinavian','lightParquet','tile','warmPlaster','lightOak','matteWhite',0xd7b99b,.06,0xffebcd,.64,'slat'),
 darkContemporary:P('darkContemporary','Dark Contemporary','darkOak','blackMarble','charcoalPanel','darkMetal','darkCeiling',0x8d8f99,.47,0xffd6b5,.57,'panel'),
 boutiqueHotel:P('boutiqueHotel','Boutique Hotel','herringbone','marble','greige','brushedSteel','acoustic',0xb59176,.25,0xffdab0,.92,'wainscot'),
 retroModern:P('retroModern','Retro Modern','terrazzo','agedTile','warmPlaster','walnut','matteWhite',0xa67657,.16,0xffce94,1.03,'panel'),
 brutalist:P('brutalist','Brutalist','polishedConcrete','concrete','rawConcrete','darkMetal','darkCeiling',0x85807b,.42,0xffe4c1,.39,'industrial'),
 coastal:P('coastal','Coastal','lightParquet','travertine','limewash','lightOak','matteWhite',0x9abec1,.08,0xfff3d6,.71,'slat'),
 cyberModern:P('cyberModern','Cyber Modern','industrialEpoxy','blackMarble','charcoalPanel','brushedSteel','darkCeiling',0x4aa3a5,.62,0xc3eeff,.55,'panel'),
 earthy:P('earthy','Earthy','terracotta','agedTile','limewash','walnut','acoustic',0xb48b65,.11,0xffd7a5,1.08,'wainscot')
});
export const STYLE_FAMILY_IDS=Object.freeze(Object.keys(STYLE_FAMILIES));
const DEFAULTS=Object.freeze({
 konut:['modern','minimal','scandinavian','coastal','earthy','warmLuxury','retroModern'],
 ticaret:['sleek','retroModern','industrial','modern','rusty','cyberModern'],
 konaklama:['boutiqueHotel','warmLuxury','darkContemporary','modern','sleek'],
 kamusal:['modern','minimal','brutalist','industrial','scandinavian'],
 'endüstri':['industrial','rusty','brutalist','cyberModern']
});
function hash(s){
 let h=2166136261;
 for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);
 return h>>>0;
}
export function resolveInteriorStyle(seed,program=null,choice='auto'){
 if(choice!=='auto'){
  if(!Object.hasOwn(STYLE_FAMILIES,choice))
   throw new Error('Unknown interior style: '+choice);
  return STYLE_FAMILIES[choice];
 }
 const pool=DEFAULTS[program?.category]||DEFAULTS.konut;
 return STYLE_FAMILIES[pool[hash(String(seed)+':interior:'+String(program?.id||'auto'))%pool.length]];
}
