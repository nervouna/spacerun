export const WEAPONS={
 A:{name:'双炮连射',interval:.15,damage:1,speed:180,radius:.065,length:2.3,color:0xffd4a1},
 B:{name:'重炮三连发',interval:.085,gap:.48,damage:1.5,speed:150,radius:.14,length:3.2,color:0xff9f46},
 C:{name:'持续能量束',interval:.1,damage:.65,range:240,color:0x73e9ff}
};
export function createWeaponCycle(){
 let cooldown=0,remaining=0;
 return {
  update(dt,held,id){
   cooldown=Math.max(0,cooldown-dt);
   if(cooldown>1e-9)return false;
   if(id==='B'){
    if(!remaining){if(!held)return false;remaining=3;}
    remaining--;cooldown=remaining?WEAPONS.B.interval:WEAPONS.B.gap;return true;
   }
   if(!held)return false;
   cooldown=WEAPONS[id].interval;return true;
  },reset(){cooldown=remaining=0;}
 };
}
