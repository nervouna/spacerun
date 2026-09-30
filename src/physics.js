export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// Swept sphere collision prevents fast projectiles from skipping small targets.
export function segmentHitsSphere(start, end, center, radius) {
  const dx = end.x-start.x, dy = end.y-start.y, dz = end.z-start.z;
  const lengthSquared = dx*dx+dy*dy+dz*dz;
  const t = lengthSquared ? clamp(((center.x-start.x)*dx+(center.y-start.y)*dy+(center.z-start.z)*dz)/lengthSquared,0,1) : 0;
  return (start.x+dx*t-center.x)**2+(start.y+dy*t-center.y)**2+(start.z+dz*t-center.z)**2 <= radius*radius;
}
export function updateEnergy(energy, wantsBoost, dt) {
  const boosting = wantsBoost && energy > 0;
  return { boosting, energy:clamp(energy+(boosting ? -24 : 17)*dt,0,100) };
}
// First surface contact, used to stop beams at the nearest solid target.
export function segmentSphereDistance(start,end,center,radius){
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
 const length=Math.hypot(dx,dy,dz),ox=start.x-center.x,oy=start.y-center.y,oz=start.z-center.z;
 const c=ox*ox+oy*oy+oz*oz-radius*radius;
 if(c<=0)return 0;
 if(!length)return null;
 const b=(ox*dx+oy*dy+oz*dz)/length,discriminant=b*b-c;
 if(discriminant<0)return null;
 const distance=-b-Math.sqrt(discriminant);
 return distance>=0&&distance<=length?distance:null;
}
