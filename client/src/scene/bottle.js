import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import slosh from '../shaders/slosh.glsl?raw';
import { SHADOW_LAYER } from './contactShadow.js';

// Models are scaled to this height in world units; the thicknesses below are world units as well.
export const BOTTLE_HEIGHT = 2.72;
const CAP = { turns: 1.6, pitch: 0.055, knurlTiles: 30 };
const SEAL_DROP = 0.012;
// The water surface is a damped spring chasing the bottle's tilt speed, so it lags, overshoots and settles.
const SLOSH = { stiffness: 55, damping: 3.2, follow: 0.22, drift: 0.05 };
const CONDENSATION = { size: [0.006, 0.026], margin: 0.04 };

// glTF textures keep their top-left origin, which flips the tangent frame three.js derives on the GPU.
const normalScale = (strength) => new THREE.Vector2(strength, -strength);

// Clear PET (or polycarbonate for the jar), per the brief: transmission, IOR 1.5, clearcoat, a faint blue body.
export function createPlastic(scale, { tint = '#dcefff', condensation = null } = {}) {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.4 / scale,
    ior: 1.5,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    attenuationColor: new THREE.Color(tint),
    attenuationDistance: 2,
    normalMap: condensation,
    normalScale: normalScale(0.3),
    // Stronger reflections give the walls dark, defined edges, so clear plastic still reads on a pale ground.
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });
}

export function createWater(scale) {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1,
    // Water bends what is behind it only a little (much more, and the poster's word smears into dark blots) and
    // tints it the brand's blue, so anything seen through the bottle stays in the palette.
    thickness: 0.35 / scale,
    ior: 1.33,
    roughness: 0.02,
    attenuationColor: new THREE.Color('#a6d0f0'),
    attenuationDistance: 0.4,
    side: THREE.DoubleSide,
  });
}

// Uncoated paper, so the label never looks glossy.
export const createPaper = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.82 });

// Matte cap plastic. The fine knurling comes from the normal map.
export const createCapPlastic = (color, normalMap = null) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, normalMap, normalScale: normalScale(0.9) });

// Scales a model to `height`, stands it on y = 0 and centres it on the y axis. Returns the scale applied.
export function fitModel(model, height) {
  const box = new THREE.Box3().setFromObject(model);
  const scale = height / box.getSize(new THREE.Vector3()).y;
  const centre = box.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
  model.traverse((child) => child.isMesh && child.layers.enable(SHADOW_LAYER));
  return scale;
}

// Gives every mesh in the part called `name` the material, and returns the part (or undefined if the model has none).
export function dress(model, name, material) {
  const part = model.getObjectByName(name);
  part?.traverse((child) => {
    if (child.isMesh) child.material = material;
  });
  return part;
}

const firstMesh = (part) => {
  let mesh = null;
  part?.traverse((child) => {
    mesh ??= child.isMesh ? child : null;
  });
  return mesh;
};

// The 500 ml bottle from the GLB: meshes named Body, Water, Label, Cap and (optionally) SealRing.
export function createBottle(gltf, { label, capNormal, condensation, capColor, droplets }) {
  const model = gltf.scene;
  const scale = fitModel(model, BOTTLE_HEIGHT);

  label.anisotropy = 8;
  capNormal.wrapS = THREE.RepeatWrapping;
  capNormal.repeat.set(CAP.knurlTiles, 1);
  condensation.wrapS = condensation.wrapT = THREE.RepeatWrapping;
  condensation.repeat.set(2, 2);

  const water = createWater(scale);
  const sloshUniforms = addSlosh(water);
  const capPlastic = createCapPlastic(capColor, capNormal);
  const body = firstMesh(dress(model, 'Body', createPlastic(scale, { condensation })));
  const waterMesh = firstMesh(dress(model, 'Water', water));
  const labelPart = dress(model, 'Label', createPaper(label));
  const cap = dress(model, 'Cap', capPlastic);
  const sealRing = dress(model, 'SealRing', capPlastic);

  // Centre the bottle on its pivot so it tilts about its middle. Euler order ZXY: spin about its own axis first.
  const offset = new THREE.Group();
  offset.position.y = -BOTTLE_HEIGHT / 2;
  offset.add(model);
  const group = new THREE.Group();
  group.rotation.order = 'ZXY';
  group.add(offset);
  group.updateMatrixWorld(true);

  if (body) body.add(createCondensation(body, { count: droplets, water: waterMesh, label: labelPart }));
  if (waterMesh) fitSlosh(sloshUniforms, waterMesh.geometry);
  const capPivot = pivotOnAxis(group, cap);
  const sealPivot = pivotOnAxis(group, sealRing);
  const mouth = new THREE.Vector3(0, capPivot ? capPivot.position.y : BOTTLE_HEIGHT / 2, 0);

  const surface = { x: 0, z: 0, velocityX: 0, velocityZ: 0 };
  let last = null;
  const surfaceNormal = new THREE.Vector3();
  const waterRotation = new THREE.Quaternion();

  return {
    group,
    scale,

    // World position of the bottle's mouth, where the rising droplets start.
    mouthPosition: (target) => group.localToWorld(target.copy(mouth)),

    update(stage, { time, delta, tilt, float, sway }) {
      const { x, y, rotX, rotY, rotZ, scale: size } = stage.bottle;
      group.position.set(x, y + float, 0);
      group.rotation.set(rotX + tilt.x, rotY + tilt.y + sway, rotZ);
      group.scale.setScalar(size);

      if (capPivot) {
        const turns = stage.cap.turn * CAP.turns;
        const { lift } = stage.cap;
        capPivot.rotation.set(0, turns * Math.PI * 2 + lift * 0.8, lift * 0.5);
        capPivot.position.set(lift * 0.35, capPivot.userData.rest + turns * CAP.pitch + lift * 0.9, 0);
      }
      if (sealPivot) sealPivot.position.y = sealPivot.userData.rest - SEAL_DROP * stage.seal;
      group.updateMatrixWorld();

      if (!waterMesh) return;
      const now = { rotX: group.rotation.x, rotZ: group.rotation.z, x: group.position.x };
      if (last && delta > 0) {
        // The surface chases how fast the bottle tilts (and slides sideways), then springs back to level.
        const targetX = (-(now.rotZ - last.rotZ) * SLOSH.follow - (now.x - last.x) * SLOSH.drift) / delta;
        const targetZ = ((now.rotX - last.rotX) * SLOSH.follow) / delta;
        surface.velocityX += (SLOSH.stiffness * (targetX - surface.x) - SLOSH.damping * surface.velocityX) * delta;
        surface.velocityZ += (SLOSH.stiffness * (targetZ - surface.z) - SLOSH.damping * surface.velocityZ) * delta;
        surface.x += surface.velocityX * delta;
        surface.z += surface.velocityZ * delta;
      }
      last = now;

      // World "up" (plus the slosh), expressed in the water mesh's own space, gives the surface slope there.
      surfaceNormal.set(surface.x, 1, surface.z).normalize();
      surfaceNormal.applyQuaternion(waterMesh.getWorldQuaternion(waterRotation).invert());
      sloshUniforms.uSlope.value.set(-surfaceNormal.x / surfaceNormal.y, -surfaceNormal.z / surfaceNormal.y);
      sloshUniforms.uWave.value = Math.min(Math.hypot(surface.velocityX, surface.velocityZ) * 0.012, 0.03);
      sloshUniforms.uTime.value = time;
    },
  };
}

function addSlosh(material) {
  const uniforms = {
    uLevel: { value: 1 },
    uFloor: { value: 0 },
    uCentre: { value: new THREE.Vector2() },
    uHalfWidth: { value: 1 },
    uSlope: { value: new THREE.Vector2() },
    uWave: { value: 0 },
    uTime: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${slosh}`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = sloshNormal(position, normal);')
      .replace('#include <begin_vertex>', 'vec3 transformed = sloshPosition(position);');
  };
  return uniforms;
}

function fitSlosh(uniforms, geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  uniforms.uLevel.value = max.y;
  uniforms.uFloor.value = min.y;
  uniforms.uCentre.value.set((min.x + max.x) / 2, (min.z + max.z) / 2);
  uniforms.uHalfWidth.value = (max.x - min.x) / 2;
}

// Moves a part onto a pivot on the bottle's axis, at the part's base, so it can turn about the neck.
function pivotOnAxis(group, part) {
  if (!part) return null;
  const pivot = new THREE.Group();
  pivot.position.y = new THREE.Box3().setFromObject(part).min.y;
  pivot.userData.rest = pivot.position.y;
  group.add(pivot);
  pivot.updateMatrixWorld();
  pivot.attach(part);
  return pivot;
}

// Tiny refracting beads on the walls below the water line, avoiding the label.
function createCondensation(body, { count, water, label }) {
  const bounds = (part) => (part ? new THREE.Box3().setFromObject(part) : null);
  const waterBox = bounds(water);
  const labelBox = bounds(label);
  const worldScale = body.getWorldScale(new THREE.Vector3()).x;

  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshPhysicalMaterial({ transmission: 1, thickness: 0.05 / worldScale, ior: 1.33, roughness: 0 }),
    count,
  );
  const sampler = new MeshSurfaceSampler(body).build();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const world = new THREE.Vector3();
  const droplet = new THREE.Object3D();
  const [smallest, largest] = CONDENSATION.size;
  let placed = 0;

  for (let attempt = 0; placed < count && attempt < count * 60; attempt += 1) {
    sampler.sample(point, normal);
    const y = body.localToWorld(world.copy(point)).y;
    const wet = !waterBox || y < waterBox.max.y;
    const onLabel = labelBox && y > labelBox.min.y - CONDENSATION.margin && y < labelBox.max.y + CONDENSATION.margin;
    if (Math.abs(normal.y) > 0.3 || !wet || onLabel) continue;

    const size = (smallest + Math.random() ** 3 * (largest - smallest)) / worldScale;
    droplet.position.copy(point);
    droplet.lookAt(world.copy(point).add(normal));
    droplet.scale.set(size, size * (1 + Math.random() * 0.4), size * 0.45);
    droplet.updateMatrix();
    mesh.setMatrixAt(placed, droplet.matrix);
    placed += 1;
  }
  mesh.count = placed;
  return mesh;
}
