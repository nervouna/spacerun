import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSampleAudio} from '../src/sample-audio.js';
function setup(){
 let allowed=true;const sources=[];
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){}});
 const node=()=>({connect(){},disconnect(){}});
 const context={currentTime:0,destination:{},decodeAudioData:async()=>({}),
  createDynamicsCompressor:()=>({...node(),threshold:param(),ratio:param(),attack:param(),release:param()}),
  createGain:()=>({...node(),gain:param()}),createStereoPanner:()=>({...node(),pan:param()}),
  createBufferSource(){const source={...node(),playbackRate:param(),start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;}};
 const player=createSampleAudio({getContext:()=>context,canPlay:()=>allowed,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 return {player,sources,mute(){allowed=false;}};
}
test('sample beam is one loop, fades on release, and can restart',async()=>{
 const {player,sources}=setup();assert.equal(await player.prepare(),true);
 player.updateBeam(true);player.updateBeam(true);assert.equal(sources.length,1);assert.equal(sources[0].loop,true);
 player.updateBeam(false);assert.equal(sources[0].stopped,true);assert.equal(player.snapshot().beam,false);
 player.updateBeam(true);assert.equal(sources.length,2);player.silence();assert.equal(sources[1].stopped,true);
});
test('explosions vary by type, remain bounded, and respect mute',async()=>{
 const {player,sources,mute}=setup();await player.prepare();
 player.explosion({type:'ship'});assert.ok(sources[0].playbackRate.value<.9);
 for(let i=0;i<8;i++)player.explosion({type:'rock'});
 assert.equal(player.snapshot().explosions,6);assert.equal(sources[0].stopped,true);
 mute();assert.equal(player.explosion(),false);player.silence();assert.equal(player.snapshot().explosions,0);
});
test('muting ends an active beam and missing assets do not start playback',async()=>{
 const {player,sources,mute}=setup();await player.prepare();player.updateBeam(true);mute();player.updateBeam(true);assert.equal(sources[0].stopped,true);
 const failed=createSampleAudio({getContext:()=>({}),canPlay:()=>true,fetcher:async()=>({ok:false})});
 assert.equal(await failed.prepare(),false);assert.equal(failed.explosion(),false);
});
