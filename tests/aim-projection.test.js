import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {projectAimOffset} from '../src/aim-projection.js';
test('aim follows the world target when the camera turns and returns on recenter',()=>{
 const reference=new THREE.PerspectiveCamera(58,16/9,.1,1800);reference.position.set(0,5,19);reference.lookAt(0,1,-35);
 const camera=reference.clone(),target=new THREE.Vector3(0,-1.6,-90);
 assert.deepEqual(projectAimOffset(target,camera,reference,1280,720),{x:0,y:-0});
 camera.lookAt(30,1,-35);
 const turned=projectAimOffset(target,camera,reference,1280,720);assert.ok(turned.x< -100);assert.ok(Number.isFinite(turned.y));
 camera.copy(reference);const returned=projectAimOffset(target,camera,reference,1280,720);assert.equal(returned.x,0);assert.equal(Math.abs(returned.y),0);
 camera.position.z=10;const zoomed=projectAimOffset(target,camera,reference,1280,720);assert.ok(Math.abs(zoomed.y)>0);
});
