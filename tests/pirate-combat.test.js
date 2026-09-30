import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPirateMotion,volleyDirections} from '../src/pirate-combat.js';
import {pirateDifficulty} from '../src/encounters.js';
import * as THREE from 'three';
function path(stage){const motion=createPirateMotion(1234),position={x:0,y:0},points=[];let length=0;for(let i=0;i<400;i++){const next=motion.update(.05,position,{x:0,y:0},pirateDifficulty(stage));length+=Math.hypot(next.x-position.x,next.y-position.y);assert.ok(Math.abs(next.x)<=13&&next.y>=-6&&next.y<=8);assert.ok(Math.hypot(next.x-position.x,next.y-position.y)<=pirateDifficulty(stage).travelSpeed*.05+1e-8);position.x=next.x;position.y=next.y;points.push({...position});}return {points,length};}
test('stage thresholds enable irregular movement, faster pursuit, then vertical spread',()=>{
 assert.equal(pirateDifficulty(2).irregular,false);assert.equal(pirateDifficulty(3).irregular,true);
 assert.equal(pirateDifficulty(4).travelSpeed,8);assert.equal(pirateDifficulty(5).travelSpeed,12);
 assert.equal(pirateDifficulty(7).verticalSpread,0);assert.equal(pirateDifficulty(8).verticalSpread,.16);
 assert.equal(pirateDifficulty(39).travelSpeed,pirateDifficulty(8).travelSpeed);
});
test('irregular motion remains continuous and bounded, with a measurable stage-five speed increase',()=>{
 const third=path(3),fifth=path(5);assert.ok(fifth.length>third.length*1.2);
 assert.deepEqual(path(3).points,third.points);
 const xs=third.points.map(p=>p.x);assert.ok(xs.some((x,i)=>i>0&&x>xs[i-1]));assert.ok(xs.some((x,i)=>i>0&&x<xs[i-1]));
});
test('stage eight adds three vertical rows while preserving aimed and horizontal shots',()=>{
 const origin=new THREE.Vector3(0,0,-48),target=new THREE.Vector3();
 const flat=volleyDirections(origin,target,pirateDifficulty(7)),spread=volleyDirections(origin,target,pirateDifficulty(8));
 assert.equal(flat.length,7);assert.ok(flat.every(v=>v.y===0));assert.equal(spread.length,21);
 assert.ok(spread.some(v=>v.y>.1));assert.ok(spread.some(v=>v.y<-.1));assert.ok(spread.some(v=>v.x===0&&v.y===0));
 assert.ok(spread.every(v=>Math.abs(v.length()-1)<1e-9&&v.z>0));
});
