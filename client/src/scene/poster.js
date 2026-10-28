import * as THREE from 'three';

const MAX_WIDTH = 2560;
const DROP_TURN = -0.16; // the hero's drop leans the same way as the bottle

function createLayer() {
  const canvas = document.createElement('canvas');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return { canvas, texture, ctx: canvas.getContext('2d') };
}

// The printed layer behind the bottle at the start and the end of the story, drawn on 2D canvases the size of the
// frame: a large shape in the logo's azure, and one bold word over it on a layer of its own (the backdrop leaves
// the word out of what the bottle refracts). Only one poster shows at a time.
export function createPoster(palette) {
  const shape = createLayer();
  const word = createLayer();
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans');
  let frame = null;
  let words = { hero: '', cta: '' };
  let shown = 'hero';

  function draw() {
    if (!frame) return;
    const shrink = Math.min(1, MAX_WIDTH / frame.width);
    const w = Math.round(frame.width * shrink);
    const h = Math.round(frame.height * shrink);
    for (const layer of [shape, word]) {
      // A texture's GPU storage keeps its first size: when the frame is resized, release it so the next upload
      // allocates the new size instead of stretching the old one.
      if (layer.canvas.width !== w || layer.canvas.height !== h) layer.texture.dispose();
      layer.canvas.width = w;
      layer.canvas.height = h;
      layer.texture.needsUpdate = true;
    }
    const { x, y } = frame.centres[shown];
    POSTERS[shown]({ shape: shape.ctx, word: word.ctx, w, h, x: x * w, y: y * h }, frame, {
      text: words[shown],
      family,
      palette,
    });
  }

  // The words are set in the page's sans; draw again once that font has loaded.
  document.fonts.load(`800 100px ${family}`).then(draw);

  return {
    shape: shape.texture,
    word: word.texture,
    // `centres` holds each poster's centre (where the bottle stands), as shares of the width and height;
    // `heroScale` shrinks the opening poster on narrower screens, and its word keeps out of `clear`, the corner
    // above and right of { left, bottom } (shares), where the hero's intro sits.
    resize(width, height, { centres, compact, heroScale, clear }) {
      frame = { width, height, centres, compact, heroScale, clear };
      draw();
    },
    setWords(next) {
      words = next;
      draw();
    },
    show(name) {
      if (name === shown) return;
      shown = name;
      draw();
    },
  };
}

const POSTERS = {
  // A tall drop, tilted, with the word across its middle.
  hero({ shape, word, w, h, x, y }, { compact, heroScale, clear }, { text, family, palette }) {
    const dropHeight = Math.min(h * (compact ? 0.44 : 0.8), (w * 0.86) / 0.68) * heroScale;
    shape.save();
    shape.translate(x - dropHeight * 0.03, y + dropHeight * 0.02);
    shape.rotate(DROP_TURN);
    shape.scale(dropHeight / 2, dropHeight / 2);
    dropPath(shape);
    shape.fillStyle = palette.brand;
    shape.fill();
    shape.restore();

    let fontSize = (compact ? Math.min(w * 0.4, h * 0.2) : Math.min(w * 0.27, h * 0.5)) * heroScale;
    if (clear) {
      // Shrink until the word ends left of the intro or starts below it, whichever needs less.
      setFont(word, fontSize, family);
      const metrics = word.measureText(text);
      const halfWidth = metrics.width / 2;
      const halfHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 2;
      const gap = h * 0.03;
      const sideways = (clear.left * w - gap - x) / halfWidth;
      const downwards = (y - clear.bottom * h - gap) / halfHeight;
      fontSize *= THREE.MathUtils.clamp(Math.max(sideways, downwards), 0.5, 1);
    }
    centredWord(word, text, { x, y, fontSize, family, color: palette.stone });
  },

  // A round pool of colour circled by thin ripples, with the word across it.
  cta({ shape, word, w, h, x, y }, { compact }, { text, family, palette }) {
    const radius = Math.min(h * (compact ? 0.2 : 0.26), w * 0.4);
    shape.fillStyle = palette.brand;
    shape.beginPath();
    shape.arc(x, y, radius, 0, Math.PI * 2);
    shape.fill();
    shape.strokeStyle = palette.stone;
    shape.lineWidth = Math.max(1, h / 700);
    for (const ring of [1.14, 1.28]) {
      shape.globalAlpha = 1.5 - ring;
      shape.beginPath();
      shape.arc(x, y, radius * ring, 0, Math.PI * 2);
      shape.stroke();
    }
    shape.globalAlpha = 1;

    const fontSize = Math.min(fittedSize(word, text, family, w * (compact ? 0.92 : 0.84)), h * (compact ? 0.16 : 0.3));
    centredWord(word, text, { x, y, fontSize, family, color: palette.stone });
  },
};

function setFont(ctx, fontSize, family) {
  ctx.font = `800 ${fontSize}px ${family}`;
  ctx.letterSpacing = `${-0.045 * fontSize}px`;
}

// The font size at which `text` spans `width`.
function fittedSize(ctx, text, family, width) {
  setFont(ctx, 100, family);
  return (100 * width) / Math.max(ctx.measureText(text).width, 1);
}

function centredWord(ctx, text, { x, y, fontSize, family, color }) {
  setFont(ctx, fontSize, family);
  ctx.textAlign = 'center';
  const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = ctx.measureText(text);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + (ascent - descent) / 2);
}

// A drop with its tip at (0, -1) and its round base at (0, 1).
function dropPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(0.18, -0.6, 0.68, -0.2, 0.68, 0.32);
  ctx.bezierCurveTo(0.68, 0.72, 0.38, 1, 0, 1);
  ctx.bezierCurveTo(-0.38, 1, -0.68, 0.72, -0.68, 0.32);
  ctx.bezierCurveTo(-0.68, -0.2, -0.18, -0.6, 0, -1);
  ctx.closePath();
}
