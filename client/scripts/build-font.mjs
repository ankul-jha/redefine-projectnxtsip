// Builds public/fonts/unbounded-800.json, the display face (Unbounded ExtraBold, SIL Open Font License) in the
// typeface format three.js extrudes into 3D letters (FontLoader, TextGeometry). Only the characters a poster word is
// likely to use are kept. Source: assets/fonts.
import { readFile, writeFile } from 'node:fs/promises';
import opentype from 'opentype.js';

const SOURCE = new URL('../assets/fonts/unbounded-latin-800-normal.woff', import.meta.url);
const OUTPUT = new URL('../public/fonts/unbounded-800.json', import.meta.url);
const CHARACTERS = `${Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join('')}’‘“”–—·•₹`;
// The typeface format's units: 1000 to the em, as three.js reads it.
const RESOLUTION = 1000;

const buffer = await readFile(SOURCE);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const scale = RESOLUTION / font.unitsPerEm;
const round = (value) => Math.round(value * scale);

// Each glyph's outline as the format's path string: m (move), l (line), q (quadratic) and b (cubic) commands, each
// followed by its end point and then its control points.
function outline(glyph) {
  return glyph.path.commands
    .map((command) => {
      const type = command.type === 'C' ? 'b' : command.type.toLowerCase();
      const points = [
        [command.x, command.y],
        [command.x1, command.y1],
        [command.x2, command.y2],
      ].filter(([x]) => x !== undefined);
      return [type, ...points.flatMap(([x, y]) => [round(x), round(y)])].join(' ');
    })
    .join(' ');
}

const glyphs = {};
for (const char of CHARACTERS) {
  const glyph = font.charToGlyph(char);
  if (!glyph || glyph.index === 0) continue;
  const box = glyph.getBoundingBox();
  glyphs[char] = { ha: round(glyph.advanceWidth), x_min: round(box.x1), x_max: round(box.x2), o: outline(glyph) };
}

const typeface = {
  glyphs,
  familyName: font.names.fontFamily.en,
  resolution: RESOLUTION,
  ascender: round(font.ascender),
  descender: round(font.descender),
  underlinePosition: round(font.tables.post.underlinePosition),
  underlineThickness: round(font.tables.post.underlineThickness),
  boundingBox: { xMin: round(font.tables.head.xMin), yMin: round(font.tables.head.yMin), xMax: round(font.tables.head.xMax), yMax: round(font.tables.head.yMax) },
};
const json = JSON.stringify(typeface);
await writeFile(OUTPUT, json);
console.log(`fonts/unbounded-800.json: ${Object.keys(glyphs).length} glyphs, ${Math.round(json.length / 1024)} KB`);
