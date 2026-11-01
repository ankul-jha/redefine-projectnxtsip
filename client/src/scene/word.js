import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// How deep the letters are and how round their edges, as shares of the font size; how finely their curves are cut.
const SHAPE = { depth: 0.22, bevel: 0.03, curveSegments: 8, bevelSegments: 4 };

// The letters' colouring, in their fragment shader: the logo's lettering, deep blue at the baseline, royal, then
// cyan at the top of the letters.
const SHADING = /* glsl */ `
varying float vHeight;
uniform vec3 uCyan;
uniform vec3 uRoyal;
uniform vec3 uDeep;

vec3 lettering() {
  float height = clamp(vHeight, 0.0, 1.0);
  return mix(mix(uDeep, uRoyal, smoothstep(0.0, 0.6, height)), uCyan, smoothstep(0.62, 1.0, height));
}
`;

// The 3D letters' material: shaded like the logo's letters, lit like the bottle. It is transparent to three.js
// (though fully opaque), which keeps the letters out of the render the bottle refracts: the bottle hides the letters
// behind it rather than smearing them into blots. `capHeight` is the height the shading runs over.
function createLetterMaterial(palette) {
  const uniforms = {
    uCapHeight: { value: 1 },
    uCyan: { value: new THREE.Color(palette.cyan) },
    uRoyal: { value: new THREE.Color(palette.royal) },
    uDeep: { value: new THREE.Color(palette.deep) },
  };
  const material = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, transparent: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHeight;\nuniform float uCapHeight;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeight = position.y / uCapHeight;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SHADING}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = lettering();');
  };
  return { material, uniforms };
}

// A solid letter (or a few) `size` world units tall in em, with rounded edges, its baseline on y = 0, centred across
// and in depth. Returns the geometry, how far its centre sits from the pen, its width and its height.
function letterGeometry(font, text, size) {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth: SHAPE.depth * size,
    curveSegments: SHAPE.curveSegments,
    bevelEnabled: true,
    bevelThickness: SHAPE.bevel * size,
    bevelSize: SHAPE.bevel * size,
    bevelOffset: -SHAPE.bevel * size,
    bevelSegments: SHAPE.bevelSegments,
  });
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const centre = (min.x + max.x) / 2;
  geometry.translate(-centre, 0, -(min.z + max.z) / 2);
  return { geometry, centre, width: max.x - min.x, height: max.y };
}

// The closing poster's word as solid 3D letters standing behind the bottle, shaded like the logo's letters.
// Each letter stands on a pivot at its foot, so it can swing up on its own.
export function createWord(font, palette) {
  const group = new THREE.Group();
  const { material, uniforms } = createLetterMaterial(palette);
  let pivots = [];
  let built = -1;

  // Builds the letters from the poster's layout (frame pixels): `toWorld` turns a point of the frame into world
  // units on the plane the word stands on, and `scale` is world units per frame pixel there.
  function build(layout, { toWorld, scale }) {
    for (const pivot of pivots) pivot.children[0].geometry.dispose();
    group.clear();
    const size = layout.fontSize * scale;
    let capHeight = 0;
    pivots = layout.letters.map((letter) => {
      const { geometry, centre, height } = letterGeometry(font, letter.text, size);
      capHeight = Math.max(capHeight, height);
      const pivot = new THREE.Group();
      const foot = toWorld(letter.pen, letter.baseline);
      pivot.userData.rest = new THREE.Vector3(foot.x + centre, foot.y, foot.z);
      pivot.position.copy(pivot.userData.rest);
      pivot.add(new THREE.Mesh(geometry, material));
      group.add(pivot);
      return pivot;
    });
    uniforms.uCapHeight.value = capHeight || 1;
    built = layout.version;
  }

  return {
    group,
    // `layout` is the poster's (poster.js); `place` converts its pixels to the world (see build). `letters` holds
    // each letter's motion from the stage: tip (about its foot, towards the camera) and size. `opacity` fades the
    // word under reduced motion.
    update({ layout, place, letters, opacity }) {
      if (layout.version !== built) build(layout, place);
      group.visible = opacity > 0.001 && pivots.length > 0;
      if (!group.visible) return;
      pivots.forEach((pivot, index) => {
        const { tip, size } = letters[index];
        pivot.rotation.set(tip, 0, 0);
        pivot.scale.setScalar(size);
      });
      material.opacity = opacity;
    },
  };
}
