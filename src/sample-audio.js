const URLS={beam:'/assets/audio/beam-soft-loop.wav',explosion:'/assets/audio/explosion-real.wav'};
export function createSampleAudio({getContext,canPlay,fetcher=fetch}){
 let buffers=null,preparation=null,bus=null,beam=null;
 const voices=new Set();
 // Fetch locally bundled files without starting or unlocking audio.
 const files=Promise.all(Object.entries(URLS).map(async([key,url])=>{const response=await fetcher(url);if(!response.ok)throw new Error(`Audio asset unavailable: ${url}`);return [key,await response.arrayBuffer()];})).catch(()=>null);
 function prepare(){
  if(preparation)return preparation;
  preparation=(async()=>{
   const context=getContext(),data=await files;if(!data)return false;
   buffers=Object.fromEntries(await Promise.all(data.map(async([key,bytes])=>[key,await context.decodeAudioData(bytes)])));
   bus=context.createDynamicsCompressor();bus.threshold.value=-14;bus.ratio.value=5;bus.attack.value=.005;bus.release.value=.18;bus.connect(context.destination);
   return true;
  })().catch(()=>false);
  return preparation;
 }
 function stopBeam(){
  if(!beam)return;
  const current=beam;beam=null;const context=getContext();
  current.gain.gain.setTargetAtTime(.0001,context.currentTime,.018);
  current.source.stop(context.currentTime+.08);
 }
 function updateBeam(active){
  if(!active||!canPlay()){stopBeam();return;}
  if(!buffers){prepare();return;}
  if(beam)return;
  const context=getContext(),source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffers.beam;source.loop=true;
  gain.gain.setValueAtTime(0,context.currentTime);gain.gain.setTargetAtTime(.32,context.currentTime,.025);
  source.connect(gain);gain.connect(bus);
  const current={source,gain};source.onended=()=>{source.disconnect();gain.disconnect();if(beam===current)beam=null;};
  beam=current;source.start();
 }
 function explosion({radius=3,type='rock',pan=0,distance=0}={}){
  if(!canPlay()||!buffers)return false;
  const context=getContext();
  if(voices.size>=6){const oldest=voices.values().next().value;voices.delete(oldest);oldest.source.stop();}
  const source=context.createBufferSource(),gain=context.createGain(),panner=context.createStereoPanner();
  source.buffer=buffers.explosion;
  source.playbackRate.value=(type==='ship'?.82:1.08)+(Math.random()-.5)*.08;
  gain.gain.value=(type==='ship'?.48:Math.min(.4,.22+radius*.035))/(1+distance/160);
  panner.pan.value=Math.max(-.7,Math.min(.7,pan));source.connect(gain);gain.connect(panner);panner.connect(bus);
  const voice={source,gain,panner};voices.add(voice);
  source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();panner.disconnect();};source.start();return true;
 }
 function silence(){stopBeam();for(const voice of voices)voice.source.stop();voices.clear();}
 return {prepare,updateBeam,explosion,silence,snapshot:()=>({ready:!!buffers,beam:!!beam,explosions:voices.size})};
}
