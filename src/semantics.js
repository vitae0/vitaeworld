// VitaeWorld's hand-curated 40-dimensional semantic model.
// Scores are ordinal, 0 (irrelevant) to 3 (strongly associated), not learned embeddings.
// The vector order is part of the stable asset/profile contract.
export const DIMENSIONS = Object.freeze([
 'sleep','lounge','social','dine','cook','hygiene','work','study','creative','play',
 'media','storage','display','fitness','recovery','nature','technology','illumination',
 'privacy','openness','warm','cool','premium','industrial','contemporary','playful',
 'quiet','energy','soft','hard','water','dry','ground','vertical','corner','center',
 'tall','compact','group','accent'
]);
export const FEATURE_COUNT = DIMENSIONS.length;
if (FEATURE_COUNT !== 40) throw new Error('Semantic schema must contain exactly 40 features.');
const dimensionIndex = Object.fromEntries(DIMENSIONS.map((d,i)=>[d,i]));
export function vector(traits={}) {
 const out=new Array(FEATURE_COUNT).fill(0);
 for(const [name,raw] of Object.entries(traits)) {
   const i=dimensionIndex[name];
   if (i===undefined) throw new Error('Unknown semantic trait: '+name);
   if (!Number.isFinite(raw)||raw<0||raw>3) throw new Error('Trait must be between 0 and 3: '+name);
   out[i]=raw;
 }
 return Object.freeze(out);
}
function room(name,color,traits,required,capacity=8) {
 return Object.freeze({name,color,traits:Object.freeze(traits),profile:vector(traits),required:Object.freeze(required),capacity});
}
// The six chosen room types vary by seed. The pool of ten is extensible.
export const ROOM_TYPES=Object.freeze({
 suite:room('Sky Suite','#b6bce9',
  {sleep:3,recovery:3,privacy:3,quiet:3,warm:2,soft:3,premium:2,contemporary:2,storage:1,illumination:1},
  ['beddouble','sidetabledrawers','lampsquaretable'],7),
 lounge:room('Conversation Lounge','#e5b68c',
  {lounge:3,social:3,media:2,group:3,soft:2,warm:2,openness:2,playful:1,premium:1,illumination:1},
  ['loungesofalong','tablecoffee','televisionmodern'],8),
 studio:room('Design Atelier','#b4d5e8',
  {creative:3,work:2,display:2,technology:2,openness:2,contemporary:3,illumination:2,accent:2,energy:1},
  ['desk','chairdesk','bookcaseopen'],8),
 office:room('Focus Office','#bdc8bc',
  {work:3,study:2,quiet:3,technology:2,storage:2,contemporary:2,privacy:2,illumination:2,compact:1},
  ['desk','chairdesk','computerscreen'],7),
 kitchen:room('Social Kitchen','#efc4b1',
  {cook:3,dine:3,social:2,hard:3,dry:2,water:1,contemporary:2,storage:2,group:1},
  ['kitchenfridge','kitchenstove','kitchensink','tableround'],8),
 bath:room('Bath Sanctuary','#a1d8d6',
  {hygiene:3,water:3,recovery:2,privacy:3,quiet:2,cool:2,hard:2,contemporary:2,premium:1},
  ['bathtub','toilet','bathroomsink'],6),
 library:room('Reading Library','#d8c2a1',
  {study:3,quiet:3,storage:3,display:2,privacy:2,warm:3,soft:1,illumination:2,contemporary:1},
  ['bookcaseopen','bookcaseclosed','loungechair'],8),
 gallery:room('Art Gallery','#e3d4c6',
  {display:3,creative:3,openness:3,accent:3,illumination:3,contemporary:3,quiet:2,premium:2},
  ['bookcaseopenlow','tableglass','lamproundfloor'],6),
 games:room('Media Playground','#c5a7dd',
  {play:3,media:3,social:3,technology:2,energy:3,playful:3,group:2,soft:2,accent:2},
  ['loungesofa','televisionmodern','speaker'],8),
 wellness:room('Wellness Retreat','#aed5af',
  {fitness:3,recovery:3,nature:3,quiet:3,soft:2,ground:2,openness:2,warm:1},
  ['ruground','loungechairrelax','pottedplant'],7),
 dining:room('Dining Salon','#e8cf9d',
  {dine:3,social:3,group:3,warm:3,premium:2,display:1,illumination:2,contemporary:2},
  ['table','chairrounded','stoolbar'],8)
});
export const ROOM_NAMES=Object.freeze(Object.fromEntries(Object.entries(ROOM_TYPES).map(([id,r])=>[id,r.name])));
export const ROOM_THEMES=Object.freeze(Object.fromEntries(Object.entries(ROOM_TYPES).map(([id,r])=>[id,r.color])));

// Spatial intelligence is orthogonal to the 40-dimensional room-purpose vector.
// A second 16D vector encodes where and how an object prefers to be placed.
export const LOCATION_DIMENSIONS=Object.freeze([
 'perimeter','corner','central','entry','deep','daylight','privacy','left',
 'right','focal','cluster','clearance','quiet','public','view','surface'
]);
const locationIndex=Object.fromEntries(LOCATION_DIMENSIONS.map((d,i)=>[d,i]));
export function locationVector(features={}){
 const v=new Array(LOCATION_DIMENSIONS.length).fill(0);
 for(const [key,value] of Object.entries(features)){
   if(locationIndex[key]===undefined)throw Error('Unknown location trait: '+key);
   if(!Number.isFinite(value)||value<0||value>3)throw Error('Location score must be 0-3: '+key);
   v[locationIndex[key]]=value;
 }
 return Object.freeze(v);
}
// Individually assigned vectors inherit intentional role defaults, then model overrides.
// This keeps the catalogue easy to edit without repeating 16 numbers 61 times.
const ROLE_LOCATION={
 bed:{perimeter:3,deep:3,privacy:3,quiet:3,clearance:2},
 sidetable:{perimeter:3,deep:2,cluster:3,surface:1,quiet:2},
 lighting:{perimeter:2,corner:2,deep:1,cluster:2,quiet:1},
 sofa:{perimeter:3,focal:3,cluster:2,view:3,public:2},
 chair:{perimeter:2,corner:2,cluster:2,quiet:1,view:2},
 coffee:{central:3,cluster:3,focal:2,public:2},
 rug:{central:3,cluster:3,public:2,clearance:1},
 screen:{perimeter:3,focal:3,view:3,cluster:2},
 mediaStorage:{perimeter:3,cluster:2,focal:3,view:2},
 media:{perimeter:3,corner:2,focal:2,cluster:3},
 storage:{perimeter:3,corner:2,clearance:3,deep:2},
 display:{perimeter:2,central:2,daylight:2,view:3},
 decoration:{perimeter:2,cluster:3,surface:3},
 plant:{corner:3,perimeter:3,daylight:3,clearance:2},
 desk:{perimeter:3,daylight:3,quiet:2,deep:2},
 deskChair:{cluster:3,focal:3,clearance:2,view:3},
 computer:{surface:3,cluster:3,focal:2,view:2},
 coldStorage:{perimeter:3,corner:3,clearance:2},
 cooking:{perimeter:3,cluster:3,clearance:2},
 sink:{perimeter:3,cluster:2,clearance:3},
 kitchenTool:{surface:3,cluster:3},
 counter:{perimeter:3,cluster:3,public:2},
 diningTable:{central:3,cluster:3,public:3,clearance:2},
 diningChair:{central:2,cluster:3,focal:3,view:3,public:2},
 bath:{perimeter:3,corner:2,deep:3,privacy:3,quiet:3},
 mirror:{perimeter:3,surface:3,cluster:3},
 toilet:{perimeter:3,corner:3,deep:3,privacy:3},
 shower:{corner:3,perimeter:3,deep:3,privacy:3},
 bench:{perimeter:2,entry:2,public:2},
 ottoman:{central:3,cluster:3,focal:2}
};
const MODEL_LOCATION={
 beddouble:{deep:3,privacy:3,central:0},
 bedsingle:{corner:2,deep:3},
 deskcorner:{corner:3,daylight:2},
 loungechairrelax:{deep:3,privacy:3,daylight:2},
 loungedesignchair:{focal:2,view:3},
 pottedplant:{daylight:3,corner:3},
 kitchenfridge:{corner:3,entry:2},
 toilet:{privacy:3,deep:3},
 bathtub:{privacy:3,deep:3},
 televisionsmodern:{focal:3},
 lamproundfloor:{corner:3,perimeter:3},
 lampsquarefloor:{corner:3,perimeter:3},
 bookcaseopen:{perimeter:3,corner:2},
 bookcaseclosed:{perimeter:3,corner:2},
 ruground:{central:3,quiet:2},
 speaker:{perimeter:3,corner:2,cluster:3},
 bathroommirror:{surface:3,focal:2}
};
export function spatialProfileFor(role,model,anchor){
 const base={...ROLE_LOCATION[role],...MODEL_LOCATION[model]};
 if(anchor==='wall')base.perimeter=Math.max(2,base.perimeter||0);
 if(anchor==='corner')base.corner=Math.max(2,base.corner||0);
 if(anchor==='center')base.central=Math.max(2,base.central||0);
 return locationVector(base);
}
// Each item carries physical footprint (metres), scene anchoring mode, conceptual role,
// 40-D hand-rated semantic profile and optional affinity to another furniture family.
function asset(model,w,d,h,anchor,role,traits,{solid=true,companion=null}={}) {
 return Object.freeze({model,w,d,h,anchor,role,traits:Object.freeze(traits),
   vector:vector(traits),locationVector:spatialProfileFor(role,model,anchor),solid,companion});
}
export const FURNITURE=Object.freeze([
 asset('beddouble',2.5,2.15,0.8,'wall','bed',{sleep:3,recovery:2,privacy:2,soft:3,warm:2,ground:2}),
 asset('bedsingle',1.15,2.15,0.8,'wall','bed',{sleep:3,recovery:2,privacy:2,soft:3,compact:2}),
 asset('sidetabledrawers',0.65,0.55,0.65,'wall','sidetable',{sleep:2,storage:2,compact:3,contemporary:2}, {companion:'bed'}),
 asset('cabinetbed',1.25,0.55,0.8,'wall','storage',{sleep:2,storage:3,compact:2}),
 asset('lampsquaretable',0.42,0.38,0.52,'wall','lighting',{sleep:2,illumination:3,warm:3,quiet:2,accent:1}, {solid:false,companion:'sidetable'}),
 asset('lamproundtable',0.42,0.4,0.55,'wall','lighting',{illumination:3,warm:2,quiet:2,accent:2}, {solid:false}),
 asset('lamproundfloor',0.52,0.52,1.65,'corner','lighting',{illumination:3,accent:2,premium:1,tall:2}),
 asset('lampsquarefloor',0.48,0.48,1.55,'corner','lighting',{illumination:3,contemporary:2,tall:2,warm:1}),
 asset('loungesofalong',2.65,1.02,0.9,'wall','sofa',{lounge:3,social:3,soft:3,group:3,recovery:1,contemporary:2}),
 asset('loungesofa',2.15,1.0,0.9,'wall','sofa',{lounge:3,social:3,soft:3,group:2,playful:1}),
 asset('loungedesignsofa',2.5,1.0,0.92,'wall','sofa',{lounge:3,premium:3,social:2,soft:2,contemporary:3,display:1}),
 asset('loungedesignchair',0.98,0.95,0.88,'wall','chair',{lounge:3,premium:2,recovery:2,soft:2,contemporary:2}),
 asset('loungechair',0.98,0.99,0.98,'corner','chair',{lounge:3,recovery:2,soft:2,quiet:2}),
 asset('loungechairrelax',1.55,0.98,0.96,'wall','chair',{recovery:3,lounge:3,quiet:3,soft:3,fitness:1}),
 asset('tablecoffee',1.32,0.85,0.5,'center','coffee',{lounge:3,social:2,center:3,hard:2,group:1},{companion:'sofa'}),
 asset('tablecoffeesquare',1.05,1.05,0.45,'center','coffee',{lounge:3,social:2,center:3,contemporary:2},{companion:'sofa'}),
 asset('rugrounded',2.55,2.0,0.035,'center','rug',{lounge:2,soft:3,ground:3,warm:2,accent:2},{solid:false}),
 asset('rugrectangle',3.1,2.2,0.035,'center','rug',{lounge:3,soft:2,ground:3,group:2},{solid:false}),
 asset('ruground',2.5,2.5,0.035,'center','rug',{recovery:3,soft:2,ground:3,fitness:2,nature:1},{solid:false}),
 asset('rugsquare',2.2,2.2,0.035,'center','rug',{play:2,soft:2,ground:3,playful:2},{solid:false}),
 asset('televisionmodern',1.55,0.38,1.25,'wall','screen',{media:3,technology:3,display:2,contemporary:3,vertical:2},{companion:'sofa'}),
 asset('cabinettelevision',1.35,0.65,0.75,'wall','mediaStorage',{media:3,storage:2,technology:2,contemporary:2}),
 asset('speaker',0.56,0.55,1.1,'wall','media',{media:3,technology:3,energy:2,play:1,tall:1}),
 asset('speakersmall',0.4,0.35,0.52,'wall','media',{media:3,technology:2,playful:2},{solid:false}),
 asset('radio',0.58,0.37,0.38,'wall','media',{media:2,warm:1,playful:2},{solid:false}),
 asset('bookcaseopen',1.1,0.58,1.75,'wall','storage',{storage:3,study:3,display:2,vertical:3,tall:2}),
 asset('bookcaseopenlow',1.15,0.58,1.08,'wall','display',{display:3,creative:2,storage:2,contemporary:2}),
 asset('bookcaseclosed',1.12,0.62,1.9,'wall','storage',{storage:3,quiet:2,vertical:3,tall:3}),
 asset('books',0.58,0.48,0.35,'wall','decoration',{study:3,display:2,quiet:2,warm:2},{solid:false}),
 asset('pottedplant',0.73,0.74,1.23,'corner','plant',{nature:3,recovery:2,quiet:2,accent:2,vertical:2}),
 asset('plantsmall1',0.5,0.5,0.55,'corner','plant',{nature:3,recovery:1,compact:3,accent:2}),
 asset('plantsmall2',0.54,0.5,0.75,'corner','plant',{nature:3,compact:2,accent:2,contemporary:1}),
 asset('plantsmall3',0.55,0.5,0.72,'corner','plant',{nature:3,accent:2,playful:1}),
 asset('desk',1.65,0.85,0.79,'wall','desk',{work:3,study:2,creative:2,technology:2,hard:2}),
 asset('deskcorner',1.55,1.2,0.81,'corner','desk',{work:3,study:2,technology:2,corner:3,compact:2}),
 asset('chairdesk',0.68,0.65,0.93,'center','deskChair',{work:3,study:3,technology:2,compact:2},{companion:'desk'}),
 asset('chairmoderncushion',0.83,0.8,0.89,'center','chair',{lounge:2,contemporary:3,soft:2,social:2}),
 asset('computerscreen',0.66,0.3,0.52,'wall','computer',{work:3,technology:3,study:2,creative:1},{solid:false,companion:'desk'}),
 asset('laptop',0.66,0.45,0.34,'wall','computer',{work:3,technology:3,study:2,compact:2},{solid:false,companion:'desk'}),
 asset('computerkeyboard',0.51,0.22,0.08,'wall','computer',{work:2,technology:3,study:1},{solid:false,companion:'desk'}),
 asset('kitchenfridge',0.92,0.82,1.85,'wall','coldStorage',{cook:3,storage:3,hard:3,contemporary:2,tall:3}),
 asset('kitchenstove',0.92,0.85,0.94,'wall','cooking',{cook:3,hard:3,energy:2,dry:2}),
 asset('kitchensink',0.96,0.85,0.93,'wall','sink',{cook:3,hygiene:2,water:3,hard:3}),
 asset('kitchencabinet',1.03,0.68,0.92,'wall','storage',{cook:2,storage:3,hard:2,dry:2}),
 asset('kitchencoffeemachine',0.55,0.46,0.44,'wall','kitchenTool',{cook:2,dine:2,social:2,warm:2},{solid:false}),
 asset('kitchenbar',1.4,0.67,0.97,'wall','counter',{cook:3,dine:2,social:2,hard:3}),
 asset('tableround',1.43,1.43,0.78,'center','diningTable',{dine:3,social:3,group:3,center:3,hard:2}),
 asset('table',1.88,1.1,0.77,'center','diningTable',{dine:3,social:3,group:3,center:3,hard:3}),
 asset('tableglass',1.55,0.9,0.75,'center','display',{display:3,creative:3,openness:2,premium:2,contemporary:3}),
 asset('chairrounded',0.8,0.78,0.9,'center','diningChair',{dine:3,social:2,warm:2,compact:2},{companion:'diningTable'}),
 asset('chair',0.79,0.79,0.89,'center','diningChair',{dine:3,social:2,hard:2,compact:2},{companion:'diningTable'}),
 asset('stoolbar',0.57,0.57,0.78,'center','diningChair',{dine:3,social:3,compact:3,contemporary:2},{companion:'diningTable'}),
 asset('bathtub',2.12,1.25,0.86,'wall','bath',{hygiene:3,water:3,recovery:3,privacy:2,hard:2}),
 asset('bathroomsink',0.86,0.67,0.86,'wall','sink',{hygiene:3,water:3,contemporary:3,hard:2}),
 asset('bathroommirror',0.8,0.24,1.1,'wall','mirror',{hygiene:3,display:2,vertical:3,contemporary:2},{solid:false}),
 asset('toilet',0.78,0.95,0.85,'wall','toilet',{hygiene:3,privacy:3,water:2,hard:2}),
 asset('showerround',1.2,1.2,2.1,'corner','shower',{hygiene:3,water:3,recovery:2,vertical:2}),
 asset('bathroomcabinet',0.9,0.65,0.9,'wall','storage',{hygiene:2,storage:3,compact:2}),
 asset('coatrackstanding',0.62,0.6,1.7,'corner','storage',{storage:2,vertical:3,compact:2,contemporary:1}),
 asset('benchcushion',1.4,0.72,0.7,'wall','bench',{social:2,recovery:2,soft:2,display:1,contemporary:1}),
 asset('loungesofaottoman',0.95,0.85,0.47,'center','ottoman',{lounge:3,recovery:3,soft:3,center:2},{companion:'sofa'})
]);
export const FURNITURE_BY_ID=Object.freeze(Object.fromEntries(FURNITURE.map(p=>[p.model,p])));
export function semanticSimilarity(a,b){
 let dot=0,an=0,bn=0;
 for(let i=0;i<FEATURE_COUNT;i++){dot+=a[i]*b[i];an+=a[i]*a[i];bn+=b[i]*b[i];}
 return dot/(Math.sqrt(an*bn)||1);
}
export function furnitureScore(item,room,counts={}){
 const similarity=semanticSimilarity(item.vector,room.profile);
 const duplicateRole=counts[item.role]||0;
 const saturated=duplicateRole>0?Math.min(.42,duplicateRole*.16):0;
 const crowdedTech=counts.computer>0&&item.role==='computer'?.2:0;
 return similarity*3.7-saturated-crowdedTech;
}
