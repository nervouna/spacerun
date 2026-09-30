import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsSphere, updateEnergy } from '../src/physics.js';
const v=(x,y,z)=>({x,y,z});
test('fast shots hit targets between frames',()=>{assert.equal(segmentHitsSphere(v(0,0,0),v(0,0,-20),v(0,0,-10),1),true);assert.equal(segmentHitsSphere(v(0,0,0),v(0,0,-20),v(3,0,-10),1),false);});
test('collision excludes targets beyond the swept path',()=>{assert.equal(segmentHitsSphere(v(0,0,0),v(0,0,-20),v(0,0,-25),1),false);assert.equal(segmentHitsSphere(v(0,0,0),v(0,0,0),v(0,0,0),1),true);});
test('boost drains energy and idle regenerates within limits',()=>{assert.deepEqual(updateEnergy(100,true,1),{boosting:true,energy:76});assert.deepEqual(updateEnergy(95,false,1),{boosting:false,energy:100});assert.deepEqual(updateEnergy(2,true,1),{boosting:true,energy:0});assert.equal(updateEnergy(0,true,0).boosting,false);});

test('beam surface contact excludes targets behind the muzzle and beyond range',async()=>{
 const {segmentSphereDistance}=await import('../src/physics.js');
 const a={x:0,y:0,z:0},b={x:0,y:0,z:-100};
 assert.equal(segmentSphereDistance(a,b,{x:0,y:0,z:-20},3),17);
 assert.equal(segmentSphereDistance(a,b,{x:0,y:0,z:20},3),null);
 assert.equal(segmentSphereDistance(a,b,{x:0,y:0,z:-120},3),null);
 assert.equal(segmentSphereDistance(a,b,{x:10,y:0,z:-20},3),null);
 assert.equal(segmentSphereDistance(a,b,{x:0,y:0,z:0},3),0);
});
