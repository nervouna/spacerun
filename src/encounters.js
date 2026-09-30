export const STAGE_DISTANCE = 3;
export function createEncounter() { return {stage:0,nextDistance:STAGE_DISTANCE,phase:'cruise',warningTime:0}; }
export function advanceEncounter(encounter,distance,dt) {
  if(encounter.phase==='battle')return encounter;
  let next={...encounter};
  if(next.phase==='cruise'&&distance>=next.nextDistance-.35)next.phase='warning';
  if(next.phase==='warning'){
    next.warningTime+=dt;
    if(distance>=next.nextDistance&&next.warningTime>=1.8-1e-9){next.phase='battle';next.stage++;}
  }
  return next;
}
export function finishEncounter(encounter) {
  return {...encounter,phase:'cruise',nextDistance:(encounter.stage+1)*STAGE_DISTANCE,warningTime:0};
}
export function pirateDifficulty(stage) {
  const tier=Math.min(8,Math.max(1,stage));
  return {irregular:tier>=3,travelSpeed:tier>=5?12+(tier-5)*.8:8,verticalSpread:tier>=8?.16:0,health:72+(tier-1)*18,fireInterval:2.6-(tier-1)*.16,movement:1.65+(tier-1)*.15,bulletSpeed:46+(tier-1)*3,bullets:tier<4?5:7,damage:tier<5?20:25,reward:1000*stage,shieldReward:20};
}
