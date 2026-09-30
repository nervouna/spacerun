import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScoring} from '../src/scoring.js';
test('confirmed hits within one second grow exponentially, and timeout resets the chain',()=>{
 const s=createScoring();assert.equal(s.hit(17,0),17);assert.equal(s.hit(17,1),19);assert.equal(s.hit(17,1.5),21);
 assert.equal(s.snapshot(1.5).combo,3);assert.equal(s.snapshot(2.6).combo,0);
 assert.equal(s.hit(17,2.6),17);assert.equal(s.snapshot(2.6).score,74);assert.equal(s.snapshot(2.6).maxCombo,3);
});
test('damage deducts points, breaks the chain, and never produces a negative score',()=>{
 const s=createScoring();s.bonus(1000);s.hit(17,0);s.damage(20);
 assert.equal(s.snapshot(.1).score,660);assert.equal(s.snapshot(.1).combo,0);
 assert.equal(s.hit(17,.2),17);s.damage(100);assert.equal(s.snapshot(.2).score,0);
 s.reset();assert.equal(s.snapshot(0).maxCombo,0);assert.equal(s.snapshot(0).score,0);
});
test('sustained chains retain integer awards and a bounded exponential multiplier',()=>{
 const s=createScoring();for(let i=0;i<100;i++)s.hit(17,i*.1);
 assert.equal(s.snapshot(9.9).multiplier,32);assert.equal(s.snapshot(9.9).combo,100);assert.ok(Number.isSafeInteger(s.snapshot(9.9).score));
});
