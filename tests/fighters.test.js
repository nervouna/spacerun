import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFighter,FIGHTERS} from '../src/fighters.js';
import {createImpactFeedback} from '../src/impacts.js';
test('all selectable fighters have distinct hulls, paired engines, and forward gun mounts',()=>{
 const models=FIGHTERS.map(f=>createFighter(f.id));
 const widths=[];
 for(const m of models){
  assert.equal(m.flames.length,4);assert.equal(m.firePoints.length,2);
  assert.ok(m.firePoints[0].x<0&&m.firePoints[1].x>0);assert.ok(m.firePoints.every(p=>p.z<0));
  const box=new THREE.Box3().setFromObject(m.group);assert.ok(Number.isFinite(box.min.x));widths.push(box.max.x-box.min.x);
  m.group.traverse(o=>{if(o.isMesh){for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});
 }
 assert.equal(new Set(widths.map(w=>w.toFixed(2))).size,3);
 assert.throws(()=>createFighter('D'),/Unknown fighter/);
});
test('damage flashes nested fighter armor and clears it before switching aircraft',()=>{
 const original=globalThis.document;
 try{
  const scene=new THREE.Scene(),ship=new THREE.Group(),model=createFighter('B');ship.add(model.group);scene.add(ship);
  const armor=model.group.children.find(o=>o.isMesh&&o.material.emissive);const before=armor.material.emissive.clone();
  const feedback=createImpactFeedback(scene,ship);feedback.playerHit(new THREE.Vector3(1,0,-2),20);feedback.update(.02);
  assert.ok(armor.material.emissive.r>before.r);feedback.clear();assert.ok(armor.material.emissive.equals(before));
 }finally{globalThis.document=original;}
});

test('dedicated concept textures are applied to steel and painted armor',()=>{
 const steel=new THREE.Texture(),paint=new THREE.Texture(),environment=new THREE.Texture();
 for(const id of ['A','B','C']){
  const model=createFighter(id,{fighterSteel:steel,fighterPaint:paint,fighterEnvironment:environment});
  const materials=new Set();model.group.traverse(o=>{if(o.isMesh)materials.add(o.material);});
  assert.ok([...materials].some(m=>m.map===steel));assert.ok([...materials].some(m=>m.map===paint));
  assert.ok([...materials].filter(m=>m.isMeshStandardMaterial).every(m=>m.envMap===environment));
  model.group.traverse(o=>{if(o.isMesh&&o.geometry.attributes.uv)for(const n of o.geometry.attributes.uv.array)assert.ok(Number.isFinite(n));});
 }
});
