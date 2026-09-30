export const MUSIC={
  menu:{title:'Orbital Graveyard',artist:'vitalezzz',src:'/assets/music/orbital-graveyard.mp3'},
  battle:[
    {title:'Hard Battle 2',artist:'MintoDog',bpm:140,src:'/assets/music/hard-battle-2-140.mp3'},
    {title:'Trance Battle',artist:'MintoDog',bpm:140,src:'/assets/music/trance-battle-140.mp3'},
    {title:'Space Battle',artist:'MintoDog',bpm:140,src:'/assets/music/space-battle-140.mp3'},
  ],
};

// Two streaming decks let menu and combat music fade without decoding whole songs.
export function createMusic({makeAudio=()=>new Audio(),random=Math.random,onChange=()=>{}}={}){
  const menu=makeAudio(),battle=makeAudio(),decks=[menu,battle];
  let scene='menu',paused=false,muted=false,unlocked=false,bag=[],lastTrack=null,track=MUSIC.menu,status='waiting';
  for(const deck of decks){deck.preload='auto';deck.volume=0;deck.pending=false;deck.generation=0;}
  menu.src=MUSIC.menu.src;menu.loop=true;battle.loop=false;
  function report(){onChange(snapshot());}
  function snapshot(){return {scene,track:track.title,bpm:track.bpm??null,muted,paused,status};}
  function active(){return scene==='menu'?menu:battle;}
  function wanted(deck){return unlocked&&!muted&&!paused&&(deck===active()||deck.volume>0);}
  function play(deck){
    if(!wanted(deck)||!deck.paused||deck.pending)return;
    deck.pending=true;const generation=deck.generation;
    Promise.resolve(deck.play()).then(()=>{
      if(generation!==deck.generation)return;
      deck.pending=false;
      if(!wanted(deck))deck.pause();
      else if(deck===active()){status='playing';report();}
    }).catch(error=>{
      if(generation!==deck.generation)return;
      deck.pending=false;
      if(deck===active()&&!paused&&!muted){status=error.name==='NotSupportedError'?'unavailable':'blocked';report();}
    });
  }
  function nextTrack(){
    if(!bag.length){
      bag=[...MUSIC.battle];
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag[0]===lastTrack)[bag[0],bag[1]]=[bag[1],bag[0]];
    }
    lastTrack=bag.shift();return lastTrack;
  }
  function startBattle(){
    battle.generation++;battle.pending=false;battle.pause();battle.volume=0;track=nextTrack();battle.src=track.src;battle.load();
    status=unlocked?'loading':'waiting';play(battle);report();
  }
  battle.addEventListener('ended',()=>{if(scene==='battle')startBattle();});
  for(const deck of decks)deck.addEventListener('error',()=>{if(deck===active()){status='unavailable';report();}});
  function setState(next={},restart=false){
    const oldScene=scene,oldPaused=paused,oldMuted=muted;
    scene=next.scene??scene;paused=next.paused??paused;muted=next.muted??muted;
    if(scene!==oldScene||restart){
      if(scene==='battle')startBattle();
      else{track=MUSIC.menu;menu.currentTime=0;status=unlocked?'loading':'waiting';}
    }
    if(muted||paused){for(const deck of decks)deck.pause();status=muted?'muted':'paused';}
    else if(scene!==oldScene||restart||oldPaused||oldMuted){play(active());}
    report();
  }
  function unlock(){unlocked=true;play(active());report();}
  function update(dt){
    if(muted||paused)return;
    for(const deck of decks){
      const target=deck===active()?.38:0;
      const step=Math.min(1,Math.max(0,dt)/.8);
      deck.volume+=Math.sign(target-deck.volume)*Math.min(Math.abs(target-deck.volume),step*.38);
      if(target===0&&deck.volume<.001){deck.volume=0;deck.pause();}
    }
  }
  report();return {setState,unlock,update,snapshot};
}
