import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

// Meshes on this layer cast the contact shadow.
export const SHADOW_LAYER = 1;
const RESOLUTION = 512;
const BLUR = 3;
const DARKNESS = 0.85;

// A soft contact shadow, after the three.js example: render the casters' depth from the floor looking up,
// blur it twice and lay it on a transparent plane. Distance from the floor fades it naturally.
export class ContactShadow {
  constructor({ width, depth, reach }) {
    this.target = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION);
    this.target.texture.generateMipmaps = false;
    this.blurTarget = this.target.clone();

    const geometry = new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2);
    this.plane = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: this.target.texture, transparent: true, depthWrite: false, opacity: 0 }),
    );
    this.plane.renderOrder = 1;
    this.plane.scale.y = -1;

    this.blurPlane = new THREE.Mesh(geometry);
    this.blurPlane.layers.set(SHADOW_LAYER);
    this.blurPlane.visible = false;

    this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, reach);
    this.camera.rotation.x = Math.PI / 2;
    this.camera.layers.set(SHADOW_LAYER);

    this.group = new THREE.Group();
    this.group.add(this.plane, this.blurPlane, this.camera);

    this.depthMaterial = new THREE.MeshDepthMaterial({ depthTest: false, depthWrite: false });
    this.depthMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        `gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * ${DARKNESS.toFixed(2)} );`,
      );
    };
    const blur = (shader) =>
      new THREE.ShaderMaterial({ ...shader, uniforms: THREE.UniformsUtils.clone(shader.uniforms), depthTest: false });
    this.horizontalBlur = blur(HorizontalBlurShader);
    this.verticalBlur = blur(VerticalBlurShader);
  }

  set opacity(value) {
    this.plane.material.opacity = value;
    this.plane.visible = value > 0.01;
  }

  render(renderer, scene) {
    if (!this.plane.visible) return;
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    scene.overrideMaterial = this.depthMaterial;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.camera);
    scene.overrideMaterial = null;

    this.blur(renderer, BLUR);
    this.blur(renderer, BLUR * 0.4);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(clearAlpha);
  }

  blur(renderer, amount) {
    this.blurPlane.visible = true;
    this.blurPlane.material = this.horizontalBlur;
    this.horizontalBlur.uniforms.tDiffuse.value = this.target.texture;
    this.horizontalBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(this.blurTarget);
    renderer.render(this.blurPlane, this.camera);

    this.blurPlane.material = this.verticalBlur;
    this.verticalBlur.uniforms.tDiffuse.value = this.blurTarget.texture;
    this.verticalBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(this.target);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.visible = false;
  }

  dispose() {
    this.target.dispose();
    this.blurTarget.dispose();
    this.plane.geometry.dispose();
    this.plane.material.dispose();
    this.depthMaterial.dispose();
    this.horizontalBlur.dispose();
    this.verticalBlur.dispose();
  }
}
