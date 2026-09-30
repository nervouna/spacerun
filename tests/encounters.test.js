import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEncounter,advanceEncounter,finishEncounter,pirateDifficulty} from '../src/encounters.js';
test('warns before the 3 km milestone and waits for both distance and warning time',()=>{
 let e=createEncounter();assert.equal(advanceEncounter(e,2.6,1).phase,'cruise');
 e=advanceEncounter(e,2.7,1);assert.equal(e.phase,'warning');
 e=advanceEncounter(e,3.2,.2);assert.equal(e.phase,'warning');
 e=advanceEncounter(e,3.3,.6);assert.equal(e.phase,'battle');assert.equal(e.stage,1);
});
test('an individual encounter remains in battle until defeated',()=>{
 let e=advanceEncounter(createEncounter(),3,2);
 assert.equal(advanceEncounter(e,12,20),e);
 e=finishEncounter(e);assert.equal(e.nextDistance,6);
 e=advanceEncounter(e,12,.1);assert.equal(e.phase,'warning');
 e=advanceEncounter(e,12,1.7);assert.equal(e.stage,2);assert.equal(e.phase,'battle');
 assert.deepEqual(createEncounter(),{stage:0,nextDistance:3,phase:'cruise',warningTime:0});
});
test('later pirates get faster, attack more often, and remain bounded',()=>{
 const first=pirateDifficulty(1),later=pirateDifficulty(6);
 assert.ok(later.movement>first.movement);assert.ok(later.fireInterval<first.fireInterval);
 assert.equal(first.shieldReward,20);assert.equal(first.reward,1000);
 assert.equal(pirateDifficulty(100).fireInterval,pirateDifficulty(8).fireInterval);
 assert.equal(first.bullets,5);assert.equal(later.bullets,7);
 assert.equal(first.health,72);assert.ok(later.health>first.health);
 assert.equal(first.damage,20);assert.ok(first.fireInterval>=.9);assert.ok(pirateDifficulty(8).fireInterval>=.9);
});
