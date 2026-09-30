import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pirateEntryPose,ENTRY_DURATION} from '../src/pirate-entry.js';
test('entry begins behind the player, passes ahead, and finishes facing the player',()=>{
 const start=pirateEntryPose(0,1),pass=pirateEntryPose(2.4,1),end=pirateEntryPose(ENTRY_DURATION,1);
 assert.ok(start.z>0);assert.ok(start.x>10);assert.equal(start.yaw,Math.PI);
 assert.ok(pass.z< -40);assert.equal(pass.phase,'turn');assert.equal(end.z,-48);assert.equal(end.phase,'combat');assert.equal(end.yaw,Math.PI*2);assert.equal(end.roll,Math.sin(Math.PI)*.65);
});
test('flyby and drift are continuous and mirror across the approach side',()=>{
 const a=pirateEntryPose(2.4-1e-7,1),b=pirateEntryPose(2.4,1);
 for(const key of ['x','y','z','yaw','roll'])assert.ok(Math.abs(a[key]-b[key])<1e-5);
 const left=pirateEntryPose(3.1,-1),right=pirateEntryPose(3.1,1);
 assert.equal(left.x,-right.x);assert.equal(left.roll,-right.roll);assert.equal(left.z,right.z);
});
