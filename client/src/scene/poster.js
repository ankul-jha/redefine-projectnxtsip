import * as THREE from 'three';
import { MAX_LETTERS } from './layout.js';

// The opening and closing posters behind the bottle: where the hero's white disc sits and how large it is, and where
// each letter of the poster's word stands, sized as large as the page's copy around it allows. The backdrop's shader
// draws the disc; word.js builds the letters in 3D from this layout. Only one poster shows at a time.
export function createPoster() {
  // A canvas only to measure the word in the display face, as the page sets it.
  const ctx = document.createElement('canvas').getContext('2d');
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display');
  // The disc (centre in uv, radius in screen heights; 0 for none) and the word: its font size and its letters, in
  // the frame's pixels from the top left. `version` counts layouts, so the word knows when to rebuild.
  const layout = { disc: new THREE.Vector3(), fontSize: 0, letters: [], name: 'hero', version: 0 };
  let frame = null;
  let words = { cta: '' };

  function draw() {
    if (!frame) return;
    const { width: w, height: h } = frame;
    const { x, y } = frame.centres[layout.name];
    const text = words[layout.name] ?? '';
    const { radius, fontSize } = POSTERS[layout.name]({ ctx, w, h, x: x * w, y: y * h, clear: frame.clear[layout.name] }, frame, {
      text,
      family,
    });
    layout.disc.set(x, 1 - y, radius / h);
    layout.fontSize = fontSize;
    layout.letters = placeLetters(ctx, text, { x: x * w, y: y * h, fontSize, family });
    layout.version += 1;
  }

  // The words are set in the display face; lay them out again once it has loaded.
  document.fonts.load(`800 100px ${family}`).then(draw);

  return {
    layout,
    // `width` and `height` are the frame's, in device pixels. `centres` holds each poster's centre (where the
    // bottle stands), as shares of the width and height; `heroScale` shrinks the opening poster on narrower
    // screens; `clear` lists, per poster, the boxes of page copy (in device pixels) that its disc and word keep
    // out of.
    resize(width, height, { centres, compact, heroScale, clear }) {
      frame = { width, height, centres, compact, heroScale, clear };
      draw();
    },
    setWords(next) {
      words = next;
      draw();
    },
    show(name) {
      if (name === layout.name) return;
      layout.name = name;
      draw();
    },
  };
}

// Each poster sizes its word (and the hero its disc), in frame pixels.
const POSTERS = {
  // A disc behind the bottle, as large as the copy around it allows. (The hero's words go round its ring instead.)
  hero({ w, h, x, y, clear }, { compact, heroScale }) {
    let radius = Math.min(h * (compact ? 0.25 : 0.37), w * 0.46) * heroScale;
    for (const rect of clear) radius = Math.min(radius, distanceTo(rect, x, y));
    return { radius: Math.max(radius, 0), fontSize: 0 };
  },

  // The word alone on the white block.
  cta({ ctx, w, h, x, y, clear }, { compact }, { text, family }) {
    const widest = fittedSize(ctx, text, family, w * (compact ? 0.92 : 0.86));
    const fontSize = clearedSize(ctx, text, family, { x, y, clear, fontSize: Math.min(widest, h * (compact ? 0.17 : 0.32)) });
    return { radius: 0, fontSize };
  },
};

// Where each letter of the word stands when the word is centred on (x, y): its pen position, its baseline and its
// glyph's box. Letters are measured in place, so kerning and letter spacing come out as in the whole word. Spaces
// take room but are not letters; past MAX_LETTERS, neighbouring letters move together in groups.
function placeLetters(ctx, text, { x, y, fontSize, family }) {
  setFont(ctx, fontSize, family);
  const whole = ctx.measureText(text);
  const left = x - (whole.actualBoundingBoxRight - whole.actualBoundingBoxLeft) / 2;
  const baseline = y + (whole.actualBoundingBoxAscent - whole.actualBoundingBoxDescent) / 2;
  const chars = [...text];
  const visible = chars.flatMap((char, index) => (char.trim() ? [index] : []));
  const perGroup = Math.max(1, Math.ceil(visible.length / MAX_LETTERS));
  const groups = [];
  for (let start = 0; start < visible.length; start += perGroup) groups.push(visible.slice(start, start + perGroup));

  return groups.map((indices) => {
    const from = indices[0];
    const piece = chars.slice(from, indices.at(-1) + 1).join('');
    const pen = left + ctx.measureText(chars.slice(0, from).join('')).width;
    const metrics = ctx.measureText(piece);
    return {
      text: piece,
      pen,
      baseline,
      left: pen - metrics.actualBoundingBoxLeft,
      right: pen + metrics.actualBoundingBoxRight,
      top: baseline - metrics.actualBoundingBoxAscent,
      bottom: baseline + metrics.actualBoundingBoxDescent,
    };
  });
}

// Distance from (x, y) to the nearest point of a box.
const distanceTo = (rect, x, y) =>
  Math.hypot(Math.max(rect.x - x, 0, x - rect.x - rect.width), Math.max(rect.y - y, 0, y - rect.y - rect.height));

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function setFont(ctx, fontSize, family) {
  ctx.font = `800 ${fontSize}px ${family}`;
  ctx.letterSpacing = `${-0.05 * fontSize}px`;
  ctx.textAlign = 'left';
}

// The font size at which `text` spans `width`.
function fittedSize(ctx, text, family, width) {
  setFont(ctx, 100, family);
  return (100 * width) / Math.max(ctx.measureText(text).width, 1);
}

// The box the word's glyphs cover when centred on (x, y).
function wordBox(ctx, text, x, y) {
  const metrics = ctx.measureText(text);
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  return { x: x - width / 2, y: y - height / 2, width, height };
}

// Shrinks the word, centred on (x, y), until it touches none of the `clear` boxes (or reaches a third of its size).
function clearedSize(ctx, text, family, { x, y, clear, fontSize }) {
  let size = fontSize;
  for (let step = 0; step < 12; step += 1) {
    setFont(ctx, size, family);
    if (!clear.some((rect) => overlaps(rect, wordBox(ctx, text, x, y)))) break;
    size *= 0.92;
  }
  return size;
}
