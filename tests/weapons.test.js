import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWeaponCycle,WEAPONS} from '../src/weapons.js';
function run(id,held,duration){const cycle=createWeaponCycle(),events=[];for(let i=0;i<duration*1000;i++)if(cycle.update(.001,held(i/1000),id))events.push(i/1000);return events;}
test('interceptor retains its 150 ms paired-shot cadence',()=>{const t=run('A',()=>true,1);assert.equal(t.length,7);assert.ok(Math.abs(t[1]-.15)<.002);});
test('heavy cannon completes three rounds after a tap and leaves a burst gap',()=>{const t=run('B',t=>t<.01,1);assert.equal(t.length,3);assert.ok(Math.abs(t[1]-.085)<.002);const held=run('B',()=>true,1);assert.equal(held.length,6);assert.ok(held[3]-held[2]>.47);});
test('beam has timed damage pulses, stops on release, and resets cleanly',()=>{const cycle=createWeaponCycle();assert.equal(cycle.update(0,true,'C'),true);assert.equal(cycle.update(.05,true,'C'),false);assert.equal(cycle.update(.05,false,'C'),false);cycle.reset();assert.equal(cycle.update(0,true,'A'),true);assert.equal(WEAPONS.C.damage,.65);});
