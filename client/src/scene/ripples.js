import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import vertexShader from '../shaders/basic.vert.glsl?raw';
import fragmentShader from '../shaders/ripple.frag.glsl?raw';

const CELLS = 256; // along the longer side of the screen
const STEP = 1 / 60;
const MAX_STEPS = 3;
const NO_DROP = new THREE.Vector4();

// Cursor ripples: a height-field simulation ping-ponged between two half-float render targets.
export class Ripples {
  constructor() {
    this.targets = [0, 1].map(
      () => new THREE.WebGLRenderTarget(CELLS, CELLS, { type: THREE.HalfFloatType, depthBuffer: false }),
    );
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uTexel: { value: new THREE.Vector2(1 / CELLS, 1 / CELLS) },
        uDrop: { value: new THREE.Vector4() },
        uAspect: { value: 1 },
      },
      vertexShader,
      fragmentShader,
    });
    this.quad = new FullScreenQuad(this.material);
    this.drops = [];
    this.pending = 0;
  }

  get texture() {
    return this.targets[0].texture;
  }

  get texel() {
    return this.material.uniforms.uTexel.value;
  }

  resize(aspect) {
    const width = aspect >= 1 ? CELLS : Math.round(CELLS * aspect);
    const height = aspect >= 1 ? Math.round(CELLS / aspect) : CELLS;
    for (const target of this.targets) target.setSize(width, height);
    this.material.uniforms.uTexel.value.set(1 / width, 1 / height);
    this.material.uniforms.uAspect.value = aspect;
  }

  // x, y in uv (0–1, from the bottom left); radius in screen heights.
  drop(x, y, radius, strength) {
    if (this.drops.length < MAX_STEPS) this.drops.push(new THREE.Vector4(x, y, radius, strength));
  }

  update(renderer, delta) {
    this.pending = Math.min(this.pending + delta, STEP * MAX_STEPS);
    while (this.pending >= STEP) {
      this.material.uniforms.uDrop.value.copy(this.drops.shift() ?? NO_DROP);
      this.material.uniforms.uState.value = this.targets[0].texture;
      renderer.setRenderTarget(this.targets[1]);
      this.quad.render(renderer);
      this.targets.reverse();
      this.pending -= STEP;
    }
    renderer.setRenderTarget(null);
  }

  dispose() {
    for (const target of this.targets) target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
