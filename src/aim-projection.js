import * as THREE from 'three';
const projected=new THREE.Vector3(),baseline=new THREE.Vector3();
export function projectAimOffset(point,camera,referenceCamera,width,height){
 camera.updateMatrixWorld();referenceCamera.updateMatrixWorld();
 projected.copy(point).project(camera);baseline.copy(point).project(referenceCamera);
 return {x:(projected.x-baseline.x)*width*.5,y:-(projected.y-baseline.y)*height*.5};
}
