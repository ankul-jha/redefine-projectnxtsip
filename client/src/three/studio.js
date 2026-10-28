import * as THREE from 'three';

// A dark studio with tall softboxes, which gives metal and plastic the long vertical highlights of a product shot.
export function createEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x0a0f14);

  const softbox = (width, height, intensity, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  };
  softbox(1.2, 7, 7, -4, 0.5, 2);
  softbox(1.2, 7, 5, 4, 0.5, 2);
  softbox(5, 5, 2.5, 0, 6, 0);
  softbox(0.6, 6, 3, -2.5, 0, -4);
  softbox(0.6, 6, 3, 2.5, 0, -4);
  softbox(8, 4, 0.6, 0, 0, 7);

  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(studio, 0.02);
  generator.dispose();
  studio.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    object.material.dispose();
  });
  return target;
}
