import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createImpactFeedback} from '../src/impacts.js';
test('player and enemy feedback decays and restart restores armor materials',()=>{
 const scene=new THREE.Scene(),ship=new THREE.Group(),material=new THREE.MeshStandardMaterial({emissive:0x102030});
 ship.add(new THREE.Mesh(new THREE.BoxGeometry(),material));scene.add(ship);
 const original=material.emissive.clone(),fx=createImpactFeedback(scene,ship);
 fx.playerHit(new THREE.Vector3(3,0,0),15);fx.enemyHit(new THREE.Vector3(0,0,-48));
 assert.equal(fx.snapshot().direction,90);assert.equal(fx.snapshot().damage,15);assert.equal(fx.snapshot().enemyHit,true);
 assert.ok(fx.update(.05)>0);assert.notDeepEqual(material.emissive,original);
 fx.update(1);assert.equal(fx.snapshot().playerHit,false);assert.equal(fx.snapshot().enemyHit,false);assert.deepEqual(material.emissive,original);
 fx.playerHit(new THREE.Vector3(0,0,-1),25);fx.clear();assert.equal(fx.snapshot().playerHit,false);assert.deepEqual(material.emissive,original);
});
