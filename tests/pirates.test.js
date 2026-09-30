import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPirates} from '../src/pirates.js';
function setup(){
 const scene=new THREE.Scene(),damage=[],victories=[],explosions=[];
 const pirates=createPirates(scene,{metalColor:null,metalNormal:null,metalRoughness:null,tone(){},explode:(...args)=>explosions.push(args),onDamage:n=>damage.push(n),onVictory:d=>victories.push(d)});
 return {scene,pirates,damage,victories,explosions};
}
function spawn(pirates){pirates.update(1,2.8,new THREE.Vector3());pirates.update(.8,3,new THREE.Vector3());}
test('pirate approaches, charges, and fires a damaging spread',()=>{
 const {pirates,damage}=setup();spawn(pirates);
 const entryZ=pirates.snapshot().position.z;
 let charged=false,fired=false;
 for(let i=0;i<280;i++){
  pirates.update(.05,3,new THREE.Vector3());
  const s=pirates.snapshot();charged ||= s.charging;fired ||= s.projectiles>0;
 }
 assert.ok(pirates.snapshot().position.z<entryZ);
 assert.ok(charged);assert.ok(fired);assert.ok(damage.length>0);assert.equal(damage[0],20);
 pirates.clear();
});
test('shots deplete armor exactly once, award stage rewards, and clear hostile bullets',()=>{
 const {pirates,victories,explosions,scene}=setup();spawn(pirates);
 const hp=pirates.snapshot().health;
 for(let i=0;i<hp;i++){
  const p=new THREE.Vector3(pirates.snapshot().position.x,pirates.snapshot().position.y,pirates.snapshot().position.z);
  assert.equal(pirates.hit(p.clone().add(new THREE.Vector3(0,0,5)),p.clone().add(new THREE.Vector3(0,0,-5))),true);
 }
 assert.equal(victories.length,1);assert.equal(victories[0].reward,1000);assert.equal(victories[0].shieldReward,20);
 assert.equal(explosions.length,1);assert.equal(explosions[0][2],'ship');assert.equal(pirates.snapshot().phase,'cruise');assert.equal(pirates.snapshot().projectiles,0);assert.equal(scene.children.length,0);
 assert.equal(pirates.hit(new THREE.Vector3(),new THREE.Vector3()),false);
 pirates.update(1.8,6,new THREE.Vector3());assert.equal(pirates.snapshot().stage,2);assert.equal(pirates.snapshot().health,90);
 pirates.clear();assert.equal(scene.children.length,0);assert.equal(pirates.snapshot().stage,0);assert.equal(pirates.snapshot().nextDistance,3);
});
test('a missed shot does not damage pirate armor',()=>{
 const {pirates}=setup();spawn(pirates);const hp=pirates.snapshot().health;
 assert.equal(pirates.hit(new THREE.Vector3(100,100,0),new THREE.Vector3(100,100,-200)),false);
 assert.equal(pirates.snapshot().health,hp);pirates.clear();
});
test('entry is non-firing, and hit feedback follows confirmed hits only',()=>{
 const scene=new THREE.Scene(),hits=[];
 const pirates=createPirates(scene,{metalColor:null,metalNormal:null,metalRoughness:null,tone(){},explode(){},onDamage(){},onVictory(){},onHit:p=>hits.push(p)});
 spawn(pirates);
 for(let i=0;i<50;i++)pirates.update(.05,3,new THREE.Vector3());
 assert.equal(pirates.snapshot().projectiles,0);assert.equal(pirates.snapshot().charging,false);assert.equal(pirates.snapshot().entryPhase,'turn');
 const p=pirates.snapshot().position;
 assert.equal(pirates.hit(new THREE.Vector3(p.x,p.y,p.z+6),new THREE.Vector3(p.x,p.y,p.z-6)),true);
 assert.equal(hits.length,1);assert.equal(pirates.snapshot().hit,true);
 pirates.update(.3,3,new THREE.Vector3());assert.equal(pirates.snapshot().hit,false);
 pirates.clear();assert.equal(scene.children.length,0);
});

test('first pirate survives the old full health worth of hits and fights back',()=>{
 const {pirates}=setup();spawn(pirates);
 for(let i=0;i<18;i++){
  const p=pirates.snapshot().position;
  assert.equal(pirates.hit(new THREE.Vector3(p.x,p.y,p.z+5),new THREE.Vector3(p.x,p.y,p.z-5)),true);
 }
 assert.equal(pirates.snapshot().health,54);
 let volleySize=0;
 for(let i=0;i<120;i++){
  pirates.update(.05,3,new THREE.Vector3());
  volleySize=Math.max(volleySize,pirates.snapshot().projectiles);
 }
 assert.equal(volleySize,5);assert.equal(pirates.snapshot().phase,'battle');
 pirates.clear();
});

test('beam tracing is read-only and damage supports fractional and heavy hits',()=>{
 const {pirates}=setup();spawn(pirates);const p=pirates.snapshot().position;
 const a=new THREE.Vector3(p.x,p.y,p.z+10),b=new THREE.Vector3(p.x,p.y,p.z-10);
 assert.equal(pirates.trace(a,b).distance,6.5);assert.equal(pirates.snapshot().health,72);
 pirates.hit(a,b,.65);assert.equal(pirates.snapshot().health,71.35);
 pirates.hit(a,b,1.5);assert.equal(pirates.snapshot().health,69.85);
 for(let i=0;i<108;i++)pirates.hit(a,b,.65);
 assert.equal(pirates.snapshot().health,0);assert.equal(pirates.trace(a,b),null);
});

test('stage-eight ships fire 21-round vertical volleys after their non-firing entry',()=>{
 for(const [stage,count] of [[7,7],[8,21]]){
  const scene=new THREE.Scene(),pirates=createPirates(scene,{metalColor:null,metalNormal:null,metalRoughness:null,tone(){},explode(){},onDamage(){},onVictory(){},stageNumber:stage,singleEncounter:true});
  pirates.update(1.8,stage*3,new THREE.Vector3());assert.equal(pirates.snapshot().projectiles,0);
  let fired=0;
  for(let i=0;i<160;i++){pirates.update(.05,stage*3,new THREE.Vector3());fired=pirates.snapshot().projectiles;if(fired)break;}
  assert.equal(fired,count);assert.equal(pirates.snapshot().entryPhase,'combat');
  pirates.clear();assert.equal(scene.children.length,0);
 }
});
