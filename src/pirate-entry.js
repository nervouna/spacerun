export const ENTRY_DURATION = 4.2;
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
export function pirateEntryPose(age,side,anchor={x:0,y:0}) {
  if(age<2.4){
    const t=Math.max(0,age/2.4),p=1-(1-t)**2;
    return {x:anchor.x+side*lerp(18,10,p),y:anchor.y+3+Math.sin(p*Math.PI)*2,z:lerp(11,-54,p),yaw:Math.PI,roll:-side*.26*Math.sin(p*Math.PI),phase:'flyby'};
  }
  const t=Math.min(1,(age-2.4)/(ENTRY_DURATION-2.4)),p=smooth(t);
  return {x:lerp(anchor.x+side*10,anchor.x*.4,p),y:lerp(anchor.y+3,anchor.y*.3,p),z:lerp(-54,-48,p),yaw:Math.PI+Math.PI*p,roll:side*.65*Math.sin(t*Math.PI),phase:t<1?'turn':'combat'};
}
