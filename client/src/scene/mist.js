import * as THREE from 'three';
import fragmentShader from '../shaders/mist.frag.glsl?raw';
import vertexShader from '../shaders/basic.vert.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import untonemap from '../shaders/untonemap.glsl?raw';

// A band of mist in front of the bottle's base for the opening scene. The haze behind it is part of the backdrop,
// so the bottle refracts it.
export function createMist(color) {
  const uniforms = { uColor: { value: new THREE.Color(color) }, uAmount: { value: 0 }, uTime: { value: 0 } };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader: [noise, untonemap, fragmentShader].join('\n'),
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.position.z = 0.9;

  return {
    mesh,
    fit({ width, rest, bottleHalf }) {
      mesh.scale.set(width * 1.4, bottleHalf * 1.1, 1);
      mesh.position.y = rest - bottleHalf;
    },
    update(amount, time) {
      mesh.visible = amount > 0.001;
      uniforms.uAmount.value = amount;
      uniforms.uTime.value = time;
    },
  };
}
