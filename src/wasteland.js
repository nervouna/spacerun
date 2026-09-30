import * as THREE from 'three';

// Seeded art generation is separate from gameplay randomness.
let seed = 91383;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mix = (a,b,t) => a+(b-a)*t;
function hash(x,y) { const n = Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
function noise(x,y) {
  const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);
}
function fbm(x,y) {let v=0,a=.5;for(let i=0;i<5;i++){v+=noise(x,y)*a;x=x*2.03+7.1;y=y*2.03+3.7;a*=.5;}return v;}
function canvas(w,h=w) {const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function texture(c,color=true) {const t=new THREE.CanvasTexture(c);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}

export function wornMetal(base='#afa18a') {
  const [c,ctx]=canvas(1024);ctx.fillStyle=base;ctx.fillRect(0,0,1024,1024);
  // Rust follows broad patches; fine scratches and plating sit above it.
  const img=ctx.getImageData(0,0,1024,1024);
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const i=(y*1024+x)*4,n=fbm(x/125,y/125),rust=Math.max(0,n-.52)*4;
    const grain=rand()*15-7,shade=.72+n*.5;
    img.data[i]=mix(img.data[i]*shade,93,rust)+grain;
    img.data[i+1]=mix(img.data[i+1]*shade,46,rust)+grain;
    img.data[i+2]=mix(img.data[i+2]*shade,25,rust)+grain;
  }
  ctx.putImageData(img,0,0);
  for(let y=0;y<1024;y+=256)for(let x=0;x<1024;x+=256){
    ctx.strokeStyle='#302b22a0';ctx.lineWidth=3;ctx.strokeRect(x+3,y+3,250,250);
    ctx.strokeStyle='#ead9b740';ctx.lineWidth=1;ctx.strokeRect(x+6,y+6,244,244);
    for(const px of [x+14,x+241])for(const py of [y+14,y+241]){ctx.fillStyle='#302c26';ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d1c5ae';ctx.fillRect(px-1,py-2,1,2);}
  }
  for(let i=0;i<2600;i++){
    const x=rand()*1024,y=rand()*1024;ctx.strokeStyle=rand()>.5?'#332a2360':'#efe0c045';ctx.lineWidth=rand()*.9;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*25,y+rand()*4);ctx.stroke();
  }
  return texture(c);
}

export function addShipDetails(ship) {
  const steel=new THREE.MeshStandardMaterial({color:0x373634,metalness:.7,roughness:.65});
  const rust=new THREE.MeshStandardMaterial({color:0x946044,metalness:.35,roughness:.82});
  const bolt=new THREE.MeshStandardMaterial({color:0xafa58e,metalness:.75,roughness:.5});
  const boltGeometry=new THREE.CylinderGeometry(.035,.035,.03,6);
  const ventGeometry=new THREE.BoxGeometry(.44,.025,.055);
  function part(g,m,x,y,z){const p=new THREE.Mesh(g,m);p.position.set(x,y,z);ship.add(p);return p;}
  for(const side of [-1,1]){
    for(let i=0;i<9;i++)part(ventGeometry,steel,side*2.48,.12,.05+i*.16);
    for(const z of [-.3,1.65])for(const x of [2.16,2.78])part(boltGeometry,bolt,side*x,.135,z);
    const pipe=part(new THREE.CylinderGeometry(.045,.045,1.85,10),rust,side*1.08,.22,1.03);pipe.rotation.x=Math.PI/2;
    for(let i=0;i<4;i++)part(new THREE.BoxGeometry(.3,.055,.07),steel,side*.48,.31,1.1+i*.22);
    part(new THREE.BoxGeometry(.34,.14,.68),rust,side*1.62,.02,1.19);
    // Worn safety stripe and serial number are top-surface decals.
    const [c,ctx]=canvas(256,512);ctx.fillStyle='#a78549';ctx.fillRect(0,0,256,512);
    ctx.fillStyle='#27251f';for(let j=-512;j<512;j+=105){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(256,j+230);ctx.lineTo(256,j+280);ctx.lineTo(0,j+50);ctx.fill();}
    for(let i=0;i<1800;i++){ctx.fillStyle=rand()>.5?'#443a31':'#c0b59a';ctx.fillRect(rand()*256,rand()*512,rand()*9,rand()*3);}
    const decal=part(new THREE.PlaneGeometry(.34,1.85),new THREE.MeshStandardMaterial({map:texture(c),roughness:.9,polygonOffset:true,polygonOffsetFactor:-1}),side*3.04,.035,.86);decal.rotation.x=-Math.PI/2;
  }
  const [c,ctx]=canvas(256);ctx.clearRect(0,0,256,256);ctx.fillStyle='#d3c2a0';ctx.font='bold 118px monospace';ctx.textAlign='center';ctx.fillText('07',128,145);ctx.font='22px monospace';ctx.fillText('SALVAGE',128,190);
  ctx.globalCompositeOperation='destination-out';for(let i=0;i<350;i++)ctx.fillRect(rand()*256,rand()*256,rand()*8,rand()*2);
  const serial=part(new THREE.PlaneGeometry(.73,.84),new THREE.MeshStandardMaterial({map:texture(c),transparent:true,roughness:1,depthWrite:false}),0,.42,-1.62);serial.rotation.x=-Math.PI/2;
}

export function addWreckage(scene, metalMap) {
  const metal=new THREE.MeshStandardMaterial({map:metalMap,color:0x726553,metalness:.65,roughness:.85});
  const dark=new THREE.MeshStandardMaterial({color:0x262729,metalness:.6,roughness:.8});
  const solar=new THREE.MeshStandardMaterial({color:0x283b43,metalness:.65,roughness:.57});
  const light=new THREE.MeshBasicMaterial({color:new THREE.Color(0xff7733).multiplyScalar(3)});
  const wreck=new THREE.Group();wreck.position.set(83,15,-230);wreck.rotation.set(.22,.48,-.47);scene.add(wreck);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(37,1.8,10,100,Math.PI*1.65),metal);wreck.add(ring);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(33,.34,6,100,Math.PI*1.51),dark);wreck.add(inner);
  for(let i=0;i<18;i++){
    const angle=i*.29,r=36;
    const p=new THREE.Mesh(new THREE.BoxGeometry(5.6,3.3,3.2),metal);p.position.set(Math.cos(angle)*r,Math.sin(angle)*r,0);p.rotation.z=angle+Math.PI/2;wreck.add(p);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(5.7,.22,3.3),dark);edge.position.copy(p.position);edge.rotation.copy(p.rotation);wreck.add(edge);
    if(i%3===0){const beacon=new THREE.Mesh(new THREE.BoxGeometry(.5,1,.8),light);beacon.position.copy(p.position).multiplyScalar(1.035);wreck.add(beacon);}
  }
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(6,7,21,10),metal);hub.rotation.x=Math.PI/2;hub.position.set(-7,2,2);wreck.add(hub);
  for(const angle of [.3,1.75,3.2,4.4]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(27,1.6,1.9),dark);beam.position.set(Math.cos(angle)*18,Math.sin(angle)*18,1);beam.rotation.z=angle;wreck.add(beam);
  }
  for(let i=0;i<5;i++){
    const panel=new THREE.Group();panel.position.set(-27+i*13,-29-i*1.3,7);panel.rotation.set(.45,-.1,i*.09);
    const p=new THREE.Mesh(new THREE.BoxGeometry(10,.3,17),solar);panel.add(p);
    for(let j=-4;j<5;j++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.12,.36,17),metal);rib.position.x=j;panel.add(rib);}
    wreck.add(panel);
  }
  // Debris stays outside the playable corridor; it is scenery, not a new enemy.
  const debris=[];
  const shapes=[new THREE.BoxGeometry(2.6,.35,5),new THREE.CylinderGeometry(1,1,3,8),new THREE.BoxGeometry(1.2,2,3.5)];
  for(let i=0;i<38;i++){
    const p=new THREE.Mesh(shapes[i%3],i%5===0?solar:metal);
    p.position.set((i%2?1:-1)*(23+rand()*72),(rand()-.5)*65,-35-rand()*340);
    p.rotation.set(rand()*6,rand()*6,rand()*6);p.scale.setScalar(.5+rand()*1.6);scene.add(p);debris.push(p);
  }
  return {update(dt,speed){wreck.rotation.z+=dt*.003;for(const p of debris){p.rotation.x+=dt*.04;p.rotation.z+=dt*.018;p.position.z+=dt*speed*.38;if(p.position.z>35)p.position.z=-360;}}};
}
