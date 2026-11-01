// Builds the placeholder models in public/models as Draco-compressed GLB files (glTF units: metres).
// Replace them with your own exports: the site only relies on the mesh names listed in the README.
import { mkdir } from 'node:fs/promises';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const OUTPUT = new URL('../public/models/', import.meta.url);
const TAU = Math.PI * 2;
const { lerp } = THREE.MathUtils;

// The 500 ml bottle is drawn in design units and exported 20.5 cm tall. In section its body is a squircle, a
// superellipse |x|ⁿ + |z|ⁿ = halfⁿ with n = `squircle`: between a circle (n = 2) and a square (n → ∞). The
// shoulder eases it into the round neck.
const BOTTLE = { half: 0.36, squircle: 4, neck: 0.142, height: 2.72, columns: 160, metres: 0.205 / 2.72 };
const CIRCLE = 2;
const SHOULDER = { start: 1.95, end: 2.38 };
const WATER = { inset: 0.018, level: 1.84, surfaceRings: 14 };
const LABEL = { bottom: 0.62, top: 1.46, lift: 0.004 };
const CAP = { y: 2.545, radius: 0.165, height: 0.19, fillet: 0.025, wall: 0.014, segments: 160 };
const SEAL_RING = { inner: 0.144, outer: 0.168, y: 2.505, height: 0.035 };
const THREAD = { radius: 0.144, y: 2.57, pitch: 0.055, turns: 2, thickness: 0.006 };

// The 20 litre jar is drawn directly in metres.
const JAR = { radius: 0.135, height: 0.49, neck: 0.028, segments: 128 };

// Points around a unit superellipse of the given exponent, `columns` + 1 of them at equal steps of arc length, so
// the label wraps round without stretching. They start at the back (0, -1) and run through the right side to the
// front (halfway round, where the label's centre faces the camera).
const outlines = new Map();
function unitOutline(exponent) {
  if (outlines.has(exponent)) return outlines.get(exponent);
  const samples = 4096;
  const points = [];
  const lengths = [0];
  for (let i = 0; i <= samples; i += 1) {
    const angle = (i / samples) * TAU;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    points.push({ x: Math.sign(sin) * Math.abs(sin) ** (2 / exponent), z: -Math.sign(cos) * Math.abs(cos) ** (2 / exponent) });
    if (i > 0) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  }

  const outline = [];
  let k = 0;
  for (let j = 0; j <= BOTTLE.columns; j += 1) {
    const along = (j / BOTTLE.columns) * lengths[samples];
    while (k < samples - 1 && lengths[k + 1] < along) k += 1;
    const t = (along - lengths[k]) / (lengths[k + 1] - lengths[k] || 1);
    outline.push({ x: lerp(points[k].x, points[k + 1].x, t), z: lerp(points[k].z, points[k + 1].z, t) });
  }
  outlines.set(exponent, outline);
  return outline;
}

// Sweeps sections ({ y, half, exponent }) into a tube. u runs around the outline, v comes from `v(row, index)`.
function sweep(rows, v) {
  const positions = [];
  const uvs = [];
  const indices = [];

  rows.forEach((row, i) => {
    unitOutline(row.exponent).forEach((point, j) => {
      positions.push(point.x * row.half, row.y, point.z * row.half);
      uvs.push(1 - j / BOTTLE.columns, v(row, i));
    });
  });
  const stride = BOTTLE.columns + 1;
  for (let i = 0; i < rows.length - 1; i += 1) {
    for (let j = 0; j < BOTTLE.columns; j += 1) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return toGeometry(positions, uvs, indices);
}

// Closes a section with concentric rings, so a surface can be displaced smoothly (the water top uses this).
function cover(row, rings, facingUp) {
  const scaled = Array.from({ length: rings }, (_, k) => ({ ...row, half: row.half * (1 - k / rings) }));
  const geometry = sweep([...scaled, { ...row, half: 1e-4 }], () => 0);
  if (!facingUp) flipWinding(geometry);
  return geometry;
}

function toGeometry(positions, uvs, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function flipWinding(geometry) {
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
  geometry.computeVertexNormals();
}

// The bottle's sections from the bottom up.
function bottleOutline() {
  const { half, squircle, neck } = BOTTLE;
  const rows = [];
  const add = (y, size, exponent) => rows.push({ y, half: size, exponent });

  // The foot, rounded under so the bottle stands on a slightly smaller squircle.
  for (let i = 0; i <= 6; i += 1) {
    const angle = (i / 6) * (Math.PI / 2);
    add(0.05 * (1 - Math.cos(angle)), half - 0.05 * (1 - Math.sin(angle)), squircle);
  }
  // The body, straight up to the shoulder.
  for (let i = 0; i <= 12; i += 1) add(0.05 + (i / 12) * (SHOULDER.start - 0.05), half, squircle);
  // The shoulder narrows into the neck, rounding off into a circle on the way.
  for (let i = 1; i <= 24; i += 1) {
    const t = i / 24;
    add(lerp(SHOULDER.start, SHOULDER.end, t), lerp(half, neck, t * t * (3 - 2 * t)), lerp(squircle, CIRCLE, t ** 0.6));
  }
  add(2.47, neck, CIRCLE);
  add(2.475, 0.182, CIRCLE);
  add(2.495, 0.182, CIRCLE);
  add(2.5, neck, CIRCLE);
  add(BOTTLE.height, neck, CIRCLE);
  add(BOTTLE.height, neck - 0.016, CIRCLE);
  add(2.56, neck - 0.016, CIRCLE);
  return rows;
}

// The section of the outline at height y, inset by `inset` (for the water inside the walls).
function sectionAt(rows, y, inset) {
  const to = rows.findIndex((row, i) => i > 0 && row.y >= y && row.y > rows[i - 1].y);
  const a = rows[to - 1];
  const b = rows[to];
  const t = (y - a.y) / (b.y - a.y);
  return { y, half: lerp(a.half, b.half, t) - inset, exponent: lerp(a.exponent, b.exponent, t) };
}

function buildBottle() {
  const outline = bottleOutline();
  const byHeight = (row) => row.y / BOTTLE.height;

  const shell = sweep(outline, byHeight);
  const base = cover(outline[0], 6, false);
  const thread = new THREE.TubeGeometry(new Helix(), 200, THREAD.thickness, 6);
  thread.deleteAttribute('tangent');

  const waterRows = [];
  for (let i = 0; i <= 12; i += 1) {
    const y = WATER.inset + (i / 12) * (WATER.level - WATER.inset);
    waterRows.push(sectionAt(outline, Math.max(y, 0.002), WATER.inset));
  }
  const water = [sweep(waterRows, byHeight), cover(waterRows[0], 6, false), cover(waterRows.at(-1), WATER.surfaceRings, true)];

  const labelRow = { half: BOTTLE.half + LABEL.lift, exponent: BOTTLE.squircle };
  const label = sweep(
    [
      { y: LABEL.bottom, ...labelRow },
      { y: LABEL.top, ...labelRow },
    ],
    (_, i) => i,
  );

  return [
    { name: 'Body', material: 'PET', geometry: mergeGeometries([shell, base, thread]) },
    { name: 'Water', material: 'Water', geometry: mergeGeometries(water) },
    { name: 'Label', material: 'Label', geometry: label },
    { name: 'SealRing', material: 'Cap', geometry: sealRingGeometry() },
    { name: 'Cap', material: 'Cap', geometry: capGeometry() },
  ].map((part) => ({ ...part, geometry: part.geometry.scale(BOTTLE.metres, BOTTLE.metres, BOTTLE.metres) }));
}

// A hollow cap, profiled from the inside top centre, down the inner wall and up the knurled outer wall.
// u runs around the cap. The knurled wall uses v 0–0.8 of the normal map; every other surface sits at v = 0.95, where
// the map is flat.
function capGeometry() {
  const { radius, height, fillet, wall } = CAP;
  const profile = [
    [0, height - wall],
    [radius - wall, height - wall],
    [radius - wall, 0],
    [radius, 0],
  ];
  const knurlStart = profile.length - 1;
  for (let i = 1; i <= 8; i += 1) profile.push([radius, ((height - fillet) * i) / 8]);
  const knurlEnd = profile.length - 1;
  for (let i = 1; i <= 6; i += 1) {
    const angle = (i / 6) * (Math.PI / 2);
    profile.push([radius - fillet + Math.cos(angle) * fillet, height - fillet + Math.sin(angle) * fillet]);
  }
  profile.push([0, height]);

  const geometry = new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    CAP.segments,
  );
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const j = i % profile.length;
    uv.setY(i, j >= knurlStart && j <= knurlEnd ? (profile[j][1] / (height - fillet)) * 0.8 : 0.95);
  }
  return geometry.translate(0, CAP.y, 0);
}

function sealRingGeometry() {
  const { inner, outer, y, height } = SEAL_RING;
  const geometry = new THREE.LatheGeometry(
    [
      [inner, y],
      [outer, y],
      [outer, y + height],
      [inner, y + height],
      [inner, y],
    ].map(([x, h]) => new THREE.Vector2(x, h)),
    96,
  );
  geometry.attributes.uv.array.fill(0.95);
  return geometry;
}

class Helix extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * THREAD.turns * TAU;
    return target.set(
      Math.cos(angle) * THREAD.radius,
      THREAD.y + t * THREAD.turns * THREAD.pitch,
      Math.sin(angle) * THREAD.radius,
    );
  }
}

// A 20 litre polycarbonate jar with two grip grooves, a band label and a snap cap.
function buildJar() {
  const { radius, height, neck } = JAR;
  const outline = [[0, 0]];
  for (let i = 0; i <= 6; i += 1) {
    const angle = (i / 6) * (Math.PI / 2);
    outline.push([radius - 0.016 + Math.sin(angle) * 0.016, 0.016 - Math.cos(angle) * 0.016]);
  }
  for (let i = 1; i <= 40; i += 1) {
    const y = 0.016 + (i / 40) * (0.36 - 0.016);
    const groove = Math.max(0, 1 - Math.abs(y - 0.11) / 0.012) + Math.max(0, 1 - Math.abs(y - 0.2) / 0.012);
    outline.push([radius - 0.007 * Math.sin((groove * Math.PI) / 2), y]);
  }
  for (let i = 1; i <= 24; i += 1) {
    const t = i / 24;
    outline.push([THREE.MathUtils.lerp(radius, neck, 1 - Math.cos((t * Math.PI) / 2)), 0.36 + Math.sin((t * Math.PI) / 2) * 0.09]);
  }
  outline.push([neck, 0.47], [neck + 0.004, 0.472], [neck + 0.004, 0.478], [neck - 0.003, 0.478], [neck - 0.003, 0.455]);

  const lathe = (points, segments = JAR.segments) => {
    const geometry = new THREE.LatheGeometry(
      points.map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setY(i, points[i % points.length][1] / height);
    return geometry;
  };

  const waterLevel = 0.41;
  const water = outline
    .filter(([, y]) => y < waterLevel)
    .map(([x, y]) => [Math.max(x - 0.004, 0), Math.max(y, 0.004)]);
  const top = outline.findIndex(([, y]) => y >= waterLevel);
  const [x0, y0] = outline[top - 1];
  const [x1, y1] = outline[top];
  water.push([THREE.MathUtils.lerp(x0, x1, (waterLevel - y0) / (y1 - y0)) - 0.004, waterLevel], [0, waterLevel]);

  // Starting at the back puts the label seam behind the jar and its centre (u = 0.5) at the front.
  const label = new THREE.CylinderGeometry(radius + 0.0008, radius + 0.0008, 0.09, JAR.segments, 1, true, Math.PI);
  label.translate(0, 0.285, 0);

  const cap = lathe([
    [0, 0.47],
    [neck + 0.007, 0.47],
    [neck + 0.007, 0.497],
    [neck + 0.002, 0.5],
    [0, 0.5],
  ]);
  cap.attributes.uv.array.fill(0.95);

  return [
    { name: 'Body', material: 'Polycarbonate', geometry: lathe(outline) },
    { name: 'Water', material: 'Water', geometry: lathe(water) },
    { name: 'Label', material: 'Label', geometry: label },
    { name: 'Cap', material: 'Cap', geometry: cap },
  ];
}

const MATERIALS = {
  PET: { color: [0.93, 0.97, 1, 0.25], roughness: 0.05 },
  Polycarbonate: { color: [0.85, 0.93, 1, 0.3], roughness: 0.08 },
  Water: { color: [0.86, 0.94, 1, 0.2], roughness: 0.02 },
  Label: { color: [0.96, 0.96, 0.94, 1], roughness: 0.85 },
  Cap: { color: [0.29, 0.49, 0.58, 1], roughness: 0.6 },
};

async function writeModel(io, file, parts) {
  const document = new Document();
  const buffer = document.createBuffer();
  const scene = document.createScene(file.replace('.glb', ''));
  const materials = {};
  const accessor = (array, type) => document.createAccessor().setArray(array).setType(type).setBuffer(buffer);

  for (const { name, material, geometry } of parts) {
    const { color, roughness } = MATERIALS[material];
    materials[material] ??= document
      .createMaterial(material)
      .setBaseColorFactor(color)
      .setAlphaMode(color[3] < 1 ? 'BLEND' : 'OPAQUE')
      .setRoughnessFactor(roughness)
      .setMetallicFactor(0)
      .setDoubleSided(color[3] < 1);

    // glTF puts the texture origin at the top left, so v is flipped from the three.js convention used above.
    const uv = geometry.attributes.uv.array.map((value, i) => (i % 2 === 1 ? 1 - value : value));

    const primitive = document
      .createPrimitive()
      .setAttribute('POSITION', accessor(geometry.attributes.position.array, 'VEC3'))
      .setAttribute('NORMAL', accessor(geometry.attributes.normal.array, 'VEC3'))
      .setAttribute('TEXCOORD_0', accessor(uv, 'VEC2'))
      .setIndices(accessor(new Uint32Array(geometry.index.array), 'SCALAR'))
      .setMaterial(materials[material]);
    scene.addChild(document.createNode(name).setMesh(document.createMesh(name).addPrimitive(primitive)));
  }

  await document.transform(dedup(), draco());
  await io.write(new URL(file, OUTPUT).pathname, document);
  console.log(`models/${file}: ${parts.map((part) => part.name).join(', ')}`);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
await mkdir(OUTPUT, { recursive: true });
await writeModel(io, 'nxtsip-bottle.glb', buildBottle());
await writeModel(io, 'nxtsip-jar.glb', buildJar());
