const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function createViewControls(){
 let yaw=0,pitch=0,targetYaw=0,targetPitch=0,zoom=1;
 return {
  drag(dx,dy){targetYaw=clamp(targetYaw-dx*.004,-.85,.85);targetPitch=clamp(targetPitch-dy*.003,-.4,.4);},
  release(){targetYaw=targetPitch=0;},
  zoom(delta){zoom=clamp(zoom*Math.exp(clamp(delta,-200,200)*.0015),.65,1.65);},
  update(dt){const blend=1-Math.exp(-dt*8);yaw+=(targetYaw-yaw)*blend;pitch+=(targetPitch-pitch)*blend;return {yaw,pitch,zoom};},
  reset(){yaw=pitch=targetYaw=targetPitch=0;zoom=1;}
 };
}
