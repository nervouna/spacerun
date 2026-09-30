import {createPirates} from './pirates.js';
export const FINAL_STAGE=10;
export function createPirateFleet(scene,options){
 const units=[];let nextStage=1,lastVictory=0,latestStage=0,defeated=0;
 function update(dt,distance,player){
  lastVictory=Math.max(0,lastVictory-dt);
  while(nextStage<=FINAL_STAGE&&distance>=nextStage*3-.35){
   const stage=nextStage++;
   units.push(createPirates(scene,{...options,stageNumber:stage,singleEncounter:true,onVictory:d=>{lastVictory=3.5;defeated++;options.onVictory(d);}}));
  }
  for(let i=units.length-1;i>=0;i--){
   units[i].update(dt,distance,player);const s=units[i].snapshot();latestStage=Math.max(latestStage,s.stage);
   if(s.phase==='cruise'&&s.victory===false){units[i].dispose();units.splice(i,1);}
  }
 }
 function snapshot(){
  const all=units.map(u=>u.snapshot()),enemies=all.filter(s=>s.phase==='battle');
  const primary=enemies.find(s=>s.hit)||enemies[0];
  const warning=all.some(s=>s.phase==='warning');
  return {...(primary||{}),stage:primary?.stage??latestStage,nextDistance:nextStage<=FINAL_STAGE?nextStage*3:null,defeated,completed:defeated===FINAL_STAGE,phase:enemies.length?'battle':warning?'warning':'cruise',warning,charging:enemies.some(s=>s.charging),hit:enemies.some(s=>s.hit),victory:lastVictory>0,health:primary?.health??0,maxHealth:primary?.maxHealth??0,projectiles:all.reduce((n,s)=>n+s.projectiles,0),position:primary?.position??null,positions:enemies.map(s=>s.position),activeCount:enemies.length};
 }
 function trace(a,b){
  let nearest=null;
  for(const unit of units){const contact=unit.trace(a,b);if(contact&&(!nearest||contact.distance<nearest.distance))nearest={...contact,unit};}
  return nearest;
 }
 function clear(){for(const u of units)u.dispose();units.length=0;nextStage=1;latestStage=lastVictory=defeated=0;}
 return {update,snapshot,clear,trace,hit:(a,b,damage=1)=>{const contact=trace(a,b);return contact?contact.unit.hit(a,b,damage):false;},get busy(){return units.some(u=>u.busy);}};
}
