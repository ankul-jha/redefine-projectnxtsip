import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import vertexShader from '../shaders/basic.vert.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import fragmentShader from '../shaders/screenWater.frag.glsl?raw';

// Post-processing pass: water on the screen glass (the pour's film and the cursor ripples) refracting the frame.
export function createScreenWater() {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRipples: { value: null },
      uRippleTexel: { value: new THREE.Vector2() },
      uRipple: { value: 0 },
      uSheet: { value: 0 },
      uFront: { value: 0 },
      uTime: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader,
    fragmentShader: `${noise}\n${fragmentShader}`,
  });

  return {
    pass,
    update(stage, { time, aspect, ripples }) {
      const { uniforms } = pass;
      uniforms.uSheet.value = stage.sheet.amount;
      uniforms.uFront.value = stage.sheet.front;
      uniforms.uRipple.value = stage.ripples;
      uniforms.uRipples.value = ripples.texture;
      uniforms.uRippleTexel.value.copy(ripples.texel);
      uniforms.uTime.value = time;
      uniforms.uAspect.value = aspect;
      pass.enabled = stage.sheet.amount > 0.001 || stage.ripples > 0.001;
    },
  };
}
