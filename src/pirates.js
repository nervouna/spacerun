import {createPirateMotion,volleyDirections} from './pirate-combat.js';
import * as THREE from 'three';
import {segmentSphereDistance,segmentHitsSphere,clamp} from './physics.js';
import {pirateEntryPose,ENTRY_DURATION} from './pirate-entry.js';
import {createEncounter,advanceEncounter,finishEncounter,pirateDifficulty} from './encounters.js';

export function createPirates(scene,{metalColor,metalNormal,metalRoughness,explode,tone,onDamage,onVictory,onHit=()=>{},stageNumber=1,singleEncounter=false}) {
  const hull=new THREE.MeshStandardMaterial({map:metalColor,normalMap:metalNormal,roughnessMap:metalRoughness,color:0x6c6663,metalness:.6,roughness:.8});
  const armor=new THREE.MeshStandardMaterial({color:0x963f31,emissive:0x441408,emissiveIntensity:.25,metalness:.55,roughness:.73});
  const dark=new THREE.MeshStandardMaterial({color:0x161d22,metalness:.6,roughness:.5});
  const red=new THREE.MeshBasicMaterial({color:new THREE.Color(0xff3729).multiplyScalar(2)});
  const bulletMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(0xff513c).multiplyScalar(4)});
  const bulletGeometry=new THREE.SphereGeometry(.24,8,6);
  const tailGeometry=new THREE.CylinderGeometry(.07,.18,2.1,6);tailGeometry.rotateX(Math.PI/2);
  const projectiles=[];
  const initialEncounter=()=>({...createEncounter(),stage:stageNumber-1,nextDistance:stageNumber*3});
  let finished=false;
  let encounter=initialEncounter(),enemy=null,age=0,attackTimer=0,charging=false,lockedTarget=new THREE.Vector3(),victoryTime=0,hitTime=0;
  function part(group,g,m,x=0,y=0,z=0){const p=new THREE.Mesh(g,m);p.position.set(x,y,z);group.add(p);return p;}
  function buildShip(){
    const group=new THREE.Group();
    // Broad, forward-facing scavenger ship with mismatched red armor plates.
    const body=part(group,new THREE.CylinderGeometry(.72,1.25,4.8,6),hull);body.rotation.x=Math.PI/2;
    const nose=part(group,new THREE.ConeGeometry(.78,2.1,4),armor,0,.02,2.55);nose.rotation.x=Math.PI/2;
    part(group,new THREE.BoxGeometry(.85,.47,1.3),dark,0,.68,.1);
    part(group,new THREE.BoxGeometry(.69,.06,.9),red,0,.86,.35);
    const weapons=[];
    for(const side of [-1,1]){
      const wing=part(group,new THREE.BoxGeometry(3.25,.27,1.75),hull,side*2.25,-.08,-.35);wing.rotation.y=side*.22;wing.rotation.z=-side*.08;
      part(group,new THREE.BoxGeometry(.58,.44,2.15),armor,side*2.68,.04,-.4);
      const fin=part(group,new THREE.ConeGeometry(.44,1.65,3),armor,side*3.66,.53,-.5);fin.rotation.z=side*.16;
      const gun=part(group,new THREE.CylinderGeometry(.16,.2,1.85,6),dark,side*1.54,.03,1.15);gun.rotation.x=Math.PI/2;
      const weapon=part(group,new THREE.SphereGeometry(.18,8,6),red,side*1.54,.03,2.09);weapons.push(weapon);
      const engine=part(group,new THREE.CylinderGeometry(.4,.4,1.2,6),dark,side*.95,-.04,-2.25);engine.rotation.x=Math.PI/2;
      const nozzle=part(group,new THREE.CircleGeometry(.3,6),red,side*.95,-.04,-2.86);nozzle.rotation.y=Math.PI;
    }
    for(const side of [-1,1]){
      const exhaust=part(group,new THREE.ConeGeometry(.28,2.9,12,1,true),red,side*.95,-.04,-4.05);exhaust.rotation.x=-Math.PI/2;
    }
    return {group,weapons};
  }
  function spawn(playerPosition){
    const {group,weapons}=buildShip();group.position.set(0,1,11);group.scale.setScalar(1.35);scene.add(group);
    const difficulty=pirateDifficulty(encounter.stage);
    enemy={motion:createPirateMotion(),mesh:group,weapons,health:difficulty.health,maxHealth:difficulty.health,difficulty,radius:3.5,anchor:{x:clamp(playerPosition.x,-10,10),y:clamp(playerPosition.y,-5,6)},side:encounter.stage%2?1:-1,entryPhase:'flyby'};
    const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(32*3),3));
    const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:new THREE.Color(0xff6b32).multiplyScalar(2),transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));trail.frustumCulled=false;scene.add(trail);
    enemy.trail=trail;enemy.trailPoints=[];
    age=0;attackTimer=1.8;charging=false;hitTime=0;tone(180,.45,.06,'sawtooth',60);
  }
  function restoreArmor(){
    const flash=hitTime/.22;
    hull.emissive.setRGB(flash*2,flash*.9,flash*.3);hull.emissiveIntensity=1;
    armor.emissive.setRGB(.057+flash*2,.007+flash*.9,.003+flash*.3);armor.emissiveIntensity=1;
  }
  function updateTrail(){
    enemy.mesh.updateMatrixWorld(true);
    const p=enemy.mesh.localToWorld(new THREE.Vector3(0,0,-4));
    enemy.trailPoints.unshift(p);if(enemy.trailPoints.length>32)enemy.trailPoints.pop();
    const positions=enemy.trail.geometry.attributes.position;
    for(let i=0;i<32;i++){const point=enemy.trailPoints[Math.min(i,enemy.trailPoints.length-1)];positions.setXYZ(i,point.x,point.y,point.z);}
    positions.needsUpdate=true;enemy.trail.material.opacity=age<ENTRY_DURATION?.65:.22;
  }
  function clearBullets(){for(const p of projectiles)scene.remove(p.mesh);projectiles.length=0;}
  function clear(){
    if(enemy){scene.remove(enemy.trail);enemy.trail.geometry.dispose();enemy.trail.material.dispose();scene.remove(enemy.mesh);enemy.mesh.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
    finished=false;enemy=null;clearBullets();encounter=initialEncounter();victoryTime=age=hitTime=0;charging=false;restoreArmor();
  }
  function fire(){
    const d=enemy.difficulty;
    const origin=enemy.mesh.position.clone();origin.z+=5;
    for(const direction of volleyDirections(origin,lockedTarget,d)){
      const mesh=new THREE.Group();
      part(mesh,bulletGeometry,bulletMaterial);part(mesh,tailGeometry,red,0,0,-1);
      mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);scene.add(mesh);
      projectiles.push({mesh,velocity:direction.multiplyScalar(d.bulletSpeed),previous:origin.clone(),life:6,damage:d.damage});
    }
    tone(160,.13,.065,'sawtooth',50);
  }
  function update(dt,distance,playerPosition){
    victoryTime=Math.max(0,victoryTime-dt);hitTime=Math.max(0,hitTime-dt);restoreArmor();
    const prior=encounter.phase;if(!finished)encounter=advanceEncounter(encounter,distance,dt);
    if(prior!=='battle'&&encounter.phase==='battle')spawn(playerPosition);
    if(enemy){
      age+=dt;const d=enemy.difficulty;
      if(age<ENTRY_DURATION){
        const pose=pirateEntryPose(age,enemy.side,enemy.anchor);
        enemy.mesh.position.set(pose.x,pose.y,pose.z);enemy.mesh.rotation.set(0,pose.yaw,pose.roll);enemy.entryPhase=pose.phase;
      }else{
        enemy.entryPhase='combat';
        if(d.irregular){
          const pose=enemy.motion.update(dt,enemy.mesh.position,playerPosition,d);
          enemy.mesh.position.x=pose.x;enemy.mesh.position.y=pose.y;
          enemy.mesh.rotation.z=THREE.MathUtils.damp(enemy.mesh.rotation.z,pose.roll,5,dt);
          enemy.mesh.rotation.x=THREE.MathUtils.damp(enemy.mesh.rotation.x,pose.pitch,5,dt);
        }else{
          const movementTime=(age-ENTRY_DURATION)*d.movement;
          const targetX=clamp(playerPosition.x*.4+Math.sin(movementTime*.65+encounter.stage*.9)*8,-13,13);
          const targetY=clamp(playerPosition.y*.3+Math.sin(movementTime*.9+encounter.stage*.7)*4,-6,8);
          enemy.mesh.position.x=THREE.MathUtils.damp(enemy.mesh.position.x,targetX,1.2,dt);
          enemy.mesh.position.y=THREE.MathUtils.damp(enemy.mesh.position.y,targetY,1.2,dt);
          enemy.mesh.rotation.z=THREE.MathUtils.damp(enemy.mesh.rotation.z,Math.cos(movementTime*.65)*-.12,4,dt);
        }
        enemy.mesh.rotation.y=Math.PI*2;
      attackTimer-=dt;
      if(attackTimer<=.9&&!charging){charging=true;lockedTarget.copy(playerPosition);tone(420,.18,.03,'triangle',650);}
      for(const w of enemy.weapons)w.scale.setScalar(charging?1.3+Math.sin(age*25)*.35:1);
      if(attackTimer<=0){fire();charging=false;attackTimer=d.fireInterval;}
      }
      updateTrail();
    }
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i];p.previous.copy(p.mesh.position);p.mesh.position.addScaledVector(p.velocity,dt);p.life-=dt;
      const hit=segmentHitsSphere(p.previous,p.mesh.position,playerPosition,1.15);
      if(hit)onDamage(p.damage,p.mesh.position);
      if(hit||p.life<=0||p.mesh.position.z>35){scene.remove(p.mesh);projectiles.splice(i,1);}
    }
  }
  function trace(start,end){
    if(!enemy)return null;
    const distance=segmentSphereDistance(start,end,enemy.mesh.position,enemy.radius);
    return distance===null?null:{distance,position:end.clone().sub(start).normalize().multiplyScalar(distance).add(start)};
  }
  function hit(start,end,damage=1){
    if(!enemy||!segmentHitsSphere(start,end,enemy.mesh.position,enemy.radius))return false;
    enemy.health=Math.max(0,Math.round((enemy.health-damage)*1e6)/1e6);hitTime=.22;restoreArmor();
    onHit(trace(start,end).position,damage);
    enemy.weapons.forEach(w=>w.scale.setScalar(1.5));
    if(enemy.health===0){
      const position=enemy.mesh.position.clone(),difficulty=enemy.difficulty;
      explode(position,5,'ship');scene.remove(enemy.trail);enemy.trail.geometry.dispose();enemy.trail.material.dispose();scene.remove(enemy.mesh);enemy.mesh.traverse(o=>{if(o.isMesh)o.geometry.dispose();});enemy=null;
      clearBullets();finished=singleEncounter;encounter=finishEncounter(encounter);victoryTime=3.5;charging=false;onVictory(difficulty);
    }
    return true;
  }
  function snapshot(){return {stage:encounter.stage,nextDistance:encounter.nextDistance,phase:encounter.phase,charging,entryPhase:enemy?.entryPhase??null,hit:hitTime>0,victory:victoryTime>0,health:enemy?.health??0,maxHealth:enemy?.maxHealth??0,projectiles:projectiles.length,position:enemy?{x:enemy.mesh.position.x,y:enemy.mesh.position.y,z:enemy.mesh.position.z}:null};}
  function dispose(){clear();for(const m of [hull,armor,dark,red,bulletMaterial])m.dispose();bulletGeometry.dispose();tailGeometry.dispose();}
  return {update,hit,trace,clear,dispose,snapshot,get busy(){return encounter.phase!=='cruise';}};
}
