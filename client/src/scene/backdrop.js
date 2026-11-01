import * as THREE from 'three';
import fragmentShader from '../shaders/backdrop.frag.glsl?raw';
import vertexShader from '../shaders/backdrop.vert.glsl?raw';

// How many drips run down the screen in the closing section.
const DRIPS = 9;

// The full-screen backdrop: the page's gradient, as theme.css draws it behind every other page, with the hero's
// sphere and the colour blocks on it (see backdrop.frag.glsl). It is an opaque mesh, so the transmissive bottle
// refracts it. It is not tone mapped, so it shows exactly the CSS palette; through the bottle the same colours pass
// the renderer's neutral tone mapping, which keeps their hue and darkens them a touch, as glass does.
export function createBackdrop(palette) {
  const uniforms = {
    uRoyal: { value: new THREE.Color(palette.royal) },
    uCobalt: { value: new THREE.Color(palette.cobalt) },
    uDeep: { value: new THREE.Color(palette.deep) },
    uBlock: { value: new THREE.Color(palette.block) },
    uShade: { value: new THREE.Color(palette.shade) },
    uAspect: { value: 1 },
    uResolutionY: { value: 1 },
    uDisc: { value: new THREE.Vector3() },
    uDiscScale: { value: 0 },
    uPosterMix: { value: 0 },
    uBands: { value: new THREE.Vector2() },
    uDrip: { value: 0 },
    uBlockMix: { value: 0 },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, defines: { DRIPS }, depthWrite: false, toneMapped: false }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return {
    mesh,
    // `pixels` is the canvas height in device pixels, for crisp edges.
    fit({ pixels, aspect }) {
      uniforms.uResolutionY.value = pixels;
      uniforms.uAspect.value = aspect;
    },
    // `disc` is the hero's: centre in uv and radius in screen heights, opened to `discScale`. The rest run 0–1.
    update({ disc, discScale, posterMix, bands, drip, blockMix }) {
      uniforms.uDisc.value.copy(disc);
      uniforms.uDiscScale.value = discScale;
      uniforms.uPosterMix.value = posterMix;
      uniforms.uBands.value.set(bands.in, bands.out);
      uniforms.uDrip.value = drip;
      uniforms.uBlockMix.value = blockMix;
    },
  };
}
