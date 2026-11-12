// Building programme catalogue. A programme changes room composition, architecture
// preference and surface families; it is deliberately not 36 separate mesh engines.
const profiles=[
 // 12 homes: architectural distinctions also map to different floorplan grammars.
 ['studio_flat','Stüdyo daire','konut','compact','timber',{studio:4,lounge:3,kitchen:2,bath:2,suite:1},['studio','kitchen','bath']],
 ['one_bed_flat','1+1 daire','konut','compact','timber',{suite:4,lounge:4,kitchen:3,bath:2},['suite','lounge','kitchen','bath']],
 ['two_bed_flat','2+1 daire','konut','grid','oak',{suite:5,lounge:4,kitchen:3,bath:2,dining:1},['suite','lounge','kitchen','bath']],
 ['family_house','Aile evi','konut','central','oak',{suite:5,lounge:4,kitchen:3,bath:2,dining:2,games:1},['suite','lounge','kitchen','bath']],
 ['town_house','Sıra ev','konut','rowhouse','brick',{suite:4,lounge:3,kitchen:3,bath:2,office:1},['suite','kitchen','bath']],
 ['terrace_house','Teraslı ev','konut','rowhouse','oak',{suite:4,lounge:4,kitchen:3,bath:2,wellness:1},['suite','lounge','kitchen','bath']],
 ['loft','Loft','konut','loft','concrete',{studio:4,lounge:4,kitchen:2,suite:2,bath:1,gallery:1},['studio','lounge','kitchen','bath']],
 ['penthouse','Penthouse','konut','central','marble',{suite:4,lounge:4,kitchen:2,dining:3,wellness:2,bath:2},['suite','lounge','bath']],
 ['villa','Villa','konut','villa','marble',{suite:6,lounge:4,kitchen:3,bath:3,dining:3,wellness:1},['suite','lounge','kitchen','bath']],
 ['courtyard_house','Avlulu ev','konut','courtyard','terracotta',{suite:4,lounge:3,kitchen:3,bath:2,wellness:2},['suite','kitchen','bath']],
 ['cottage','Kır evi','konut','compact','timber',{suite:4,lounge:4,kitchen:3,bath:2,library:1},['suite','lounge','kitchen','bath']],
 ['duplex','Dubleks','konut','villa','oak',{suite:6,lounge:4,kitchen:2,bath:3,office:1},['suite','lounge','kitchen','bath']],
 // 8 retail/food services
 ['bakery','Fırın','ticaret','compact','terracotta',{kitchen:5,dining:3,utility:2,lounge:1},['kitchen','dining']],
 ['coffee_shop','Kafe','ticaret','central','oak',{dining:5,lounge:3,kitchen:3,bath:1},['dining','kitchen','lounge']],
 ['restaurant','Restoran','ticaret','grid','marble',{dining:6,kitchen:4,bath:2,lounge:1},['dining','kitchen','bath']],
 ['boutique','Butik','ticaret','rowhouse','oak',{gallery:6,office:2,utility:2,lounge:1},['gallery','office']],
 ['bookshop','Kitapçı','ticaret','loft','timber',{library:6,gallery:2,office:2,lounge:1},['library','office']],
 ['supermarket','Market','ticaret','grid','tile',{gallery:5,utility:3,office:1,storage:1},['gallery','office']],
 ['electronics_store','Elektronik mağazası','ticaret','loft','concrete',{gallery:6,studio:2,office:2},['gallery','office']],
 ['pharmacy','Eczane','ticaret','compact','tile',{gallery:5,office:2,wellness:2,utility:1},['gallery','office']],
 // 6 hospitality programmes
 ['hotel','Otel','konaklama','grid','marble',{suite:7,bath:2,lounge:2,dining:2,office:1},['suite','bath','lounge']],
 ['boutique_hotel','Butik otel','konaklama','courtyard','oak',{suite:7,bath:3,lounge:2,dining:2},['suite','bath','dining']],
 ['hostel','Hostel','konaklama','branched','timber',{suite:6,bath:3,utility:2,lounge:2,kitchen:1},['suite','bath','lounge']],
 ['guesthouse','Pansiyon','konaklama','rowhouse','oak',{suite:6,bath:3,kitchen:2,lounge:2},['suite','bath','kitchen']],
 ['spa_hotel','Spa oteli','konaklama','courtyard','marble',{suite:4,wellness:4,bath:3,lounge:2},['suite','wellness','bath']],
 ['motel','Motel','konaklama','branched','concrete',{suite:8,bath:2,utility:2,office:1},['suite','bath']],
 // 6 public/work spaces
 ['clinic','Klinik','kamusal','grid','tile',{wellness:5,office:4,bath:2,utility:1},['wellness','office']],
 ['public_library','Halk kütüphanesi','kamusal','central','oak',{library:6,studio:2,office:2,lounge:1},['library','office']],
 ['art_gallery','Sanat galerisi','kamusal','loft','concrete',{gallery:7,studio:2,office:2},['gallery','studio']],
 ['school','Okul','kamusal','grid','tile',{studio:5,library:3,office:2,games:2},['studio','library']],
 ['coworking','Ortak çalışma alanı','kamusal','central','timber',{office:5,studio:3,lounge:2,kitchen:1},['office','studio','lounge']],
 ['office_building','Ofis binası','kamusal','grid','concrete',{office:7,studio:2,lounge:1},['office','studio']],
 // 4 specialized services
 ['workshop','Atölye','endüstri','loft','concrete',{studio:5,utility:3,office:2,gallery:1},['studio','utility']],
 ['warehouse','Depo','endüstri','grid','concrete',{utility:6,gallery:3,office:2},['utility','office']],
 ['laboratory','Laboratuvar','endüstri','grid','tile',{studio:5,office:3,utility:2,wellness:1},['studio','office']],
 ['gym','Spor salonu','endüstri','loft','concrete',{wellness:6,games:3,bath:2,office:1},['wellness','bath']]
];
export const BUILDING_PROGRAMS=Object.freeze(Object.fromEntries(profiles.map(
 ([id,label,category,architecture,material,weights,required])=>[id,Object.freeze({
 id,label,category,architecture,material,weights:Object.freeze(weights),
 required:Object.freeze(required)})])));
export const BUILDING_PROGRAM_IDS=Object.freeze(Object.keys(BUILDING_PROGRAMS));
export const PROGRAM_CATEGORIES=Object.freeze(['konut','ticaret','konaklama','kamusal','endüstri']);
export function resolveBuildingProgram(id){
 if(!id||id==='auto')return null;
 const found=BUILDING_PROGRAMS[id];
 if(!found)throw new Error('Unknown building programme: '+id);
 return found;
}
export function selectProgramRoomTypes(program,n,rng,allowed){
 if(!program)return null;
 const weights=Object.entries(program.weights)
  .filter(([role,w])=>allowed.includes(role)&&w>0);
 if(!weights.length)throw new Error('Programme has no available room roles');
 const result=program.required.filter(role=>allowed.includes(role)).slice(0,n);
 while(result.length<n){
  const total=weights.reduce((t,[,w])=>t+w,0);
  let pick=rng()*total;
  let chosen=weights.at(-1)[0];
  for(const [role,weight] of weights)if((pick-=weight)<=0){chosen=role;break;}
  result.push(chosen);
 }
 return result;
}
