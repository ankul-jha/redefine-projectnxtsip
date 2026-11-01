import * as THREE from 'three';

const TAU = Math.PI * 2;
// The ribbon's path round the bottle, in world units at the bottle's scale (heights as shares of its half height):
// how far out it winds (never closer than `closest`, clear of the bottle) and how many times round, from how far below the bottle's middle to how far above, and the
// angle it starts at, chosen so it crosses the front of the bottle below and above the label. Then its width, how
// far it twists either way and how much it ripples, how fast it drifts round, and how finely it is cut.
const RIBBON = {
  radius: 0.95,
  closest: 0.62,
  turns: 1.6,
  from: -0.95,
  to: 0.8,
  start: -1.3,
  width: 0.24,
  twist: 0.8,
  ripple: 0.04,
  drift: 0.12,
  segments: 320,
};
// The words printed along its pale side: how many times they repeat along it, and the canvas they are drawn on
// (about the shape of one repeat of the ribbon, so the letters keep their proportions).
const PRINT = { repeats: 4, width: 2048, height: 205 };

// The hero's ribbon: a band of satin winding round the bottle, pearl white on one side with the brand's words printed
// along it, the logo's blues on the other, twisting as it goes so both sides show, and rippling gently. As the page
// opens it draws itself round the bottle from the foot up; scrolling on unwinds it, from its foot, as it spins away.
export function createRibbon(palette) {
  const count = RIBBON.segments + 1;
  const positions = new Float32Array(count * 6);
  const normals = new Float32Array(count * 6);
  const uvs = new Float32Array(count * 4);
  const index = [];
  for (let i = 0; i < count; i += 1) {
    const u = (i / RIBBON.segments) * PRINT.repeats;
    uvs.set([u, 0, u, 1], i * 4);
    // Each step along the ribbon has a lower and an upper edge; two triangles join it to the next.
    if (i < RIBBON.segments) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);

  const canvas = document.createElement('canvas');
  canvas.width = PRINT.width;
  canvas.height = PRINT.height;
  const print = new THREE.CanvasTexture(canvas);
  print.colorSpace = THREE.SRGBColorSpace;
  print.wrapS = THREE.RepeatWrapping;
  print.anisotropy = 8;

  // Satin: soft sheen and a light clearcoat. The pale side shows the print; the other side the logo's blues along
  // the ribbon, cyan at its foot into deep blue at its head.
  const uniforms = {
    uCyan: { value: new THREE.Color(palette.cyan) },
    uRoyal: { value: new THREE.Color(palette.royal) },
    uDeep: { value: new THREE.Color(palette.deep) },
    uRepeats: { value: PRINT.repeats },
  };
  const material = new THREE.MeshPhysicalMaterial({
    map: print,
    roughness: 0.32,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    sheen: 1,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(palette.ice),
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCyan;\nuniform vec3 uRoyal;\nuniform vec3 uDeep;\nuniform float uRepeats;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (!gl_FrontFacing) {
          float along = vMapUv.x / uRepeats;
          diffuseColor.rgb = mix(mix(uCyan, uRoyal, smoothstep(0.0, 0.55, along)), uDeep, smoothstep(0.55, 1.0, along));
        }`,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display');
  let words = '';

  // Prints the words along the canvas, repeated to fill it, in the logo's blue on pearl white.
  function printWords() {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = palette.block;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!words) return;
    ctx.font = `800 ${Math.round(canvas.height * 0.42)}px ${family}`;
    ctx.letterSpacing = `${Math.round(canvas.height * 0.06)}px`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.royal;
    const phrase = `${words.toUpperCase()}  ·  `;
    const step = ctx.measureText(phrase).width;
    const repeats = Math.max(1, Math.floor(canvas.width / step));
    // Spread the repeats evenly (never closer than the phrase is long), so the print joins up seamlessly where the
    // canvas repeats.
    for (let i = 0; i < repeats; i += 1) ctx.fillText(phrase, (i * canvas.width) / repeats, canvas.height / 2);
    print.needsUpdate = true;
  }
  document.fonts.load(`800 100px ${family}`).then(printWords);

  const centre = new THREE.Vector3();
  const before = new THREE.Vector3();
  const after = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const across = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // The middle of the ribbon `s` of the way along it (0 at its foot, 1 at its head), in the group's space.
  function pointAt(s, { half, spin, radius }, out) {
    const angle = RIBBON.start + spin + s * RIBBON.turns * TAU;
    const reach = radius * (0.9 + 0.1 * Math.sin(s * Math.PI));
    return out.set(Math.sin(angle) * reach, THREE.MathUtils.lerp(RIBBON.from, RIBBON.to, s) * half, Math.cos(angle) * reach);
  }

  return {
    group,
    setWords(next) {
      if (next === words) return;
      words = next;
      printWords();
    },
    // `ribbon` is the stage's: `draw` (0–1) is how far the ribbon has drawn itself from its foot, `unwind` how far
    // it has unwound again. It winds round `bottle` (the stage's), whose half height is `half`; `room` is the widest
    // its path may be (world units, at the bottle's scale). `still` (reduced motion) stops its drift and ripples, and
    // `presence` then narrows it in and out instead.
    update({ ribbon, bottle, half, room, time, still, presence = 1 }) {
      group.visible = ribbon.draw > 0.001 && ribbon.unwind < 0.999 && presence > 0.001;
      if (!group.visible) return;
      group.position.set(bottle.x, bottle.y, 0);
      group.rotation.set(0, 0, bottle.rotZ);
      group.scale.setScalar(bottle.scale);

      const path = {
        half,
        // It winds in as it draws, drifts slowly round, and spins away as it unwinds.
        spin: (still ? 0 : time * RIBBON.drift) - (1 - ribbon.draw) * 2.5 + ribbon.unwind * 3,
        radius: THREE.MathUtils.clamp(room, RIBBON.closest, RIBBON.radius) * (1 + ribbon.unwind * 1.2),
      };
      const step = 1 / RIBBON.segments;
      for (let i = 0; i <= RIBBON.segments; i += 1) {
        const s = i * step;
        pointAt(s, path, centre);
        tangent.subVectors(pointAt(s + step, path, after), pointAt(s - step, path, before)).normalize();
        // Across the ribbon is "up", square to its direction, turned about that direction by the twist.
        side.copy(up).addScaledVector(tangent, -up.dot(tangent)).normalize();
        const twist = RIBBON.twist * Math.sin(s * 3 * Math.PI + (still ? 0 : time * 0.7));
        across.crossVectors(tangent, side);
        side.multiplyScalar(Math.cos(twist)).addScaledVector(across, Math.sin(twist));
        normal.crossVectors(tangent, side).normalize();
        if (!still) centre.addScaledVector(normal, RIBBON.ripple * Math.sin(s * 22 - time * 2.4) * Math.sin(s * Math.PI));
        // Narrow at both ends, and nothing beyond the drawn stretch (with a short taper at its edges).
        const shown = THREE.MathUtils.clamp((ribbon.draw - s) / 0.06, 0, 1) * THREE.MathUtils.clamp((s - ribbon.unwind) / 0.06, 0, 1);
        const width = RIBBON.width * Math.sqrt(Math.sin(Math.PI * s)) * shown * presence;
        for (const [edge, sign] of [
          [0, -0.5],
          [1, 0.5],
        ]) {
          const at = (i * 2 + edge) * 3;
          positions[at] = centre.x + side.x * width * sign;
          positions[at + 1] = centre.y + side.y * width * sign;
          positions[at + 2] = centre.z + side.z * width * sign;
          normals.set([normal.x, normal.y, normal.z], at);
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
    },
  };
}
