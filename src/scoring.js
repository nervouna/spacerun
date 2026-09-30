export function createScoring(){
 let score=0,combo=0,maxCombo=0,lastHit=-Infinity,lastDelta=0;
 function hit(base,time){
  combo=time-lastHit<=1+1e-9?combo+1:1;lastHit=time;maxCombo=Math.max(maxCombo,combo);
  // A bounded multiplier prevents a long barrage from dwarfing the entire run.
  lastDelta=Math.round(base*Math.min(32,1.12**(combo-1)));score+=lastDelta;
  return lastDelta;
 }
 return {
  hit,bonus(points){score+=points;lastDelta=points;},
  damage(amount){lastDelta=-Math.min(score,137+amount*11);score+=lastDelta;combo=0;lastHit=-Infinity;},
  reset(){score=combo=maxCombo=lastDelta=0;lastHit=-Infinity;},
  snapshot(time){return {score,combo:time-lastHit<=1+1e-9?combo:0,maxCombo,multiplier:time-lastHit<=1+1e-9?Math.min(32,1.12**(combo-1)):1,lastDelta};}
 };
}
