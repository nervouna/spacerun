import * as THREE from 'three';
export function createWeaponEffects(scene){
 const root=new THREE.Group();scene.add(root);
 const blue=new THREE.MeshBasicMaterial({color:new THREE.Color(0x38cfff).multiplyScalar(2),transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending});
 const white=new THREE.MeshBasicMaterial({color:new THREE.Color(0xd0ffff).multiplyScalar(3)});
 const gold=new THREE.MeshBasicMaterial({color:new THREE.Color(0xffb45c).multiplyScalar(3),transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});
 const geometry=new THREE.CylinderGeometry(1,1,1,8);geometry.rotateX(Math.PI/2);
 const beams=Array.from({length:2},()=>{const group=new THREE.Group();for(const [r,mat] of [[.16,blue],[.035,white]]){const m=new THREE.Mesh(geometry,mat);m.scale.set(r,r,1);group.add(m);}root.add(group);group.visible=false;return group;});
 const flashes=Array.from({length:2},()=>{const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.32,0),gold);root.add(mesh);mesh.visible=false;return mesh;});
 const contacts=Array.from({length:2},()=>{const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.24,1),white);root.add(mesh);mesh.visible=false;return mesh;});
 let flash=0,heavy=false;
 return {
  fire(isHeavy){flash=isHeavy?.09:.035;heavy=isHeavy;},
  update(dt,mounts,paths,time){
   flash=Math.max(0,flash-dt);
   for(let i=0;i<2;i++){
    const f=flashes[i];f.visible=flash>0;f.position.copy(mounts[i]);f.scale.setScalar((heavy?1.5:.7)*(flash/(heavy?.09:.035)));f.rotation.z=time*38;
    const beam=beams[i],path=paths?.[i];beam.visible=!!path;
    contacts[i].visible=!!path?.contact;
    if(path){const length=mounts[i].distanceTo(path.end);beam.position.copy(mounts[i]).lerp(path.end,.5);beam.scale.set(1+Math.sin(time*90)*.12,1,length);if(path.contact){contacts[i].position.copy(path.end);contacts[i].scale.setScalar(.8+Math.sin(time*73)*.3);}}
   }
  },clear(){flash=0;for(const m of [...beams,...flashes,...contacts])m.visible=false;}
 };
}
