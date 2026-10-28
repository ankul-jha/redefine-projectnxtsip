import * as THREE from 'three';

const WATER_TINT = '#a6d8ec';

// Clear water, for droplets on the soda can.
export function createWaterMaterial({ thickness, side = THREE.DoubleSide }) {
  return new THREE.MeshPhysicalMaterial({
    roughness: 0.02,
    transmission: 1,
    thickness,
    ior: 1.33,
    attenuationColor: new THREE.Color(WATER_TINT),
    attenuationDistance: 2.5,
    side,
  });
}
