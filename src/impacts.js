import * as THREE from 'three';

export function createImpactFeedback(scene,ship) {
  let playerTimer=0,enemyTimer=0,lastDamage=0,direction=0;
  const materials=new Set();ship.traverse(m=>{if(m.material?.emissive)materials.add(m.material);});
  const savedMaterials=[...materials].map(material=>({material,color:material.emissive.clone(),intensity:material.emissiveIntensity}));
  const shieldMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{strength:{value:0},age:{value:0},hitDirection:{value:new THREE.Vector3(0,0,-1)}},
    vertexShader:'varying vec3 n;varying vec3 v;varying vec3 local;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);local=normalize(position);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n;varying vec3 v;varying vec3 local;uniform float strength;uniform float age;uniform vec3 hitDirection;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.);float dist=distance(local,hitDirection);float ripple=exp(-pow((dist-age*3.)*10.,2.));float grid=pow(abs(sin(local.y*35.)),18.)*.13;vec3 color=mix(vec3(.18,.65,1.4),vec3(1.6,.75,.24),ripple);float a=(rim*.6+ripple*.8+grid)*strength;gl_FragColor=vec4(color,a);}'
  });
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),shieldMaterial);shield.scale.set(4.55,1.35,4.6);shield.visible=false;ship.add(shield);
  const maxParticles=160,particles=[];
  const positions=new Float32Array(maxParticles*6),colors=new Float32Array(maxParticles*6);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setDrawRange(0,0);
  const sparks=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sparks.frustumCulled=false;scene.add(sparks);
  function enemyHit(position){
    enemyTimer=.25;
    for(let i=0;i<14;i++)particles.push({position:position.clone(),velocity:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(4+Math.random()*12),life:.22+Math.random()*.18,maxLife:.4});
    if(particles.length>maxParticles)particles.splice(0,particles.length-maxParticles);
  }
  function playerHit(position,amount){
    playerTimer=.7;lastDamage=amount;
    const incoming=position.clone().sub(ship.position);direction=Math.atan2(incoming.x,incoming.y)*180/Math.PI;
    const local=ship.worldToLocal(position.clone()).normalize();
    if(local.lengthSq()<.001)local.set(0,0,-1);
    shieldMaterial.uniforms.hitDirection.value.copy(local);
  }
  function update(dt){
    playerTimer=Math.max(0,playerTimer-dt);enemyTimer=Math.max(0,enemyTimer-dt);
    shield.visible=playerTimer>0;shieldMaterial.uniforms.strength.value=playerTimer/.7;
    shieldMaterial.uniforms.age.value=.7-playerTimer;
    const flash=Math.max(0,1-(.7-playerTimer)/.2);
    for(const s of savedMaterials){s.material.emissive.copy(s.color).add(new THREE.Color(.6,.8,1).multiplyScalar(flash));s.material.emissiveIntensity=flash>0?1:s.intensity;}
    for(let i=particles.length-1;i>=0;i--){particles[i].life-=dt;if(particles[i].life<=0)particles.splice(i,1);else particles[i].position.addScaledVector(particles[i].velocity,dt);}
    for(let i=0;i<particles.length;i++){
      const p=particles[i],fade=p.life/p.maxLife;p.position.toArray(positions,i*6);
      p.position.clone().addScaledVector(p.velocity,-.035).toArray(positions,i*6+3);
      const color=new THREE.Color(3*fade,1.6*fade,.55*fade);color.toArray(colors,i*6);color.multiplyScalar(.15).toArray(colors,i*6+3);
    }
    geometry.setDrawRange(0,particles.length*2);geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
    return Math.max(0,playerTimer-.4)*.45;
  }
  function clear(){playerTimer=enemyTimer=lastDamage=0;particles.length=0;shield.visible=false;geometry.setDrawRange(0,0);update(0);}
  return {enemyHit,playerHit,update,clear,snapshot:()=>({playerHit:playerTimer>0,enemyHit:enemyTimer>0,damage:lastDamage,direction,flash:Math.max(0,playerTimer/.7)})};
}
