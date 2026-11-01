// Builds the textures in public/textures: KTX2 from the label artwork in assets/labels, plus two generated normal
// maps, and a smaller copy of the studio HDRI in assets/hdri. Normal maps use the OpenGL convention (green points to
// the top of the image), like most texturing tools.
import { readFile, writeFile } from 'node:fs/promises';
import { encodeToKTX2 } from 'ktx2-encoder';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const OUTPUT = new URL('../public/textures/', import.meta.url);
const LABELS = new URL('../assets/labels/', import.meta.url);
const HDRI = new URL('../assets/hdri/', import.meta.url);

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

function smoothstep(edge0, edge1, value) {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// The studio HDRI the bottle reflects, shrunk `shrink` times each way (averaging the pixels it merges): it only
// lights the scene and gives soft reflections, so half size looks the same as the original at a quarter of the
// download. Written as Radiance RGBE with run-length-encoded scanlines, as three.js's HDRLoader reads it.
async function writeEnvironment(name, source, shrink) {
  const file = await readFile(new URL(source, HDRI));
  const loader = new HDRLoader().setDataType(THREE.FloatType);
  const { width, height, data } = loader.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const w = width / shrink;
  const h = height / shrink;
  const scanlines = [];
  for (let y = 0; y < h; y += 1) {
    const channels = [0, 1, 2, 3].map(() => new Uint8Array(w));
    for (let x = 0; x < w; x += 1) {
      const sum = [0, 0, 0];
      for (let dy = 0; dy < shrink; dy += 1) {
        for (let dx = 0; dx < shrink; dx += 1) {
          const i = ((y * shrink + dy) * width + x * shrink + dx) * 4;
          for (let c = 0; c < 3; c += 1) sum[c] += data[i + c];
        }
      }
      rgbe(sum.map((value) => value / shrink ** 2)).forEach((byte, c) => {
        channels[c][x] = byte;
      });
    }
    scanlines.push(Uint8Array.of(2, 2, w >> 8, w & 255), ...channels.map(runLength));
  }
  const header = new TextEncoder().encode(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`);
  const bytes = Buffer.concat([header, ...scanlines]);
  await writeFile(new URL(name, OUTPUT), bytes);
  console.log(`textures/${name}: ${w}×${h}, ${Math.round(bytes.byteLength / 1024)} KB`);
}

// A colour as RGBE: three 8-bit mantissas sharing one exponent, set by the brightest channel.
function rgbe([r, g, b]) {
  const brightest = Math.max(r, g, b);
  if (brightest < 1e-32) return [0, 0, 0, 0];
  const exponent = Math.floor(Math.log2(brightest)) + 1;
  const scale = 256 / 2 ** exponent;
  return [r, g, b].map((value) => Math.min(255, Math.floor(value * scale))).concat(exponent + 128);
}

// One channel of a scanline, run-length encoded: runs of three or more equal bytes as (128 + count, byte), anything
// else as (count, bytes…), at most 127 and 128 bytes at a time.
function runLength(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let run = 1;
    while (i + run < bytes.length && run < 127 && bytes[i + run] === bytes[i]) run += 1;
    if (run >= 3) {
      out.push(128 + run, bytes[i]);
      i += run;
      continue;
    }
    const start = i;
    while (i < bytes.length && i - start < 128 && !(bytes[i] === bytes[i + 1] && bytes[i] === bytes[i + 2])) i += 1;
    if (i === start) i += 1;
    out.push(i - start, ...bytes.subarray(start, i));
  }
  return Uint8Array.from(out);
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
await writeEnvironment('studio.hdr', 'studio-small-09-1k.hdr', 2);
