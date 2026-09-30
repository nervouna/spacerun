import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPirateFleet,FINAL_STAGE} from '../src/pirate-fleet.js';
function setup(){
 const scene=new THREE.Scene(),victories=[];
 const fleet=createPirateFleet(scene,{metalColor:null,metalNormal:null,metalRoughness:null,explode(){},tone(){},onDamage(){},onHit(){},onVictory:d=>victories.push(d)});
 return {scene,fleet,victories};
}
test('later milestones add pirates while earlier ships remain alive',()=>{
 const {fleet,scene}=setup(),player=new THREE.Vector3();
 fleet.update(1.8,3,player);assert.equal(fleet.snapshot().activeCount,1);
 fleet.update(1.8,6,player);assert.equal(fleet.snapshot().activeCount,2);
 fleet.update(1.8,9,player);assert.equal(fleet.snapshot().activeCount,3);assert.equal(fleet.snapshot().positions.length,3);
 fleet.clear();assert.equal(scene.children.length,0);assert.equal(fleet.snapshot().activeCount,0);assert.equal(fleet.snapshot().nextDistance,3);
});
test('destroying one pirate leaves the other combatant and does not duplicate a milestone',()=>{
 const {fleet,victories}=setup(),player=new THREE.Vector3();
 fleet.update(1.8,3,player);fleet.update(1.8,6,player);
 let guard=0;
 while(victories.length===0&&guard++<200){const p=fleet.snapshot().position;fleet.hit(new THREE.Vector3(p.x,p.y,p.z+5),new THREE.Vector3(p.x,p.y,p.z-5));}
 assert.equal(victories.length,1);assert.equal(fleet.snapshot().activeCount,1);
 fleet.update(4,6,player);assert.equal(fleet.snapshot().activeCount,1);assert.equal(fleet.snapshot().nextDistance,9);
 fleet.clear();
});
test('only ten pirates spawn and distance alone never completes the mission',()=>{
 const {fleet}=setup();assert.equal(FINAL_STAGE,10);
 fleet.update(1.8,30,new THREE.Vector3());assert.equal(fleet.snapshot().activeCount,10);assert.equal(fleet.snapshot().nextDistance,null);assert.equal(fleet.snapshot().completed,false);
 fleet.update(.05,120,new THREE.Vector3());assert.equal(fleet.snapshot().activeCount,10);assert.equal(fleet.snapshot().completed,false);
 fleet.clear();
});
test('victory requires every pirate from all ten rounds to be defeated and clear resets progress',()=>{
 const {fleet,victories}=setup();fleet.update(1.8,30,new THREE.Vector3());
 for(let i=0;i<10;i++){
  assert.equal(fleet.snapshot().completed,false);
  const p=fleet.snapshot().position;assert.ok(p);
  assert.equal(fleet.hit(new THREE.Vector3(p.x,p.y,p.z+5),new THREE.Vector3(p.x,p.y,p.z-5),1000),true);
  assert.equal(fleet.snapshot().defeated,i+1);
 }
 assert.equal(fleet.snapshot().completed,true);assert.equal(victories.length,10);assert.equal(fleet.snapshot().activeCount,0);
 fleet.update(4,120,new THREE.Vector3());assert.equal(victories.length,10);assert.equal(fleet.snapshot().completed,true);
 fleet.clear();assert.equal(fleet.snapshot().completed,false);assert.equal(fleet.snapshot().defeated,0);assert.equal(fleet.snapshot().nextDistance,3);
});
