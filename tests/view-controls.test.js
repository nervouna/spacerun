import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createViewControls} from '../src/view-controls.js';
test('drag stays bounded and release smoothly recenters while preserving zoom',()=>{
 const view=createViewControls();view.drag(10000,-10000);view.zoom(-100);
 const first=view.update(.05);assert.ok(first.yaw<0&&first.pitch>0);
 const held=view.update(2);assert.ok(Math.abs(held.yaw)<=.85&&held.pitch<=.4);
 view.release();const returning=view.update(.05);assert.ok(Math.abs(returning.yaw)<Math.abs(held.yaw));assert.notEqual(returning.yaw,0);
 const centered=view.update(3);assert.ok(Math.abs(centered.yaw)<1e-8);assert.equal(centered.zoom,held.zoom);
 for(let i=0;i<50;i++)view.zoom(1000);assert.equal(view.update(0).zoom,1.65);
 for(let i=0;i<50;i++)view.zoom(-1000);assert.equal(view.update(0).zoom,.65);
 view.reset();assert.deepEqual(view.update(0),{yaw:0,pitch:0,zoom:1});
});
