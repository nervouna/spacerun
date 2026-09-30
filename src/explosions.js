import * as THREE from 'three';

// Shared GPU resources keep sustained fire from creating unbounded particles.
export function createExplosions(scene,camera,rockMaterial) {
  const active=[];
  const maxExplosions=10;
  const flashGeometry=new THREE.SphereGeometry(1,16,12);
  const ringGeometry=new THREE.RingGeometry(.92,1,96);
  const debrisGeometry=new THREE.DodecahedronGeometry(1,0);
  const armorGeometry=new THREE.BoxGeometry(1,1,1);
  const flameTexture=createFlameTexture();
  const light=new THREE.PointLight(0xff862f,0,65,2);scene.add(light);
  const transform=new THREE.Object3D();
  const white=new THREE.Color(0xffebbf).multiplyScalar(5);
  const orange=new THREE.Color(0xff6a18).multiplyScalar(2.8);
  const ember=new THREE.Color(0x8d2109);
  function release(effect) {
    scene.remove(effect.group);
    effect.materials.forEach(m=>m.dispose());
    effect.streaks.geometry.dispose();effect.debris.dispose();
  }
  function clear(){for(const e of active)release(e);active.length=0;light.intensity=0;}
  function burst(position,radius,type='rock'){
    const isShip=type==='ship';
    if(active.length>=maxExplosions)release(active.shift());
    const r=THREE.MathUtils.clamp(radius,1,5);
    const group=new THREE.Group();group.position.copy(position);scene.add(group);
    const materials=[];
    const flashMaterial=new THREE.MeshBasicMaterial({color:white,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(flashMaterial);
    const flash=new THREE.Mesh(flashGeometry,flashMaterial);group.add(flash);
    const ringMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffb85c).multiplyScalar(3),side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(ringMaterial);
    const ring=new THREE.Mesh(ringGeometry,ringMaterial);group.add(ring);
    const flames=[];
    for(let i=0;i<9;i++){
      const m=new THREE.SpriteMaterial({map:flameTexture,color:white,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,rotation:Math.random()*Math.PI*2});materials.push(m);
      const sprite=new THREE.Sprite(m);
      const direction=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();
      group.add(sprite);flames.push({sprite,direction,size:.65+Math.random()*.7});
    }
    const count=72;
    const positions=new Float32Array(count*6),colors=new Float32Array(count*6),streakVelocities=[];
    for(let i=0;i<count;i++){
      const direction=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar((12+Math.random()*26)*(r*.35+.65));
      streakVelocities.push(direction);
      const c=new THREE.Color(i%4===0?0xffe4aa:0xff8b34).multiplyScalar(2.5);
      c.toArray(colors,i*6);c.clone().multiplyScalar(.12).toArray(colors,i*6+3);
    }
    const streakGeometry=new THREE.BufferGeometry();streakGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));streakGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const streakMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(streakMaterial);
    const streaks=new THREE.LineSegments(streakGeometry,streakMaterial);streaks.frustumCulled=false;group.add(streaks);
    const debrisMaterial=isShip?new THREE.MeshStandardMaterial({color:0x777b80,metalness:.85,roughness:.4}):rockMaterial.clone();debrisMaterial.transparent=true;debrisMaterial.emissive.setHex(0xb84c14);debrisMaterial.emissiveIntensity=1.1;materials.push(debrisMaterial);
    const debris=new THREE.InstancedMesh(isShip?armorGeometry:debrisGeometry,debrisMaterial,24);debris.frustumCulled=false;debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(debris);
    const pieces=Array.from({length:24},()=>({
      direction:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(9+Math.random()*18),
      size:(.08+Math.random()*.22)*r,thickness:isShip?(Math.random()<.7?.08:.4):.6,length:isShip?1.5+Math.random()*1.5:1.3,spin:new THREE.Vector3(Math.random()*6,Math.random()*6,Math.random()*6)
    }));
    active.push({group,r,age:0,flash,ring,flames,streaks,streakVelocities,positions,debris,pieces,materials});
  }
  function update(dt){
    let shake=0,brightest=0;light.intensity=0;
    for(let i=active.length-1;i>=0;i--){
      const e=active[i];e.age+=dt;const t=e.age;
      if(t>2.1){release(e);active.splice(i,1);continue;}
      // White-hot initial impact gives way to turbulent orange fire and debris.
      e.flash.scale.setScalar(e.r*(.65+t*8));e.flash.material.opacity=Math.max(0,1-t/.14);
      e.ring.quaternion.copy(camera.quaternion);e.ring.scale.setScalar(e.r*(1+t*11));e.ring.material.opacity=Math.max(0,1-t/.85)**2;
      for(const f of e.flames){
        f.sprite.position.copy(f.direction).multiplyScalar(e.r*t*2.4);
        f.sprite.scale.setScalar(e.r*f.size*(1.3+Math.min(t,.7)*5));
        f.sprite.material.color.copy(t<.18?white.clone().lerp(orange,t/.18):orange.clone().lerp(ember,Math.min(1,(t-.18)/1.1)));
        f.sprite.material.opacity=Math.min(1,t*30)*Math.max(0,1-t/1.35)**1.4;
      }
      for(let j=0;j<e.streakVelocities.length;j++){
        const v=e.streakVelocities[j],travel=(1-Math.exp(-t*1.4))/1.4,tail=Math.max(0,travel-.09);
        v.clone().multiplyScalar(travel).toArray(e.positions,j*6);v.clone().multiplyScalar(tail).toArray(e.positions,j*6+3);
      }
      e.streaks.geometry.attributes.position.needsUpdate=true;e.streaks.material.opacity=Math.max(0,1-t/1.3);
      for(let j=0;j<e.pieces.length;j++){
        const p=e.pieces[j];transform.position.copy(p.direction).multiplyScalar(t);transform.rotation.set(p.spin.x*t,p.spin.y*t,p.spin.z*t);transform.scale.set(p.size,p.size*p.thickness,p.size*p.length);transform.updateMatrix();e.debris.setMatrixAt(j,transform.matrix);
      }
      e.debris.instanceMatrix.needsUpdate=true;e.debris.material.opacity=Math.min(1,(2.1-t)*2);e.debris.material.emissiveIntensity=Math.max(0,1-t*1.5);
      const proximity=Math.max(0,1-camera.position.distanceTo(e.group.position)/150);
      shake=Math.max(shake,Math.exp(-t*8)*proximity*e.r*.055);
      const intensity=100*Math.exp(-t*12)*e.r;
      if(intensity>brightest){brightest=intensity;light.position.copy(e.group.position);light.intensity=intensity;}
    }
    return shake;
  }
  return {burst,update,clear};
}

function createFlameTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=(x-128)/128,v=(y-128)/128;
    const n=Math.sin(u*19+Math.sin(v*13)*2)*Math.cos(v*21+Math.sin(u*12))* .12+Math.sin(u*39+v*27)*.035;
    const falloff=Math.max(0,1-Math.hypot(u,v)+n);
    const i=(y*256+x)*4;image.data[i]=255;image.data[i+1]=255;image.data[i+2]=255;image.data[i+3]=Math.min(255,falloff**2*350);
  }
  ctx.putImageData(image,0,0);return new THREE.CanvasTexture(canvas);
}
