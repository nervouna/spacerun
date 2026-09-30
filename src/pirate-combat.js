import * as THREE from 'three';
import {clamp} from './physics.js';

// Independent waypoints and eased velocity replace the repeating combat orbit.
export function createPirateMotion(seed=Math.floor(Math.random()*4294967296)){
 let target=null,timer=0,vx=0,vy=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 return {update(dt,position,player,difficulty){
  timer-=dt;
  if(!target||timer<=0||Math.hypot(target.x-position.x,target.y-position.y)<1){
   for(let i=0;i<4;i++){
    target={x:clamp(player.x*.25+(random()-.5)*26,-13,13),y:clamp(player.y*.2+(random()-.5)*14+1,-6,8)};
    if(Math.hypot(target.x-position.x,target.y-position.y)>5)break;
   }
   timer=1.1+random()*1.5;
  }
  const dx=target.x-position.x,dy=target.y-position.y,distance=Math.hypot(dx,dy);
  const speed=Math.min(difficulty.travelSpeed,distance*3),blend=1-Math.exp(-dt*6);
  vx+=(distance?dx/distance*speed-vx:-vx)*blend;
  vy+=(distance?dy/distance*speed-vy:-vy)*blend;
  return {x:clamp(position.x+vx*dt,-13,13),y:clamp(position.y+vy*dt,-6,8),roll:-vx/difficulty.travelSpeed*.28,pitch:vy/difficulty.travelSpeed*.1};
 }};
}
export function volleyDirections(origin,target,difficulty){
 const directions=[],aim=target.clone().sub(origin).normalize();
 const rows=difficulty.verticalSpread?[-1,0,1]:[0];
 for(const row of rows)for(let i=0;i<difficulty.bullets;i++){
  const direction=aim.clone();direction.x+=(i-(difficulty.bullets-1)/2)*.14;
  direction.y+=row*difficulty.verticalSpread;directions.push(direction.normalize());
 }
 return directions;
}
