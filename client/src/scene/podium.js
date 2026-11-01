import * as THREE from 'three';

// The layers from the bottom up: radius and thickness (world units, at the bottle's scale), and which of the
// logo's blues each takes. A small gap separates them.
const LAYERS = [
  { radius: 0.95, height: 0.16, color: 'deep' },
  { radius: 0.86, height: 0.14, color: 'cobalt' },
  { radius: 0.77, height: 0.12, color: 'royal' },
  { radius: 0.68, height: 0.1, color: 'sky' },
];
const GAP = 0.025;
const FILLET = 0.03;

// A disc with rounded edges, `height` thick, standing on y = 0.
function slab(radius, height) {
  const profile = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 6; i += 1) {
    const angle = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    profile.push(new THREE.Vector2(radius - FILLET + Math.cos(angle) * FILLET, FILLET + Math.sin(angle) * FILLET));
  }
  for (let i = 0; i <= 6; i += 1) {
    const angle = (i / 6) * (Math.PI / 2);
    profile.push(new THREE.Vector2(radius - FILLET + Math.cos(angle) * FILLET, height - FILLET + Math.sin(angle) * FILLET));
  }
  profile.push(new THREE.Vector2(0, height));
  return new THREE.LatheGeometry(profile, 96);
}

// The source section's podium: layers of rock in the logo's blues stacked under the bottle, as the water filters
// down through rock on its way to the spring. The layers slide in one after another from alternating sides, turning
// as they come, and drop away again as the section leaves.
export function createPodium(palette) {
  const group = new THREE.Group();
  let top = 0;
  const layers = LAYERS.map((layer, index) => {
    const mesh = new THREE.Mesh(
      slab(layer.radius, layer.height),
      new THREE.MeshPhysicalMaterial({ color: palette[layer.color], roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    );
    // Stacked downwards from the top layer, which the bottle stands on.
    mesh.userData.side = index % 2 ? 1 : -1;
    group.add(mesh);
    return mesh;
  });
  // Rest heights, measured down from the podium's top.
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    top -= LAYERS[index].height;
    layers[index].userData.rest = top;
    top -= GAP;
  }

  return {
    group,
    // `podium` is the stage's: `stack` brings the layers in (0–1, bottom layer first), `drop` sends them away. The
    // podium's top stands at `floor` (world units) under the bottle at `x`; `width` is the frame's, in world units.
    update({ podium, x, floor, scale, width }) {
      group.visible = podium.stack > 0 && podium.drop < 1;
      if (!group.visible) return;
      group.position.set(x, floor, 0);
      group.scale.setScalar(scale);
      layers.forEach((layer, index) => {
        const order = index / (layers.length - 1);
        const arrive = THREE.MathUtils.smootherstep(podium.stack * 1.6 - order * 0.6, 0, 1);
        const leave = THREE.MathUtils.smoothstep(podium.drop * 1.6 - (1 - order) * 0.6, 0, 1);
        const off = 1 - arrive;
        layer.position.set(layer.userData.side * off * (width / scale), layer.userData.rest - leave * 6, 0);
        layer.rotation.set(0, layer.userData.side * off * 2.5, layer.userData.side * leave * 0.6);
      });
    },
  };
}
