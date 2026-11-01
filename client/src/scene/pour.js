import * as THREE from 'three';

const TAPER = 0.6; // the stream's width where it lands, as a share of its width at the top: falling water narrows
const FLOW = 2.4; // how fast the surface streams down, in normal-map tiles per second

// The water poured into the bottle as the page opens: a column falling from above the frame into the bottle's mouth,
// clear with a little white in it (poured water carries air), so it reads on the blue page. `normalMap`, stretched
// into streaks, gives its surface the look of moving water; it scrolls downwards over time.
export function createPour(normalMap) {
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshPhysicalMaterial({
    transmission: 0.85,
    thickness: 0.3,
    ior: 1.33,
    roughness: 0.06,
    normalMap,
    normalScale: new THREE.Vector2(0.8, -0.8),
    attenuationColor: new THREE.Color('#d4efff'),
    attenuationDistance: 1.2,
    envMapIntensity: 2.2,
  });
  // A tapered tube one unit tall, standing on y = 0, so it can be stretched between any two heights.
  const geometry = new THREE.CylinderGeometry(1, TAPER, 1, 24, 1, true).translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    // Shows the stream between world heights `bottom` and `top`, `width` wide at the top, centred on `x`.
    update({ x, z, bottom, top, width, time }) {
      const length = top - bottom;
      mesh.visible = length > 0.001;
      if (!mesh.visible) return;
      mesh.position.set(x, bottom, z);
      mesh.scale.set(width, length, width);
      normalMap.repeat.set(3, length * 0.6);
      normalMap.offset.y = time * FLOW;
    },
  };
}
