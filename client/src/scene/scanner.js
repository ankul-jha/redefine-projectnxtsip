import * as THREE from 'three';

// The ring's radius (clear of the bottle's rounded corners) and the stretch of the bottle it passes over, from the
// shoulder down to the foot, in the bottle's own units (its half height is 1).
const RING = { radius: 0.5, tube: 0.008 };
const PATH = { top: 0.42, bottom: -0.9 };

// A ring of cyan light that passes down the bottle in the purification section, step by step as each lights up.
export function createScanner(color, bottleHalf) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(RING.radius, RING.tube, 8, 128).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }),
  );
  const local = new THREE.Vector3();

  return {
    mesh,
    // Follows the bottle's group, so it stays square to the bottle as it moves.
    update({ scan }, bottleGroup) {
      mesh.visible = scan.presence > 0.001;
      if (!mesh.visible) return;
      local.set(0, THREE.MathUtils.lerp(PATH.bottom, PATH.top, scan.y) * bottleHalf, 0);
      mesh.position.copy(bottleGroup.localToWorld(local));
      mesh.quaternion.copy(bottleGroup.quaternion);
      mesh.scale.setScalar(bottleGroup.scale.x * (1 + 0.15 * (1 - scan.presence)));
      mesh.material.opacity = scan.presence;
    },
  };
}
