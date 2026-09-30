import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMusic, MUSIC} from '../src/music.js';
function setup(){
  const decks=[];
  const music=createMusic({random:()=>0,makeAudio:()=>{
    const listeners={};const deck={paused:true,currentTime:0,volume:0,src:'',playCount:0,
      play(){this.playCount++;if(this.fail)return Promise.reject(new Error('blocked'));this.paused=false;return Promise.resolve();},
      pause(){this.paused=true;},load(){},addEventListener(name,fn){listeners[name]=fn;},emit(name){listeners[name]?.();}};
    decks.push(deck);return deck;
  }});
  return {music,decks};
}
test('combat assets share 140 BPM and menu waits for a user gesture',()=>{
  assert.equal(MUSIC.battle.length,3);assert.ok(MUSIC.battle.every(track=>track.bpm===140));
  const {music,decks}=setup();music.update(1);assert.equal(decks[0].playCount,0);
  music.unlock();music.update(1);assert.equal(decks[0].paused,false);assert.ok(decks[0].volume>0);
});
test('combat shuffle plays all three before repeating and never repeats consecutively',()=>{
  const {music,decks}=setup();music.unlock();music.setState({scene:'battle'});
  const played=[music.snapshot().track];
  for(let i=0;i<8;i++){decks[1].emit('ended');played.push(music.snapshot().track);}
  assert.equal(new Set(played.slice(0,3)).size,3);
  for(let i=1;i<played.length;i++)assert.notEqual(played[i],played[i-1]);
});
test('pause and mute preserve position, crossfade stops outgoing music, restart returns to menu',()=>{
  const {music,decks}=setup();music.unlock();music.update(2);
  music.setState({scene:'battle'});music.update(2);assert.equal(decks[0].paused,true);
  decks[1].currentTime=12;music.setState({paused:true});assert.equal(decks[1].paused,true);
  music.setState({paused:false});assert.equal(decks[1].currentTime,12);
  music.setState({muted:true});assert.equal(decks[1].paused,true);
  music.setState({muted:false});assert.equal(decks[1].currentTime,12);
  music.setState({scene:'menu'});music.update(2);assert.equal(decks[1].paused,true);assert.equal(music.snapshot().track,MUSIC.menu.title);
});
test('autoplay rejection can retry on gesture and a late play promise cannot undo mute',async()=>{
  const {music,decks}=setup();decks[0].fail=true;music.unlock();await Promise.resolve();await Promise.resolve();
  assert.equal(music.snapshot().status,'blocked');decks[0].fail=false;music.unlock();await Promise.resolve();
  assert.equal(music.snapshot().status,'playing');
  music.setState({muted:true});await Promise.resolve();assert.equal(decks[0].paused,true);
});


test('late playback resolution respects mute and stale load completion cannot overwrite the next song',async()=>{
  const {music,decks}=setup();
  let finish;decks[0].play=function(){this.paused=false;return new Promise(resolve=>{finish=resolve;});};
  music.unlock();music.setState({muted:true});finish();await Promise.resolve();
  assert.equal(decks[0].paused,true);assert.equal(music.snapshot().status,'muted');
  music.setState({muted:false});
  let rejectOld;decks[1].play=function(){this.paused=false;return new Promise((resolve,reject)=>{rejectOld=reject;});};
  music.setState({scene:'battle'});
  const oldReject=rejectOld;decks[1].play=function(){this.paused=false;return Promise.resolve();};
  music.setState({},true);await Promise.resolve();oldReject(new Error('aborted old source'));await Promise.resolve();await Promise.resolve();
  assert.equal(music.snapshot().status,'playing');
});
