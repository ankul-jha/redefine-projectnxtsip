// Builds the KTX2 textures in public/textures: the label artwork in assets/labels, plus three generated normal maps.
// Normal maps use the OpenGL convention (green points to the top of the image), like most texturing tools.
import { readFile, writeFile } from 'node:fs/promises';
import { encodeToKTX2 } from 'ktx2-encoder';
import { PNG } from 'pngjs';

const OUTPUT = new URL('../public/textures/', import.meta.url);
const LABELS = new URL('../assets/labels/', import.meta.url);

const COLOR = { isUASTC: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, enableRDO: true, rdoQualityLevel: 1 };
const NORMAL = { isUASTC: true, isNormalMap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false };

async function writeKTX2(name, image, options) {
  // The encoder asks for a decoded RGBA image, which is what we already have.
  const data = await encodeToKTX2(image.data, { ...options, generateMipmap: true, imageDecoder: async () => image });
  await writeFile(new URL(name, OUTPUT), data);
  console.log(`textures/${name}: ${image.width}×${image.height}, ${Math.round(data.byteLength / 1024)} KB`);
}

async function readLabel(file) {
  const png = PNG.sync.read(await readFile(new URL(file, LABELS)));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

// Turns a height field (in pixels) into a normal map. Rows wrap only when `tileY` is set.
function normalMap(width, height, heightAt, { tileY = true } = {}) {
  const data = new Uint8Array(width * height * 4);
  const row = (y) => (tileY ? (y + height) % height : Math.min(Math.max(y, 0), height - 1));
  const h = (x, y) => heightAt((x + width) % width, row(y));
  const encode = (value) => Math.round((value * 0.5 + 0.5) * 255);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = -(h(x + 1, y) - h(x - 1, y)) / 2;
      const ny = (h(x, y + 1) - h(x, y - 1)) / 2;
      const length = Math.hypot(nx, ny, 1);
      data.set([encode(nx / length), encode(ny / length), encode(1 / length), 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

// Knurling for the cap wall: four ridges per tile, repeated around the cap at runtime.
// The top rows stay flat because the cap's top, its fillet and the seal ring are mapped there (see build-models.mjs).
function capRidges() {
  const size = 64;
  return normalMap(
    size,
    size,
    (x, y) => 4 * (0.5 - 0.5 * Math.cos((2 * Math.PI * 4 * x) / size)) * smoothstep(0.1, 0.2, y / size),
    { tileY: false },
  );
}

// Condensation on the PET: scattered droplets, slightly taller than they are wide, tiling seamlessly.
function condensation() {
  const size = 512;
  const heights = new Float32Array(size * size);
  const random = seeded(7);

  for (let n = 0; n < 380; n += 1) {
    const cx = random() * size;
    const cy = random() * size;
    const rx = 1.5 + 11 * random() ** 3;
    const ry = rx * (1 + 0.3 * random());
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d >= 1) continue;
        const i = ((y + size) % size) * size + ((x + size) % size);
        heights[i] = Math.max(heights[i], 0.6 * rx * Math.sqrt(1 - d));
      }
    }
  }
  return normalMap(size, size, (x, y) => heights[y * size + x]);
}

// Running water for the pour stream: value noise stretched along u, the length of the stream.
function waterFlow() {
  const size = 256;
  const octaves = [
    { cells: [3, 12], amplitude: 3.5 },
    { cells: [6, 24], amplitude: 1.8 },
    { cells: [12, 48], amplitude: 0.8 },
    { cells: [24, 96], amplitude: 0.35 },
  ].map((octave, i) => ({ ...octave, noise: tilingNoise(octave.cells, seeded(11 + i)) }));
  return normalMap(size, size, (x, y) =>
    octaves.reduce((sum, { noise, amplitude }) => sum + amplitude * noise(x / size, y / size), 0),
  );
}

// Value noise on a periodic lattice of [columns, rows] cells, so it tiles across the unit square.
function tilingNoise([columns, rows], random) {
  const lattice = Float32Array.from({ length: columns * rows }, random);
  const at = (i, j) => lattice[(j % rows) * columns + (i % columns)];
  return (u, v) => {
    const x = u * columns;
    const y = v * rows;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = smoothstep(0, 1, x - i);
    const fy = smoothstep(0, 1, y - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// A small seeded generator (mulberry32), so the maps come out the same on every run.
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

await writeKTX2('label-bottle.ktx2', await readLabel('bottle.png'), COLOR);
await writeKTX2('label-jar.ktx2', await readLabel('jar.png'), COLOR);
await writeKTX2('cap-normal.ktx2', capRidges(), NORMAL);
await writeKTX2('condensation-normal.ktx2', condensation(), NORMAL);
await writeKTX2('water-normal.ktx2', waterFlow(), NORMAL);
