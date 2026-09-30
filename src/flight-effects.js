import * as THREE from 'three';

// Pooled peripheral streaks keep the aiming corridor clear.
export function createFlightEffects(scene) {
  const count=72, positions=new Float32Array(count*6), lanes=[];
  let seed=9142;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){
    const angle=random()*Math.PI*2, radius=10+random()*23;
    lanes.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,z:-180+random()*200});
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.LineBasicMaterial({color:0x9ec8dd,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const streaks=new THREE.LineSegments(geometry,material);streaks.frustumCulled=false;scene.add(streaks);
  let intensity=0;
  return {
    update(dt,ship,speed,active,boosting,launch){
      const target=active?(boosting?.75:launch*.55):0;
      intensity=THREE.MathUtils.damp(intensity,target,5,dt);
      streaks.visible=intensity>.005;material.opacity=intensity*.48;
      for(let i=0;i<count;i++){
        const lane=lanes[i];if(active)lane.z+=dt*speed*1.8;
        if(lane.z>24)lane.z=-180;
        const j=i*6,length=2+intensity*15;
        positions[j]=positions[j+3]=ship.x+lane.x;
        positions[j+1]=positions[j+4]=ship.y+lane.y;
        positions[j+2]=lane.z;positions[j+5]=lane.z-length;
      }
      geometry.attributes.position.needsUpdate=true;
    }
  };
}
