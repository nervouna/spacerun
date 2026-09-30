import * as THREE from 'three';
export const FIGHTERS=[
 {id:'A',name:'截击机',description:'修长机鼻 · 后掠翼 · 双尾翼',image:'/assets/fighters/fighter-a-interceptor.png'},
 {id:'B',name:'双体重装机',description:'双体引擎 · 贯通结构 · 重型装甲',image:'/assets/fighters/fighter-b-twin-boom.png'},
 {id:'C',name:'楔形突击机',description:'紧凑楔形 · 宽肩装甲 · 短翼',image:'/assets/fighters/fighter-c-assault.png'}
];
export function armoredHull(sections){
 const vertices=[],uvs=[];
 const ring=({z,w,top,bottom})=>[[-w*.66,top,z],[w*.66,top,z],[w,top*.5,z],[w,bottom*.5,z],[w*.66,bottom,z],[-w*.66,bottom,z],[-w,bottom*.5,z],[-w,top*.5,z]];
 function tri(a,b,c,ua,ub,uc){vertices.push(...a,...b,...c);uvs.push(...ua,...ub,...uc);}
 for(let i=0;i<sections.length-1;i++){
  const a=ring(sections[i]),b=ring(sections[i+1]);
  for(let j=0;j<8;j++){const k=(j+1)%8,u=j/8,v=k===0?1:k/8,t=i/(sections.length-1),next=(i+1)/(sections.length-1);tri(a[j],b[j],a[k],[u,t],[u,next],[v,t]);tri(a[k],b[j],b[k],[v,t],[u,next],[v,next]);}
 }
 for(const [section,reverse] of [[sections[0],false],[sections.at(-1),true]]){const r=ring(section),center=[0,(section.top+section.bottom)/2,section.z];for(let j=0;j<8;j++){const k=(j+1)%8;tri(center,reverse?r[k]:r[j],reverse?r[j]:r[k],[.5,.5],[0,0],[1,1]);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}
export function createFighter(id,{metalColor=null,metalNormal=null,metalRoughness=null,fighterSteel=null,fighterPaint=null,fighterEnvironment=null}={}){
 if(!FIGHTERS.some(f=>f.id===id))throw new Error('Unknown fighter: '+id);
 const group=new THREE.Group();group.name='fighter-'+id;
 const hull=new THREE.MeshStandardMaterial({map:fighterSteel||metalColor,normalMap:metalNormal,normalScale:new THREE.Vector2(.16,.16),roughnessMap:metalRoughness,color:fighterSteel?0xbab9b5:0x817a70,metalness:.7,roughness:.56});
 const armor=new THREE.MeshStandardMaterial({map:fighterPaint||metalColor,normalMap:metalNormal,normalScale:new THREE.Vector2(.12,.12),roughnessMap:metalRoughness,color:fighterPaint?0xf3d2a0:0xb28446,metalness:.38,roughness:.8});
 const dark=new THREE.MeshStandardMaterial({map:fighterSteel,color:0x4c5054,metalness:.8,roughness:.5});
 const edge=new THREE.MeshStandardMaterial({map:fighterSteel,color:0x9c9991,metalness:.8,roughness:.5});
 const glass=new THREE.MeshPhysicalMaterial({color:0x172933,metalness:.35,roughness:.16,clearcoat:.85,flatShading:true});
 const glow=new THREE.MeshBasicMaterial({color:new THREE.Color(0x37baff).multiplyScalar(2)});
 for(const material of [hull,armor,dark,edge,glass]){material.envMap=fighterEnvironment;material.envMapIntensity=.3;}
 const flames=[],firePoints=[];
 function part(g,m,x=0,y=0,z=0){
  if(m===hull||m===armor){
   const positions=g.attributes.position,normals=g.attributes.normal,uv=[];
   for(let i=0;i<positions.count;i++){
    const top=Math.abs(normals.getY(i))>.55;
    uv.push((positions.getX(i)+(top?0:positions.getZ(i)))/2.5,top?positions.getZ(i)/2.5:positions.getY(i)/1.5);
   }
   g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  }
  const p=new THREE.Mesh(g,m);p.position.set(x,y,z);group.add(p);return p;}
 function loft(sections,m,x=0,y=0,z=0){return part(armoredHull(sections),m,x,y,z);}
 function plate(points,m,y=.18,depth=.22){const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1});g.rotateX(Math.PI/2);return part(g,m,0,y,0);}
 function fin(x,z,h){const shape=new THREE.Shape();shape.moveTo(-.65,0);shape.lineTo(.05,h);shape.lineTo(.9,h*.8);shape.lineTo(1.15,0);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1});g.rotateY(-Math.PI/2);const p=part(g,armor,x,.4,z);p.rotation.z=-Math.sign(x)*.15;}
 function cockpit(z,w=.43){
  loft([{z:z-1.12,w:.19,top:.46,bottom:.3},{z,w:w+.085,top:.94,bottom:.3},{z:z+.9,w:w*.9+.08,top:.61,bottom:.3}],dark);
  loft([{z:z-1.01,w:.12,top:.5,bottom:.43},{z,w,top:1.03,bottom:.43},{z:z+.77,w:w*.8,top:.69,bottom:.43}],glass);
  for(const side of [-1,1]){const frame=part(new THREE.BoxGeometry(.045,.06,1.15),edge,side*w*.75,.61,z-.25);frame.rotation.x=.32;}
 }
 function details(x,z,width=.6){
  part(new THREE.BoxGeometry(width,.065,1.35),dark,x,.66,z);
  for(let i=0;i<7;i++)part(new THREE.BoxGeometry(width*.86,.07,.045),edge,x,.72,z-.52+i*.17);
  for(const side of [-1,1])for(const dz of [-.85,.85])part(new THREE.CylinderGeometry(.035,.035,.025,6),edge,x+side*width*.45,.66,z+dz);
 }
 function gun(x,z){
  part(new THREE.BoxGeometry(.36,.3,1.2),dark,x,.08,z+.65);
  for(const dx of [-.075,.075]){
   const barrel=part(new THREE.CylinderGeometry(.052,.07,1.7,8),edge,x+dx,.16,z);barrel.rotation.x=Math.PI/2;
   for(const dz of [-.5,.1,.5]){const collar=part(new THREE.CylinderGeometry(.075,.075,.09,8),dark,x+dx,.16,z+dz);collar.rotation.x=Math.PI/2;}
   part(new THREE.CircleGeometry(.035,8),glow,x+dx,.16,z-.86).rotation.y=Math.PI;
  }
  firePoints.push(new THREE.Vector3(x,.16,z-.9));
 }
 function engine(x,z,rectangular=false){
  loft([{z:-1.2,w:.42,top:.38,bottom:-.34},{z:-.75,w:.54,top:.49,bottom:-.44},{z:.24,w:.54,top:.49,bottom:-.44}],hull,x,0,z);
  part(new THREE.BoxGeometry(.56,.065,.58),armor,x,.5,z-.7);
  if(rectangular){
   for(const side of [-1,1]){part(new THREE.BoxGeometry(.12,.89,.35),edge,x+side*.52,0,z+.24);part(new THREE.BoxGeometry(1.06,.12,.35),edge,x,side*.39,z+.24);}
   part(new THREE.BoxGeometry(.91,.64,.12),dark,x,0,z+.34);
   part(new THREE.BoxGeometry(.75,.49,.04),glow,x,0,z+.42);
   for(let i=0;i<4;i++)part(new THREE.BoxGeometry(.78,.055,.08),dark,x,-.2+i*.135,z+.48);
  }else{
   const tube=part(new THREE.CylinderGeometry(.47,.47,.52,8,1,true),dark,x,0,z+.16);tube.rotation.x=Math.PI/2;
   for(const [r,zz] of [[.46,.1],[.43,.28],[.36,.41]])part(new THREE.TorusGeometry(r,.055,4,8),edge,x,0,z+zz);
   part(new THREE.CircleGeometry(.33,16),glow,x,0,z+.38);
   part(new THREE.CircleGeometry(.17,16),dark,x,0,z+.405);
   part(new THREE.TorusGeometry(.22,.026,4,16),glow,x,0,z+.43);
   for(let i=0;i<12;i++){const angle=i*Math.PI/6;const rib=part(new THREE.BoxGeometry(.027,.14,.045),dark,x+Math.sin(angle)*.27,Math.cos(angle)*.27,z+.44);rib.rotation.z=-angle;}
  }
  for(const [r,len,color,opacity] of [[.3,1.7,0x168bd9,.28],[.13,.85,0x83ddff,.6]]){
   const m=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.6),transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
   const p=part(new THREE.ConeGeometry(r,len,16,1,true),m,x,0,z+.45+len/2);p.rotation.x=Math.PI/2;flames.push(p);
  }
 }
 if(id==='A'){
  loft([{z:-5,w:.03,top:.02,bottom:-.02},{z:-2.4,w:.42,top:.24,bottom:-.2},{z:-.5,w:.8,top:.45,bottom:-.4},{z:2.3,w:.8,top:.35,bottom:-.35}],hull);
  cockpit(-.6);
  for(const side of [-1,1]){
   const points=[[.65,-1.9],[2.4,-.5],[4.05,1.4],[3.65,2.6],[1.1,1.8]];
   plate(points.map(([x,z])=>[x*side,z]),hull);
   plate([[1.1,-.9],[2.2,-.05],[3.3,1.15],[1.2,1.35]].map(([x,z])=>[x*side,z]),armor,.33,.095);
   loft([{z:-1,w:.33,top:.56,bottom:-.25},{z:2.1,w:.43,top:.7,bottom:-.3}],hull,side*.92);
   details(side*.93,.6);fin(side*2.6,1.25,1.25);gun(side*3.1,-.45);engine(side*.92,2.25);
  }
 }else if(id==='B'){
  loft([{z:-3.9,w:.06,top:.05,bottom:-.05},{z:-1.6,w:.54,top:.4,bottom:-.3},{z:1.6,w:.64,top:.38,bottom:-.38}],hull);
  cockpit(-.5,.42);
  for(const side of [-1,1]){
   const x=side*2.15;
   loft([{z:-3.8,w:.25,top:.25,bottom:-.2},{z:-2.3,w:.54,top:.45,bottom:-.38},{z:2.35,w:.56,top:.42,bottom:-.4}],hull,x);
   part(new THREE.BoxGeometry(1.3,.22,.55),dark,side*1.23,.03,-.65);part(new THREE.BoxGeometry(1.35,.23,.7),armor,side*1.23,.02,1.45);
   for(const z of [-1.4,.15,1.7])part(new THREE.BoxGeometry(.82,.1,1.12),armor,x,.53,z);
   plate([[2.5,-.5],[3.85,.65],[3.65,1.6],[2.6,1.1]].map(([px,z])=>[px*side,z]),armor);
   details(x,.2,.7);fin(x,1.3,1.55);gun(x,-3.65);engine(x,2.6,true);
  }
 }else{
  loft([{z:-3.5,w:.2,top:.09,bottom:-.09},{z:-1.4,w:1.02,top:.38,bottom:-.35},{z:.7,w:1.18,top:.5,bottom:-.4},{z:2.3,w:.75,top:.32,bottom:-.33}],hull);
  cockpit(-.65,.42);
  for(const side of [-1,1]){
   plate([[.9,-1.8],[2.4,-1.2],[3.55,.55],[3.3,1.75],[1.35,2.15]].map(([x,z])=>[x*side,z]),hull,.19,.3);
   plate([[1.15,-1.35],[2.3,-.8],[2.95,.65],[1.6,1.3]].map(([x,z])=>[x*side,z]),armor,.38,.12);
   part(new THREE.BoxGeometry(.63,.25,2.2),hull,side*1.38,.15,.25);details(side*1.4,.3,.52);
   fin(side*1.8,1.2,.8);gun(side*2.1,-1.4);engine(side*.84,2.45);
  }
 }
 // Layered, chamfered armor follows the reference rather than a flat painted wing.
 const boltGeometry=new THREE.CylinderGeometry(.026,.026,.025,6);
 function panel(points,m,y,depth=.065){
  const p=plate(points,m,y,depth);
  for(const [x,z] of points.slice(0,4))part(boltGeometry,edge,x,y+.015,z);
  return p;
 }
 function boxPanel(x,z,w,l,y,m=armor){
  const cut=.08;panel([[x-w/2+cut,z-l/2],[x+w/2-cut,z-l/2],[x+w/2,z-l/2+cut],[x+w/2,z+l/2-cut],[x+w/2-cut,z+l/2],[x-w/2+cut,z+l/2],[x-w/2,z+l/2-cut],[x-w/2,z-l/2+cut]],m,y);
 }
 if(id==='A'){
  panel([[-.06,-4.78],[.33,-2.73],[.08,-1.75],[-.32,-2.74]],armor,.26);
  for(const side of [-1,1]){
   const mirror=points=>points.map(([x,z])=>[x*side,z]);
   panel(mirror([[1.27,-.68],[2.02,-.19],[2.2,.63],[1.13,.42]]),hull,.4);
   panel(mirror([[2.11,-.04],[2.8,.44],[3.27,1.12],[2.2,.94]]),armor,.35);
   panel(mirror([[2.36,1.1],[3.65,1.47],[3.31,2.14],[2.23,1.72]]),hull,.3);
   panel(mirror([[1.17,.65],[2.04,.87],[2.03,1.5],[1.19,1.37]]),armor,.39);
   for(const z of [-.4,.5,1.6])boxPanel(side*.92,z,.52,.69,.76,z===.5?hull:armor);
  }
 }else if(id==='B'){
  for(const side of [-1,1]){
   for(const [i,z] of [-2.5,-1.4,-.25,.92,1.84].entries())boxPanel(side*2.15,z,.85,i===4?.65:.98,.6,i%2?hull:armor);
   for(const z of [-1.5,-.4,.7]){
    const pipe=part(new THREE.CylinderGeometry(.05,.05,.76,8),edge,side*1.49,.05,z);pipe.rotation.z=Math.PI/2;
    part(new THREE.BoxGeometry(.18,.24,.18),dark,side*1.11,.07,z);
   }
   panel([[2.73,.02],[3.52,.59],[3.41,1.13],[2.66,.83]].map(([x,z])=>[x*side,z]),hull,.3);
  }
  boxPanel(0,1.02,.88,.73,.47,armor);
 }else{
  for(const side of [-1,1]){
   for(const [i,z] of [-.9,.02,.94].entries())boxPanel(side*1.4,z,.52,.68,.55,i%2?armor:hull);
   panel([[1.91,-.71],[2.51,-.37],[2.75,.23],[2.02,.56]].map(([x,z])=>[x*side,z]),hull,.49);
   panel([[2.14,.68],[3.15,.95],[2.89,1.45],[1.7,1.81]].map(([x,z])=>[x*side,z]),armor,.34);
   const vent=part(new THREE.BoxGeometry(.52,.18,.54),dark,side*1.82,.37,-.87);
   for(let i=0;i<5;i++)part(new THREE.BoxGeometry(.4,.025,.034),edge,side*1.82,.48,-1.06+i*.08);
  }
  panel([[-.12,-3.1],[.59,-1.81],[.13,-1.23],[-.59,-1.8]],armor,.3);
  boxPanel(0,1.43,.97,.78,.54,hull);
 }
 // Fine edge wear stays restrained so the glass and metal do not look wireframed.
 group.traverse(o=>{if(o.isMesh&&(o.material===armor||o.material===hull)){const lines=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,38),new THREE.LineBasicMaterial({color:0xaca18e,transparent:true,opacity:.14}));lines.position.copy(o.position);lines.rotation.copy(o.rotation);group.userData.edges??=[];group.userData.edges.push(lines);}});
 for(const line of group.userData.edges??[])group.add(line);
 return {group,flames,firePoints,id};
}
