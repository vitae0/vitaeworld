// Deterministic, renderer-independent interior layout. All distances are metres.
export const ROOM_WIDTH = 9;
export const ROOM_DEPTH = 9;
export const HALL_HALF_WIDTH = 2;
export const ROOM_NAMES = {
  suite: 'Sky Suite', lounge: 'Social Lounge', studio: 'Creative Studio',
  office: 'Workspace', kitchen: 'Kitchen', bath: 'Spa Bathroom'
};
export const ROOM_THEMES = {
  suite: '#e4bfa7', lounge: '#e2bd89', studio: '#a7bfde',
  office: '#b5c8bf', kitchen: '#cfb5ca', bath: '#9ecbcb'
};

export function seededRandom(seed) {
  let x = 2166136261;
  for (const letter of String(seed)) {
    x ^= letter.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return function random() {
    x += 0x6D2B79F5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(array, random) {
  const result = [...array];
  for (let i=result.length-1; i>0; i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
const item = (model, dx, z, w, d, h, angle=0, solid=true) =>
  ({model,dx,z,w,d,h,angle,solid});

function recipe(kind, side, random) {
  const rear = side === 'north' ? -9.45 : 9.45;
  const mid = side === 'north' ? -7.1 : 7.1;
  const forward = side === 'north' ? -5.1 : 5.1;
  const choose = (a,b) => random()<0.5?a:b;
  const definitions = {
    suite: [
      item('beddouble',-1.1,rear,2.8,2.3,0.85),item('sidetabledrawers',-3.15,rear,0.9,0.8,0.65),
      item('cabinettelevision',2.9,rear,1.3,0.8,0.75),item('chairrounded',2.9,mid,0.9,1,1),
      item('rugrounded',-0.5,mid,3.1,2.2,0.04,0,false),item('plantsmall2',-3.4,forward,0.65,0.65,1.15)
    ],
    lounge: [
      item(choose('loungesofalong','loungedesignsofa'),-1.9,rear,2.8,1.2,1.1),
      item('tablecoffee',-1.8,mid,1.4,0.75,0.55),
      item('televisionmodern',2.9,mid,1.35,0.35,1.3),
      item('bookcaseopen',3.2,rear,1.15,0.7,1.8),
      item('rugrectangle',-1.8,mid,3.7,2.3,0.04,0,false),
      item('pottedplant',-3.45,forward,0.65,0.65,1.25)
    ],
    studio: [
      item('table',-1.65,mid,2,1.2,0.8),item('chairmoderncushion',-1.7,forward,0.85,0.85,0.9),
      item('bookcaseopen',-3.1,rear,1.0,0.65,1.8),item('loungechair',2.8,rear,1.05,1.05,1.0),
      item('lamproundfloor',3.3,mid,0.6,0.6,1.7),
      item('ruground',-1.7,mid,2.8,2.8,0.04,0,false)
    ],
    office: [
      item('desk',1.8,rear,2.15,0.9,0.8),item('chairdesk',1.8,mid,0.8,0.8,0.95),
      item('computerscreen',1.8,rear,0.65,0.25,0.45,0,false),
      item('bookcaseopen',-3.15,rear,1.05,0.65,1.85),
      item('loungedesignchair',-2.8,mid,1.1,1.1,1),
      item('pottedplant',3.2,forward,0.7,0.7,1.15)
    ],
    kitchen: [
      item('kitchenfridge',-3.2,rear,0.9,0.85,1.95),
      item('kitchenstove',-1.55,rear,0.9,0.85,1.0),
      item('kitchensink',0,rear,0.95,0.85,0.95),
      item('kitchencabinet',1.5,rear,1,0.8,0.95),
      item('tableround',1.7,mid,1.45,1.45,0.78),
      item('chairrounded',3.3,mid,0.8,0.85,0.85)
    ],
    bath: [
      item('bathtub',-2.55,rear,2.35,1.3,0.8),
      item('toilet',1.25,rear,0.9,1.05,0.83),
      item('bathroomsink',3.0,mid,0.9,0.7,0.9),
      item('bathroomcabinet',-3.15,forward,0.75,0.6,1),
      item('plantsmall1',1.9,mid,0.55,0.55,0.6,0,false)
    ]
  };
  return definitions[kind];
}
function wall(walls,x,z,w,d) {
  walls.push({x,z,w,d});
}
export function generateLayout(seed='vitae-001') {
  const random=seededRandom(seed);
  const kinds=shuffle(Object.keys(ROOM_NAMES),random);
  const rooms=[], walls=[], props=[], doors=[];
  const wallThickness=0.2;
  // Six independently dressed rooms separated by a four-metre main corridor.
  for(let row=0;row<2;row++){
    const side=row===0?'north':'south';
    const zMin=side==='north'?-11:2;
    const zMax=side==='north'?-2:11;
    for(let column=0;column<3;column++){
      const cx=(column-1)*ROOM_WIDTH;
      const kind=kinds[row*3+column];
      const room={id:row*3+column,kind,name:ROOM_NAMES[kind],side,
        x:cx,z:(zMin+zMax)/2,xMin:cx-4.5,xMax:cx+4.5,zMin,zMax};
      rooms.push(room);
      const frontZ=side==='north'?-2:2;
      doors.push({x:cx,z:frontZ,side,roomId:room.id});
      // Front walls leave a 2.3m unobstructed doorway.
      const piece=(ROOM_WIDTH-2.3)/2;
      wall(walls,cx-ROOM_WIDTH/2+piece/2,frontZ,piece,wallThickness);
      wall(walls,cx+ROOM_WIDTH/2-piece/2,frontZ,piece,wallThickness);
      for(const spec of recipe(kind,side,random)){
        const x=cx+spec.dx;
        props.push({...spec,x,roomId:room.id,id:`${room.id}-${props.length}`});
      }
    }
    // Exterior back facade.
    wall(walls,0,side==='north'?-11:11,27+wallThickness,wallThickness);
    // Full-height side partitions and outer sides.
    for(const x of [-13.5,-4.5,4.5,13.5]){
      wall(walls,x,(zMin+zMax)/2,wallThickness,ROOM_DEPTH+wallThickness);
    }
  }
  // Hall end caps.
  wall(walls,-13.5,0,wallThickness,4);
  wall(walls,13.5,0,wallThickness,4);
  // Architecture colliders + furniture footprints; no invisible barriers in doorways.
  const obstacles=[
    ...walls.map((s)=>({...s,kind:'wall'})),
    ...props.filter((p)=>p.solid).map((p)=>({x:p.x,z:p.z,w:p.w,d:p.d,kind:'furniture'}))
  ];
  return {seed:String(seed),rooms,doors,walls,props,obstacles,
    bounds:{minX:-13.5,maxX:13.5,minZ:-11,maxZ:11},
    spawn:{x:0,z:0},geometryVersion:1};
}
export function isWalkable(layout,x,z,radius=0.32) {
  return !layout.obstacles.some((o)=>{
    const nearX=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2));
    const nearZ=Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));
    return (x-nearX)**2+(z-nearZ)**2<(radius*radius);
  });
}
