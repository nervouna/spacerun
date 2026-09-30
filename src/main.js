import {createMusic} from './music.js';
import {createSampleAudio} from './sample-audio.js';
import {WEAPONS,createWeaponCycle} from './weapons.js';
import {createWeaponEffects} from './weapon-effects.js';
import * as THREE from 'three';
import './style.css';
import { createFlightEffects } from './flight-effects.js';
import { createExplosions } from './explosions.js';
import { createPirateFleet, FINAL_STAGE } from './pirate-fleet.js';
import { createScoring } from './scoring.js';
import { FIGHTERS, createFighter } from './fighters.js';
import { projectAimOffset } from './aim-projection.js';
import { createViewControls } from './view-controls.js';
import { createImpactFeedback } from './impacts.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addWreckage } from './wasteland.js';
import { clamp, segmentHitsSphere, segmentSphereDistance, updateEnergy } from './physics.js';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x21170f, 0.0011);
const flightEffects=createFlightEffects(scene);
const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, .1, 1800);
camera.position.set(0,5,19);
camera.lookAt(0,1,-35);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
} catch {
  $('launch').innerHTML='<p>无法启动 3D 画面，请使用支持 WebGL 2 的浏览器，并开启硬件加速。</p>';
  throw new Error('WebGL 2 unavailable');
}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
$('game').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x9bafba,0x2b1811,1.6));
const sun=new THREE.DirectionalLight(0xffb675,4.2);sun.position.set(-30,15,-55);scene.add(sun);
const rim=new THREE.DirectionalLight(0x87b5ce,2.2);rim.position.set(10,6,15);scene.add(rim);

// All assets are bundled locally; rendering makes no third-party asset requests.
let seed=7391;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
scene.background=new THREE.Color(0x100d0b);
const loader=new THREE.TextureLoader();
loader.load('/assets/wasteland-nebula.png', t=>{t.colorSpace=THREE.SRGBColorSpace;scene.background=t;});
function loadMap(name,color=false) {
  const t=loader.load(`/assets/${name}.jpg`);
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return t;
}
const metalColor=loadMap('metal-color',true),metalNormal=loadMap('metal-normal'),metalRoughness=loadMap('metal-roughness');
function loadFighterMap(name){const t=loader.load(`/assets/fighters/${name}.png`);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
const fighterEnvironment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
const fighterSteel=loadFighterMap('steel-albedo'),fighterPaint=loadFighterMap('ochre-albedo');
const rockColor=loadMap('rock-color',true),rockNormal=loadMap('rock-normal'),rockRoughness=loadMap('rock-roughness');
const planet=new THREE.Mesh(new THREE.SphereGeometry(54,64,48),new THREE.MeshStandardMaterial({map:loadMap('moon-color',true),color:0xc3ad91,roughness:1}));
planet.position.set(-105,60,-340);planet.rotation.z=.3;scene.add(planet);
const wreckage=addWreckage(scene,metalColor);
const composer=new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio,1.5));
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.42,.55,1.25));
composer.addPass(new OutputPass());
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(55,48,32),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{color:{value:new THREE.Color(0xd3ae82)}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 color;void main(){float a=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(color,a*.2);}'}));
atmosphere.position.copy(planet.position);scene.add(atmosphere);
const starCount=950,starPositions=new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){starPositions[i*3]=(random()-.5)*500;starPositions[i*3+1]=(random()-.5)*280;starPositions[i*3+2]=-random()*600;}
const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
const stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xb9c6ca,size:.3,transparent:true,opacity:.4,sizeAttenuation:true}));scene.add(stars);

const ship=new THREE.Group();
const fighterModels=Object.fromEntries(FIGHTERS.map(f=>[f.id,createFighter(f.id,{metalColor,metalNormal,metalRoughness,fighterSteel,fighterPaint,fighterEnvironment})]));
let selectedFighter='A';
for(const model of Object.values(fighterModels)){ship.add(model.group);model.group.visible=model.id===selectedFighter;}
function selectFighter(id){
  if(!fighterModels[id])return;
  selectedFighter=id;
  for(const model of Object.values(fighterModels))model.group.visible=model.id===id;
  for(const button of $('fighter-options').children){const selected=button.dataset.fighter===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
  const fighter=FIGHTERS.find(f=>f.id===id);
  $('selected-fighter').textContent=`${id} · ${fighter.name} / ${WEAPONS[id].name}`;
  $('ship-model').textContent=`SR–${id}`;
}
for(const fighter of FIGHTERS){
  const button=document.createElement('button');button.type='button';button.className='fighter-card';button.dataset.fighter=fighter.id;
  button.setAttribute('aria-label',`${fighter.id} ${fighter.name}`);button.setAttribute('aria-pressed',String(fighter.id===selectedFighter));
  button.innerHTML=`<img src="${fighter.image}" alt="${fighter.name}概念图"><span class="fighter-title"><b>${fighter.id}</b> ${fighter.name}</span><small>${fighter.description}<br>${WEAPONS[fighter.id].name}</small>`;
  button.addEventListener('click',()=>{if(state==='ready'){releaseView();viewControls.reset();selectFighter(fighter.id);}});
  $('fighter-options').appendChild(button);
}
selectFighter('A');
ship.position.set(0,-1.6,0);scene.add(ship);
const shipFill=new THREE.PointLight(0xffe5c1,3.5,20,2);scene.add(shipFill);
const engineLight=new THREE.PointLight(0x77bbff,5,10);engineLight.position.set(0,-1,4);scene.add(engineLight);

const asteroidMaterial=new THREE.MeshStandardMaterial({map:rockColor,normalMap:rockNormal,normalScale:new THREE.Vector2(1.1,1.1),roughnessMap:rockRoughness,color:0xa89a83,roughness:1});
const asteroidGeometries=[];
for(let j=0;j<8;j++){
  const g=new THREE.IcosahedronGeometry(1,4),p=g.attributes.position;
  // Equal vertices get equal displacement so the surface stays watertight.
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const d=1+.15*Math.sin(x*4+j)*Math.cos(y*3+j)+.11*Math.sin(z*5+j*2)+.026*Math.sin(x*19+y*13+z*17+j);
    p.setXYZ(i,x*d,y*d,z*d);
  }
  g.computeVertexNormals();asteroidGeometries.push(g);
}
const rocks=[],shots=[];
const explosions=createExplosions(scene,camera,asteroidMaterial);
const impacts=createImpactFeedback(scene,ship);
const weaponCycle=createWeaponCycle(),weaponEffects=createWeaponEffects(scene);
const projectileAssets=Object.fromEntries(['A','B'].map(id=>{const w=WEAPONS[id],geometry=new THREE.CylinderGeometry(w.radius,w.radius,w.length,8);geometry.rotateX(Math.PI/2);return [id,{geometry,material:new THREE.MeshBasicMaterial({color:new THREE.Color(w.color).multiplyScalar(4)})}];}));
let recoil=0;
const viewControls=createViewControls();
let dragPointer=null,lastPointerX=0,lastPointerY=0;
function releaseView(){
  const pointer=dragPointer;dragPointer=null;viewControls.release();
  if(pointer!==null&&renderer.domElement.hasPointerCapture(pointer))renderer.domElement.releasePointerCapture(pointer);
}
renderer.domElement.style.touchAction='none';
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0||dragPointer!==null||!['ready','playing'].includes(state))return;
  dragPointer=e.pointerId;lastPointerX=e.clientX;lastPointerY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(e.pointerId!==dragPointer)return;
  viewControls.drag(e.clientX-lastPointerX,e.clientY-lastPointerY);lastPointerX=e.clientX;lastPointerY=e.clientY;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{if(e.pointerId===dragPointer)releaseView();});
renderer.domElement.addEventListener('wheel',e=>{
  if(!['ready','playing'].includes(state))return;
  e.preventDefault();viewControls.zoom(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));
},{passive:false});
window.addEventListener('blur',releaseView);
const scoring=createScoring();
let pirateKills=0,lastPenalty=0;
let state='ready',previousState='ready',elapsed=0,distance=0,kills=0,score=0,shield=100,energy=100,speed=0,spawnTimer=0,invulnerable=0,boostLocked=false,best=0;
const pirates=createPirateFleet(scene,{metalColor,metalNormal,metalRoughness,explode,tone,onDamage:damageShip,onHit:(position,damage)=>{scoring.hit(Math.round(17*damage),elapsed);score=scoring.snapshot(elapsed).score;impacts.enemyHit(position);tone(260,.045,.028,'triangle',100);},onVictory:d=>{
  pirateKills++;scoring.bonus(d.reward);score=scoring.snapshot(elapsed).score;shield=Math.min(100,shield+d.shieldReward);tone(450,.3,.045,'triangle',800);
}});
function damageShip(amount,position){
  if(state!=='playing'||invulnerable>0)return;
  scoring.damage(amount);const before=score;score=scoring.snapshot(elapsed).score;lastPenalty=before-score;
  shield=Math.max(0,shield-amount);invulnerable=1.5;
  impacts.playerHit(position,amount);tone(85,.24,.09,'sawtooth',35);
  if(shield===0){explode(ship.position,3,'ship');gameOver();}
}
try{best=Number(localStorage.getItem('spacerun-best-v2'))||0;}catch{}
$('best').textContent=String(best).padStart(6,'0');
const keys=new Set();
let muted=false,audio;
function audioContext(){audio??=new AudioContext();if(audio.state==='suspended')audio.resume();return audio;}
const sampleAudio=createSampleAudio({getContext:audioContext,canPlay:()=>!muted});
const music=createMusic({onChange:info=>{
  $('music-label').textContent=info.muted?'声音已关闭':`♪ ${info.track}${info.bpm?' · '+info.bpm+' BPM':''}${info.paused?' · 暂停':''}`;
  $('sound').dataset.musicStatus=info.status;
  $('sound').dataset.musicTrack=info.track;
  $('sound').dataset.musicBpm=info.bpm??'';
  $('sound').title=`${muted?'开启声音':'关闭声音'} · ${info.track}${info.bpm?' · '+info.bpm+' BPM':''}`;
}});
function syncMusic(restart=false){music.setState({scene:state==='ready'?'menu':'battle',paused:document.hidden||!$('overlay').hidden,muted},restart);}
function unlockSound(){
  if(muted)return;
  music.unlock();
  try{audioContext();sampleAudio.prepare().then(ready=>$('sound').dataset.audioStatus=ready?'ready':'unavailable');}catch{}
}
// Retry blocked autoplay only during a real user gesture.
window.addEventListener('pointerdown',event=>{if(!event.target.closest('#sound'))unlockSound();},{capture:true});
window.addEventListener('keydown',unlockSound,{capture:true});
function tone(frequency,duration,volume,type='sine',end=frequency){
  if(muted)return;
  try{
    audio??=new AudioContext();if(audio.state==='suspended')audio.resume();
    const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(end,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
  }catch{}
}
function spawnRock(z=-260,initial=false){
  const r=1.3+random()*3.1;
  const m=new THREE.Mesh(asteroidGeometries[Math.floor(random()*8)],asteroidMaterial);
  const aim=!initial&&random()<.4;
  m.position.set(aim?ship.position.x+(random()-.5)*9:(random()-.5)*70,aim?ship.position.y+(random()-.5)*9:(random()-.5)*38,z);
  m.scale.set(r,r*(.8+random()*.4),r);m.rotation.set(random()*6,random()*6,random()*6);
  scene.add(m);rocks.push({mesh:m,radius:r,beamArmor:3+r*.7,spin:(random()-.5)*.5});
}
for(let i=0;i<30;i++)spawnRock(-25-i*13,true);
function removeRock(i){scene.remove(rocks[i].mesh);rocks.splice(i,1);}
function explode(position,radius,type='rock'){
  explosions.burst(position,radius,type);
  sampleAudio.explosion({radius,type,pan:(position.x-ship.position.x)/25,distance:position.distanceTo(ship.position)});
}
function shoot(){
  const w=WEAPONS[selectedFighter],asset=projectileAssets[selectedFighter];
  for(const mount of fighterModels[selectedFighter].firePoints){
    const m=new THREE.Mesh(asset.geometry,asset.material);m.position.copy(ship.localToWorld(mount.clone()));scene.add(m);shots.push({mesh:m,previous:m.position.clone(),life:2,speed:w.speed,damage:w.damage,radius:w.radius});
  }
  weaponEffects.fire(selectedFighter==='B');recoil=selectedFighter==='B'?.065:.012;
  if(selectedFighter==='B'){tone(115,.11,.045,'sawtooth',38);tone(720,.028,.02,'square',120);}
  else tone(680,.07,.022,'triangle',180);
}
function beamSound(active){sampleAudio.updateBeam(active);}
function beamPaths(damagePulse){
  return fighterModels.C.firePoints.map(mount=>{
    const start=ship.localToWorld(mount.clone()),end=start.clone().add(new THREE.Vector3(0,0,-WEAPONS.C.range));
    let contact=pirates.trace(start,end),target=null;
    for(const rock of rocks){const distance=segmentSphereDistance(start,end,rock.mesh.position,rock.radius+.12);if(distance!==null&&(!contact||distance<contact.distance)){contact={distance};target=rock;}}
    if(contact){end.z=start.z-contact.distance;
      if(damagePulse){
        if(target){target.beamArmor-=WEAPONS.C.damage;impacts.enemyHit(end);if(target.beamArmor<=0){explode(target.mesh.position,target.radius);removeRock(rocks.indexOf(target));kills++;scoring.hit(137+Math.round(target.radius*13),elapsed);}else scoring.hit(7,elapsed);score=scoring.snapshot(elapsed).score;}
        else pirates.hit(start,start.clone().add(new THREE.Vector3(0,0,-WEAPONS.C.range)),WEAPONS.C.damage);
      }
    }
    return {end,contact:!!contact};
  });
}
function reset(ready=false){
  releaseView();viewControls.reset();scoring.reset();weaponCycle.reset();weaponEffects.clear();sampleAudio.silence();recoil=0;pirateKills=lastPenalty=0;
  for(const a of rocks)scene.remove(a.mesh);rocks.length=0;
  for(const a of shots)scene.remove(a.mesh);shots.length=0;
  explosions.clear();pirates.clear();impacts.clear();
  elapsed=distance=kills=score=0;shield=energy=100;speed=ready?0:42;spawnTimer=invulnerable=0;boostLocked=false;
  aimX=aimY=0;
  ship.position.set(0,-1.6,0);ship.rotation.set(0,0,0);ship.visible=true;keys.clear();
  for(let i=0;i<24;i++)spawnRock(-70-i*13,true);
  // One opening target makes the firing mechanic discoverable.
  spawnRock(-72,true);rocks.at(-1).mesh.position.set(0,-1.6,-72);
  cameraBase.set(ship.position.x*.34,ready?5:10,ready?19:31);
  $('launch-ship').textContent=FIGHTERS.find(f=>f.id===selectedFighter).name;
  state=previousState=ready?'ready':'playing';$('launch').hidden=!ready;$('overlay').hidden=true;$('results').hidden=true;$('help-content').hidden=true;updateHUD();syncMusic(!ready);
}
function showDialog(mode){
  releaseView();weaponCycle.reset();weaponEffects.clear();sampleAudio.silence();
  keys.clear();previousState=state;if(state==='playing')state='paused';
  $('dialog-restart').hidden=previousState==='ready';
  $('overlay').hidden=false;$('results').hidden=true;$('help-content').hidden=mode!=='help';
  $('dialog-kicker').textContent=mode==='help'?'FLIGHT MANUAL':'FLIGHT PAUSED';
  $('dialog-title').textContent=mode==='help'?'飞行指南':'航行已暂停';
  $('dialog-description').textContent=mode==='help'?'穿过小行星带，找到属于你的航线。':'深呼吸，星空会等你。';
  $('resume').textContent=previousState==='ready'?'准备出击 ↗':previousState==='over'?'再次出击 ↗':'继续航行 ↗';syncMusic();
}
function resume(){
  $('overlay').hidden=true;
  if(previousState==='over'){reset();return;}
  state=previousState==='ready'?'ready':'playing';keys.clear();syncMusic();
}
function gameOver(completed=false){
  releaseView();
  state='over';previousState='over';ship.visible=completed;speed=0;updateHUD();
  if(score>best){best=score;try{localStorage.setItem('spacerun-best-v2',String(best));}catch{}}
  $('best').textContent=String(best).padStart(6,'0');
  $('overlay').hidden=false;$('results').hidden=false;$('help-content').hidden=true;
  $('dialog-kicker').textContent=completed?'MISSION COMPLETE':'MISSION ENDED';$('dialog-title').textContent=completed?'十轮激战，荒域肃清':'星尘中，再次出发';$('dialog-description').textContent=completed?'全部 10 轮海盗已击败。最终得分已结算。':'护盾耗尽。本次航行已结束。';
  $('results').innerHTML=`<div>本次得分<strong>${score}</strong></div><div>击碎小行星<strong>${kills}</strong></div><div>航程 / KM<strong>${distance.toFixed(1)}</strong></div><div>击败海盗<strong>${pirateKills} / ${FINAL_STAGE}</strong></div><div>最高连击<strong>${scoring.snapshot(elapsed).maxCombo}</strong></div>`;
  $('resume').textContent='再次出击 ↗';$('dialog-restart').hidden=false;keys.clear();weaponCycle.reset();weaponEffects.clear();beamSound(false);syncMusic();
}
$('start').addEventListener('click',()=>reset());
function returnToHangar(){reset(true);}
$('restart').addEventListener('click',returnToHangar);
$('dialog-restart').addEventListener('click',returnToHangar);
$('resume').addEventListener('click',resume);
$('pause').addEventListener('click',()=>{if(state==='paused')resume();else if(state!=='over')showDialog('pause');});
$('help').addEventListener('click',()=>{if(!$('overlay').hidden) return;showDialog('help');});
$('sound').addEventListener('click',()=>{
  muted=!muted;$('sound').setAttribute('aria-label',muted?'开启声音':'关闭声音');
  $('sound-wave').setAttribute('d',muted?'m16 9 6 6m0-6-6 6':'M15 8q5 4 0 8m3-11q8 7 0 14');
  syncMusic();if(!muted){unlockSound();tone(520,.15,.04);}else sampleAudio.silence();
});
window.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','Escape','Enter'].includes(e.code))e.preventDefault();
  if(e.repeat&&['Escape','Enter'].includes(e.code))return;
  if(e.code==='Enter'){if(state==='ready')reset();else if(!$('overlay').hidden)resume();return;}
  if(e.code==='Escape'){if(state==='playing'||state==='ready')showDialog('pause');else if(state==='paused')resume();return;}
  if(state==='playing'){
    keys.add(e.code);
  }
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')showDialog('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')showDialog('pause');syncMusic();});
for(let i=0;i<20;i++)$('shield-bars').appendChild(document.createElement('i'));
function updateHUD(){
  $('score').textContent=String(score).padStart(6,'0');$('kills').textContent=String(kills).padStart(2,'0');$('distance').textContent=`${distance.toFixed(1)}`;
  const points=scoring.snapshot(elapsed);
  $('combo').textContent=points.combo>1?`${points.combo} 连击 · ×${points.multiplier.toFixed(2)}`:'命中间隔 ≤ 1 秒，延续连击';
  $('combo').classList.toggle('active',points.combo>1);
  $('score').style.fontSize=`${Math.min(52,312/Math.max(6,String(score).length))}px`;
  $('route-progress').style.width=`${pirateKills/FINAL_STAGE*100}%`;
  $('round-progress').textContent=`海盗击败 ${pirateKills} / ${FINAL_STAGE}`;
  $('shield-value').innerHTML=`${shield}<small>%</small>`;
  [...$('shield-bars').children].forEach((bar,i)=>{bar.classList.toggle('empty',i>=shield/5);bar.style.background=shield<=25&&i<shield/5?'#ef9d78':'';});
  $('boost-fill').style.width=`${energy}%`;$('boost-value').textContent=`${Math.round(energy)}%`;
  $('speed').textContent=state==='ready'?'0':String(Math.round(speed*12));
  $('pause').querySelector('span').textContent=state==='paused'?'继续':'暂停';
  const encounter=pirates.snapshot();
  $('stage-number').textContent=String(Math.max(1,encounter.stage)).padStart(2,'0');
  $('encounter-panel').classList.toggle('hostile',encounter.phase!=='cruise');
  $('pirate-health').hidden=encounter.phase!=='battle';
  $('pirate-health-fill').style.width=encounter.maxHealth?`${encounter.health/encounter.maxHealth*100}%`:'0%';
  $('pirate-health-value').textContent=`${Math.ceil(encounter.health)} / ${encounter.maxHealth}`;
  $('encounter-label').textContent=encounter.victory&&encounter.activeCount===0?'海盗已击败 · 赏金已入账 · 护盾 +20%':encounter.phase==='warning'?'危险接近 · 太空海盗即将进入航道':encounter.phase==='battle'?`海盗 ${encounter.activeCount} 艘 / 第 ${encounter.stage} 阶段${encounter.entryPhase==='flyby'?' · 侧后方突入':encounter.entryPhase==='turn'?' · 漂移调头':encounter.warning?' · 增援接近':encounter.charging?' · 武器充能，准备躲避':''}`:encounter.nextDistance===null?'最终围攻 · 清除剩余海盗':`下一遭遇 · ${encounter.nextDistance.toFixed(1)} KM`;
  $('encounter-panel').classList.toggle('victory',encounter.victory);

}
const radarContext=$('radar').getContext('2d');
function drawRadar(time){
  const c=radarContext;c.clearRect(0,0,180,180);
  c.save();c.translate(90,90);c.beginPath();c.arc(0,0,88,0,Math.PI*2);c.clip();
  c.rotate(time*.5);const g=c.createConicGradient(0,0,0);g.addColorStop(0,'#b9f3d100');g.addColorStop(.86,'#b9f3d100');g.addColorStop(1,'#b9f3d130');c.fillStyle=g;c.fillRect(-90,-90,180,180);c.rotate(-time*.5);
  for(const r of rocks){const x=(r.mesh.position.x-ship.position.x)*1.6,y=r.mesh.position.z*.26;if(Math.hypot(x,y)>85)continue;c.fillStyle=r.mesh.position.z>-45?'#e9b78b':'#a3c6b0';c.beginPath();c.arc(x,y,r.radius>.0?2:1,0,Math.PI*2);c.fill();}
  const pirate=pirates.snapshot();
  for(const position of pirate.positions){const x=(position.x-ship.position.x)*1.6,y=position.z*.26;c.strokeStyle='#ff6857';c.lineWidth=2;c.strokeRect(x-4,y-4,8,8);}
  c.restore();
}
let last=performance.now(),hudTimer=0,visualTime=0,aimX=0,aimY=0;
const desiredCamera=new THREE.Vector3();
const cameraBase=camera.position.clone();
const aimReferenceCamera=camera.clone(),aimPoint=new THREE.Vector3();
const viewRotation=new THREE.Euler(0,0,0,'YXZ'),viewOffset=new THREE.Vector3(),viewTarget=new THREE.Vector3(),viewPosition=camera.position.clone();
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;music.update(dt);
  if(state!=='paused'&&state!=='over')visualTime+=dt;
  let boosting=false,weaponPulse=false;
  if(state==='playing'){
    elapsed+=dt;invulnerable=Math.max(0,invulnerable-dt);spawnTimer-=dt;
    const wantsBoost=keys.has('ShiftLeft')||keys.has('ShiftRight');
    if(!wantsBoost)boostLocked=false;
    const b=updateEnergy(energy,wantsBoost&&!boostLocked,dt);energy=b.energy;boosting=b.boosting;
    if(energy===0)boostLocked=true;
    speed=THREE.MathUtils.damp(speed,boosting?100:42,4,dt);distance+=speed*dt/350;
    if(state==='playing'){
    const horizontal=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const vertical=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    ship.position.x=clamp(ship.position.x+horizontal*14*dt,-18,18);ship.position.y=clamp(ship.position.y+vertical*11*dt,-9,11);
    ship.rotation.z=THREE.MathUtils.damp(ship.rotation.z,-horizontal*.36,7,dt);
    recoil=THREE.MathUtils.damp(recoil,0,15,dt);
    ship.rotation.x=THREE.MathUtils.damp(ship.rotation.x,vertical*.15+recoil,12,dt);
    ship.rotation.y=THREE.MathUtils.damp(ship.rotation.y,-horizontal*.1,7,dt);
    weaponPulse=weaponCycle.update(dt,keys.has('Space'),selectedFighter);
    if(weaponPulse&&selectedFighter!=='C')shoot();
    const wasBusy=pirates.busy;
    pirates.update(dt,distance,ship.position);
    if(!wasBusy&&pirates.busy){
      for(let i=rocks.length-1;i>=0;i--)if(rocks[i].mesh.position.z< -70&&Math.abs(rocks[i].mesh.position.x)<18)removeRock(i);
    }
    if(state==='playing'&&spawnTimer<=0){spawnRock(-260,pirates.busy);spawnTimer=pirates.busy?2.8:Math.max(.2,.65-elapsed*.002);}
    for(let i=rocks.length-1;state==='playing'&&i>=0;i--){
      const r=rocks[i],old=r.mesh.position.clone();r.mesh.position.z+=speed*dt;r.mesh.rotation.x+=r.spin*dt;r.mesh.rotation.y+=r.spin*dt*.7;
      if(invulnerable===0&&segmentHitsSphere(old,r.mesh.position,ship.position,r.radius+1.05)){
        explode(r.mesh.position,r.radius);removeRock(i);damageShip(25,old);
      }else if(r.mesh.position.z>30)removeRock(i);
    }
    for(let i=shots.length-1;state==='playing'&&i>=0;i--){
      const s=shots[i];s.previous.copy(s.mesh.position);s.mesh.position.z-=s.speed*dt;s.life-=dt;let hit=false;
      for(let j=rocks.length-1;j>=0;j--){const r=rocks[j];if(segmentHitsSphere(s.previous,s.mesh.position,r.mesh.position,r.radius+s.radius+.13)){explode(r.mesh.position,r.radius);removeRock(j);kills++;scoring.hit(137+Math.round(r.radius*13),elapsed);score=scoring.snapshot(elapsed).score;impacts.enemyHit(r.mesh.position);hit=true;break;}}
      if(!hit)hit=pirates.hit(s.previous,s.mesh.position,s.damage);
      if(hit||s.life<=0){scene.remove(s.mesh);shots.splice(i,1);}
    }
    ship.visible=state==='playing';
    }
  }
  const beaming=state==='playing'&&selectedFighter==='C'&&keys.has('Space');
  const paths=beaming?beamPaths(weaponPulse):null;
  if(state==='playing'&&pirates.snapshot().completed)gameOver(true);
  const mounts=fighterModels[selectedFighter].firePoints.map(m=>ship.localToWorld(m.clone()));
  weaponEffects.update(state==='paused'?0:dt,mounts,state==='playing'?paths:null,visualTime);beamSound(beaming&&state==='playing');
  if(state==='ready'){
    ship.position.y=-1.6+Math.sin(visualTime*.8)*.12;ship.rotation.z=Math.sin(visualTime*.6)*.035;
    for(const r of rocks){r.mesh.rotation.y+=dt*r.spin*.2;}
  }
  if(state==='playing'||state==='ready'){
    wreckage.update(dt,state==='playing'?speed:1);
    for(let i=0;i<starCount;i++){starPositions[i*3+2]+=dt*(state==='playing'?speed*.6:1);if(starPositions[i*3+2]>20)starPositions[i*3+2]=-600;}
    starsGeometry.attributes.position.needsUpdate=true;
    for(const f of fighterModels[selectedFighter].flames)f.scale.y=(boosting?2:1)*(1+Math.sin(visualTime*50)*.08);
    engineLight.position.set(ship.position.x,ship.position.y,4);shipFill.position.set(ship.position.x-3,ship.position.y+5,ship.position.z+4);
    const departure=state==='playing'?Math.pow(Math.max(0,1-elapsed/3.2),2):0;
    desiredCamera.set(ship.position.x*.34,5+ship.position.y*.24+departure*5,(boosting?21:19)+departure*12);cameraBase.lerp(desiredCamera,1-Math.exp(-dt*3));camera.position.copy(cameraBase);
    camera.fov=THREE.MathUtils.damp(camera.fov,boosting?68:58,3,dt);camera.updateProjectionMatrix();
  }
  if(state==='playing'||state==='ready'){
    const view=viewControls.update(dt);viewRotation.set(view.pitch,view.yaw,0);
    viewOffset.copy(cameraBase).sub(ship.position).multiplyScalar(view.zoom).applyEuler(viewRotation);
    camera.position.copy(ship.position).add(viewOffset);
    viewTarget.set(-ship.position.x*.5,1-ship.position.y*.65,-35).applyEuler(viewRotation).add(ship.position);
    camera.lookAt(viewTarget);viewPosition.copy(camera.position);
  }
  if(state!=='paused'){
    camera.position.copy(viewPosition);
    const shake=Math.max(explosions.update(dt),impacts.update(dt));
    if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;}
  }
  if(state==='playing'||state==='ready'){
    const targetX=ship.position.x/18*Math.min(120,innerWidth*.09);
    const targetY=-clamp((ship.position.y+1.6)/12.6,-1,1)*Math.min(80,innerHeight*.115);
    aimX=THREE.MathUtils.damp(aimX,targetX,6,dt);
    aimY=THREE.MathUtils.damp(aimY,targetY,6,dt);
  }
  aimReferenceCamera.copy(camera,false);aimReferenceCamera.position.copy(cameraBase);
  aimReferenceCamera.lookAt(ship.position.x*.5,1+ship.position.y*.35,-35);
  aimPoint.set(ship.position.x,ship.position.y,-90);
  const viewAim=projectAimOffset(aimPoint,camera,aimReferenceCamera,innerWidth,innerHeight);
  const hudAimX=clamp(aimX+viewAim.x,-innerWidth*.43,innerWidth*.43);
  const hudAimY=clamp(aimY+viewAim.y,-innerHeight*.32,innerHeight*.32);
  $('hud').style.setProperty('--aim-x',`${hudAimX.toFixed(2)}px`);
  $('hud').style.setProperty('--aim-y',`${hudAimY.toFixed(2)}px`);
  const departure=state==='playing'?Math.max(0,1-elapsed/3.2):0;
  flightEffects.update(state==='paused'?0:dt,ship.position,speed,state==='playing',boosting,departure);
  document.body.classList.toggle('departing',departure>0);
  $('departure').style.opacity=String(state==='playing'?Math.min(1,elapsed/.35)*Math.min(1,Math.max(0,(3.2-elapsed)/.7)):0);
  document.body.classList.toggle('boosting',boosting);
  const encounter=pirates.snapshot(),impact=impacts.snapshot();
  $('target-hitmarker').classList.toggle('visible',impact.enemyHit);
  $('damage-direction').classList.toggle('visible',impact.playerHit);
  $('damage-direction').style.setProperty('--hit-angle',`${impact.direction}deg`);
  $('damage-flash').style.opacity=String(impact.flash*.45);
  $('shield-bars').classList.toggle('damaged',impact.playerHit);
  $('pirate-health').classList.toggle('hit',encounter.hit);
  $('player-hit-label').hidden=!impact.playerHit;$('player-hit-label').textContent=`护盾受击 −${impact.damage}% · 扣 ${lastPenalty} 分`;
  $('status-text').textContent=state==='ready'?'等待出击':state==='paused'?'航行暂停':state==='over'?'航行结束':boosting?'推进器加速':invulnerable>0?'护盾受损':encounter.entryPhase==='flyby'?'敌舰侧后方突入':encounter.entryPhase==='turn'?'敌舰漂移调头':encounter.phase==='battle'?'海盗交战':encounter.phase==='warning'?'敌舰接近':encounter.victory?'海盗已击败':boostLocked?'推进器冷却':'航线畅通';
  $('engine-mode').textContent=boosting?'加速模式':boostLocked?'松开 SHIFT 充能':'巡航模式';
  hudTimer+=dt;if(hudTimer>.1){updateHUD();drawRadar(visualTime);hudTimer=0;}
  composer.render();
}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));composer.setPixelRatio(Math.min(devicePixelRatio,1.5));composer.setSize(innerWidth,innerHeight);});
// A read-only snapshot for reproducible browser acceptance checks.
window.spacerun={getState:()=>({state,score,kills,shield,energy,speed,distance,ship:{model:selectedFighter,x:ship.position.x,y:ship.position.y},weapon:{name:WEAPONS[selectedFighter].name,beaming:state==='playing'&&selectedFighter==='C'&&keys.has('Space')},shots:shots.length,asteroids:rocks.length,pirate:pirates.snapshot()})};
