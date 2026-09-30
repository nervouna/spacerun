import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createExplosions} from '../src/explosions.js';

test('ship explosions use metal plates while asteroids retain rock fragments',()=>{
 const originalDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 try{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),map=new THREE.Texture();
  const rock=new THREE.MeshStandardMaterial({map,roughness:.95});
  const explosions=createExplosions(scene,camera,rock);
  explosions.burst(new THREE.Vector3(),3);
  explosions.burst(new THREE.Vector3(10,0,0),3,'ship');
  const groups=scene.children.filter(o=>o.isGroup);
  const fragments=groups.map(g=>g.children.find(o=>o.isInstancedMesh));
  assert.equal(fragments[0].geometry.type,'DodecahedronGeometry');assert.equal(fragments[0].material.map,map);
  assert.equal(fragments[1].geometry.type,'BoxGeometry');assert.equal(fragments[1].material.map,null);
  assert.ok(fragments[1].material.metalness>.8);
  explosions.update(.4);
  const matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Quaternion();
  fragments[1].getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
  assert.ok(scale.y<scale.x*.5);assert.ok(scale.z>scale.x);
  explosions.update(2);assert.equal(scene.children.filter(o=>o.isGroup).length,0);
  explosions.clear();
 }finally{globalThis.document=originalDocument;}
});
