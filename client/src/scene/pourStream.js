import * as THREE from 'three';
import stream from '../shaders/stream.glsl?raw';

const TUBE = { segments: 420, sides: 14 };
const FLOW_SPEED = 0.9; // normal-map scroll along the stream, per second
const smoothstep = THREE.MathUtils.smoothstep;

// The pour's path in the bottle's frame (bottle centred, 2.72 tall): a column falling from above the frame onto the
// shoulder, then a ribbon wrapping the bottle once on its way down to splash at the front.
function createPath() {
  const points = [new THREE.Vector3(0.05, 6, 0.3), new THREE.Vector3(0.08, 3.6, 0.34), new THREE.Vector3(0.16, 1.9, 0.42)];
  const steps = 30;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const angle = 0.35 + t * 1.1 * Math.PI * 2;
    const radius = THREE.MathUtils.lerp(0.6, 0.8, t);
    points.push(new THREE.Vector3(Math.sin(angle) * radius, THREE.MathUtils.lerp(1.55, -1.3, t ** 1.1), Math.cos(angle) * radius));
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

// A tube along the path whose round section flattens into a ribbon facing out from the bottle, with a slow twist.
// Each vertex also stores its ring's centre, which the shader collapses onto outside the visible stretch.
function createRibbon(path) {
  const { segments, sides } = TUBE;
  const positions = [];
  const centres = [];
  const uvs = [];
  const indices = [];
  const centre = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const outward = new THREE.Vector3();
  const across = new THREE.Vector3();
  const facing = new THREE.Vector3();
  const towardCamera = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    path.getPointAt(u, centre);
    path.getTangentAt(u, tangent);
    outward.set(centre.x, 0, centre.z).normalize().lerp(towardCamera, 1 - smoothstep(Math.hypot(centre.x, centre.z), 0.3, 0.6));
    across.crossVectors(tangent, outward).normalize();
    facing.crossVectors(across, tangent).normalize();
    const twist = Math.sin(u * 13) * 0.5;
    const ribbon = smoothstep(u, 0.08, 0.2);
    const width = THREE.MathUtils.lerp(0.05, 0.15, ribbon) * (1 - smoothstep(u, 0.96, 1) * 0.7);
    const thickness = THREE.MathUtils.lerp(0.05, 0.036, ribbon);

    for (let j = 0; j <= sides; j += 1) {
      const angle = (j / sides) * Math.PI * 2;
      const a = Math.cos(angle) * width;
      const b = Math.sin(angle) * thickness;
      const along = a * Math.cos(twist) - b * Math.sin(twist);
      const out = a * Math.sin(twist) + b * Math.cos(twist);
      positions.push(
        centre.x + across.x * along + facing.x * out,
        centre.y + across.y * along + facing.y * out,
        centre.z + across.z * along + facing.z * out,
      );
      centres.push(centre.x, centre.y, centre.z);
      uvs.push(u, j / sides);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < sides; j += 1) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aCentre', new THREE.Float32BufferAttribute(centres, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// The water poured in section C: a transmissive ribbon with a scrolling normal map. Its blue tint and strong
// reflections keep it readable against the pale backdrop.
export function createPourStream(normalMap) {
  const path = createPath();
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(14, 1);

  const uniforms = { uHead: { value: 0 }, uTail: { value: 0 } };
  const material = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.18,
    ior: 1.33,
    roughness: 0.03,
    normalMap,
    normalScale: new THREE.Vector2(0.45, -0.45),
    attenuationColor: new THREE.Color('#6aa9dc'),
    attenuationDistance: 0.4,
    envMapIntensity: 1.5,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${stream}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = streamPosition(position, uv.x);');
  };

  const mesh = new THREE.Mesh(createRibbon(path), material);
  const end = path.getPointAt(1);

  return {
    mesh,
    // Where the stream lands, in world space.
    endPosition: (target) => mesh.localToWorld(target.copy(end)),
    update(stage, { time, rest }) {
      const { head, tail } = stage.pour;
      mesh.visible = head - tail > 0.001;
      mesh.position.y = rest;
      uniforms.uHead.value = head;
      uniforms.uTail.value = tail;
      normalMap.offset.x = -time * FLOW_SPEED;
    },
  };
}
