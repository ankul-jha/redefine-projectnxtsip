import * as THREE from 'three';
import fragmentShader from '../shaders/backdrop.frag.glsl?raw';
import vertexShader from '../shaders/backdrop.vert.glsl?raw';
import caustics from '../shaders/caustics.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import untonemap from '../shaders/untonemap.glsl?raw';

const GRAIN = 0.012;

// The full-screen backdrop. It is an opaque mesh, so the transmissive bottle refracts it (and the posters on it).
export function createBackdrop(palette, poster) {
  const uniforms = {
    uPaper: { value: new THREE.Color(palette.paper) },
    uMist: { value: new THREE.Color(palette.mist) },
    uStone: { value: new THREE.Color(palette.stone) },
    uDeep: { value: new THREE.Color(palette.deep) },
    uPhoto: { value: null },
    uPhotoAspect: { value: 1.5 },
    uPhotoMix: { value: 0 },
    uPhotoZoom: { value: 1 },
    uWindow: { value: new THREE.Vector4(0.5, 0.5, 0.25, 0.4) },
    uPosterShape: { value: poster.shape },
    uPosterWord: { value: poster.word },
    uPosterMix: { value: 0 },
    uWordMix: { value: 1 },
    uPosterScale: { value: 1 },
    uDark: { value: 0 },
    uHaze: { value: 0 },
    uCaustics: { value: 0 },
    uFloor: { value: new THREE.Vector3(0.5, 0.2, 0.1) },
    uFloorLight: { value: 0 },
    uAspect: { value: 1 },
    uResolutionY: { value: 1 },
    uTime: { value: 0 },
    uGrain: { value: GRAIN },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader: [noise, caustics, untonemap, fragmentShader].join('\n'),
      depthWrite: false,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return {
    mesh,
    // How strongly the posters' word shows: faded in the render the bottle refracts (see StoryScene).
    setWordStrength(strength) {
      uniforms.uWordMix.value = strength;
      mesh.material.uniformsNeedUpdate = true;
    },
    setPhoto(texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      uniforms.uPhoto.value = texture;
      uniforms.uPhotoAspect.value = texture.image.width / texture.image.height;
    },
    // `arch` is the photograph's window: centre in uv and half size in screen heights. `pixels` is the canvas
    // height in device pixels, for crisp edges.
    fit({ arch, pixels }) {
      uniforms.uWindow.value.copy(arch);
      uniforms.uResolutionY.value = pixels;
    },
    // `floor` is the bottle's base on screen (uv) and its width in screen heights.
    update(stage, { time, aspect, floor }) {
      const { photo, zoom, dark, caustics: light } = stage.backdrop;
      uniforms.uPhotoMix.value = uniforms.uPhoto.value ? photo : 0;
      uniforms.uPhotoZoom.value = zoom;
      uniforms.uPosterMix.value = stage.poster.amount;
      uniforms.uPosterScale.value = stage.poster.scale;
      uniforms.uDark.value = dark;
      uniforms.uHaze.value = stage.mist;
      uniforms.uCaustics.value = light;
      uniforms.uFloor.value.copy(floor);
      uniforms.uFloorLight.value = stage.shadow;
      uniforms.uAspect.value = aspect;
      uniforms.uTime.value = time;
    },
  };
}
