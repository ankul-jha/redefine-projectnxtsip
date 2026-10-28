import * as THREE from 'three';
import droplets from '../shaders/droplets.glsl?raw';

// Refracting droplets, instanced and moved on the GPU (see droplets.glsl).
// 'splash' loops where the pour lands; 'rise' lifts a few out of the open bottle, driven by scroll.
export function createDroplets(count, mode) {
  const velocity = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    if (mode === 'splash') {
      const spread = 0.5 + Math.random() * 1.3;
      velocity.set([Math.cos(angle) * spread, 1.3 + Math.random() * 1.8, Math.sin(angle) * spread], i * 3);
      size[i] = 0.012 + Math.random() ** 2 * 0.03;
      phase[i] = Math.random();
    } else {
      const drift = Math.random() * 0.14;
      velocity.set([Math.cos(angle) * drift, 0.55 + Math.random() * 0.75, Math.sin(angle) * drift], i * 3);
      size[i] = 0.018 + Math.random() * 0.022;
      phase[i] = i / count;
    }
  }

  const geometry = new THREE.IcosahedronGeometry(1, 2);
  geometry.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocity, 3));
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));

  const uniforms = { uOrigin: { value: new THREE.Vector3() }, uTime: { value: 0 }, uAmount: { value: 0 } };
  const material = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.06,
    ior: 1.33,
    roughness: 0,
    attenuationColor: new THREE.Color('#d6edf4'),
    attenuationDistance: 1,
  });
  if (mode === 'splash') material.defines.SPLASH = '';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${droplets}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = dropletPosition(position);');
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh,
    update(origin, time, amount) {
      mesh.visible = amount > 0.001;
      uniforms.uOrigin.value.copy(origin);
      uniforms.uTime.value = time;
      uniforms.uAmount.value = amount;
    },
  };
}
