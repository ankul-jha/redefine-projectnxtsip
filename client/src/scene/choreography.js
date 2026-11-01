import { MAX_LETTERS } from './layout.js';
import { progress } from './progress.js';

const TAU = Math.PI * 2;
const LABEL_TURN = 0.3; // label to camera, at a slight angle
const HERO_TURN = LABEL_TURN - 0.25; // the hero shows the logo; the source section turns it 90° to the label's text
// The minerals section turns the bottle once round and on to its label, so from there it faces the camera at this.
const TURNED = LABEL_TURN + TAU;
const HERO_TILT = 0.3; // the opening bottle leans into the frame, like a product on a poster
const FINALE_TILT = -0.24; // and the closing one leans the other way
// The opening bottle turns this far as it rises this share of the frame; its cap starts this far above the neck (in
// the rig's lift units, out of frame) and drops on.
const INTRO = { spin: 1.3, rise: 0.6, capLift: 3 };
const LINEUP_TURN = 0.6; // how far the lineup turns while its section is pinned

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const mix = (from, to, t) => from + (to - from) * t;
// Position of `value` within [from, to], clamped to 0–1.
const span = (value, from, to) => clamp01((value - from) / (to - from));
// Rises over [a, b], holds, and falls back over [c, d].
const bell = (value, a, b, c, d) => span(value, a, b) * (1 - span(value, c, d));
// GSAP's power3.in, power3.out, power3.inOut and expo.out, and a back.out with a gentle overshoot.
const easeIn = (t) => t ** 3;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const expoOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const backOut = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
// One value across a whole section: roughly 0 → 0.5 while it scrolls in, 0.5 → 1 while it is pinned.
const across = (section) => (section.enter + section.dwell) / 2;
// Where the index-th of `count` letters starts, spread over `spread`.
const stagger = (index, count, spread) => (count > 1 ? (index / (count - 1)) * spread : 0);

export function createStage() {
  return {
    bottle: { x: 0, y: 0, rotX: 0, rotY: HERO_TURN, rotZ: 0, scale: 1 },
    cap: { turn: 0, lift: 0 },
    seal: 0,
    // How far the bottle has come apart into its parts (the cap section's exploded view).
    explode: 0,
    // How full the bottle is (0–1), and the stream pouring into it: `head` is how far its leading end has fallen
    // (0 at the top of the frame, 1 at the bottle's mouth), `tail` the same for its trailing end, `churn` how much it
    // stirs the water.
    fill: 1,
    pour: { head: 0, tail: 0, churn: 0 },
    floor: { x: 0, y: 0 },
    // The point the camera looks at (world units), how far it has zoomed in, how far it looks down and how far it
    // has swung round to the side (radians).
    camera: { x: 0, y: 0, zoom: 1, pitch: 0, yaw: 0 },
    // The hero's white disc, opened to `disc` (1 is full size), and the closing word, whose 3D letters (word.js)
    // each have a tip towards the camera about their foot (radians) and a size. `fade` is how present the poster
    // is, for prefers-reduced-motion.
    poster: {
      name: 'hero',
      disc: 0,
      fade: 0,
      letters: Array.from({ length: MAX_LETTERS }, () => ({ tip: 0, size: 0 })),
    },
    // The hero's ribbon round the bottle (ribbon.js): how far it has drawn itself from its foot, and unwound again.
    ribbon: { draw: 0, unwind: 0 },
    // The source's podium of rock layers stacking in under the bottle and dropping away (podium.js).
    podium: { stack: 0, drop: 0 },
    // The purification bands sliding in and out, and the closing section's paint drips.
    backdrop: { bands: { in: 0, out: 0 }, drip: 0 },
    // The purification's ring of light passing down the bottle (1 at the shoulder, 0 at the foot).
    scan: { presence: 0, y: 1 },
    shadow: 0,
    lineup: 0,
    lineupTurn: 0,
    exit: 0,
  };
}

// The closing word's 3D letters lie flat and swing up one after another, like the pages of a pop-up book,
// overshooting a touch before they stand.
function popLetters(letters, enter, count) {
  letters.forEach((letter, index) => {
    const start = 0.4 + stagger(index, count, 0.25);
    const rise = span(enter, start, start + 0.3);
    letter.tip = -(Math.PI / 2) * (1 - backOut(rise));
    letter.size = rise > 0 ? 1 : 0;
  });
}

// Recomputes the stage from scroll progress. Sections run in page order and each eases the stage on from wherever
// the previous one left it, so every frame is a pure function of the scroll position and scrolling back reverses it.
// `intro` runs linearly from 0 to 1 once the scene is ready; each part of the opening eases over its own stretch.
export function choreograph(stage, layout) {
  const { intro, hero, source, minerals, cap, process, products, cta } = progress;
  const { width, height, side, rest, aside, lineup, finale, heroScale, bottleHalf, closeUp, letters } = layout;
  const { bottle, camera, backdrop, ribbon, podium } = stage;
  const restY = rest - bottleHalf;

  // A · Hero, the opening: the empty bottle rises into place with a turn as the white sphere springs open behind it;
  // water pours in from above and fills it; the cap drops on and screws shut; the bottle leans into its pose as a
  // satin ribbon draws itself round it from the foot up. Scrolling stands the bottle upright as the sphere closes
  // and the ribbon unwinds and spins away.
  const upright = easeInOut(span(hero.dwell, 0.04, 0.32));
  const risen = expoOut(span(intro, 0, 0.18));
  const posed = easeInOut(span(intro, 0.62, 0.82));

  bottle.x = 0;
  bottle.y = rest - (1 - risen) * height * INTRO.rise;
  bottle.rotX = 0;
  bottle.rotY = HERO_TURN - (1 - backOut(span(intro, 0.02, 0.3))) * INTRO.spin + hero.dwell * 0.25;
  bottle.rotZ = HERO_TILT * posed * (1 - upright);
  bottle.scale = mix(heroScale, 1, upright);
  Object.assign(camera, { x: 0, y: 0, zoom: 1, pitch: 0, yaw: 0 });
  stage.pour.head = easeIn(span(intro, 0.1, 0.18));
  stage.pour.tail = easeIn(span(intro, 0.46, 0.54));
  stage.pour.churn = bell(intro, 0.16, 0.2, 0.5, 0.6);
  stage.fill = easeOut(span(intro, 0.16, 0.5));
  stage.cap.lift = INTRO.capLift * (1 - expoOut(span(intro, 0.52, 0.64)));
  stage.cap.turn = 1 - easeInOut(span(intro, 0.6, 0.7));
  stage.seal = 0;
  stage.explode = 0;
  stage.poster.name = 'hero';
  stage.poster.disc = backOut(span(intro, 0.12, 0.32)) * (1 - easeInOut(span(hero.dwell, 0.02, 0.3)));
  stage.poster.fade = intro * (1 - span(hero.dwell, 0.04, 0.28));
  ribbon.draw = easeInOut(span(intro, 0.56, 0.96));
  ribbon.unwind = easeIn(span(hero.dwell, 0.02, 0.4));
  stage.floor.y = restY;

  // B · The source: as the bottle steps aside and turns to the label's text, layers of rock in the logo's blues
  // slide in under it one after another, stacking into a podium; once pinned, the camera swings round, down and in
  // to look across the podium's layers.
  const atSource = across(source);
  bottle.rotY -= (Math.PI / 2) * easeInOut(span(atSource, 0.15, 0.7));
  bottle.x = mix(bottle.x, side, easeInOut(span(atSource, 0.15, 0.55)));
  podium.stack = span(source.enter, 0.3, 1);
  podium.drop = span(minerals.enter, 0, 0.6);
  const look = easeInOut(span(source.dwell, 0.1, 0.7)) * (1 - easeInOut(span(minerals.enter, 0.1, 0.6)));
  camera.y = -bottleHalf * 0.3 * look;
  camera.zoom = 1 + 0.12 * look;
  camera.pitch = 0.22 * look;
  camera.yaw = -0.35 * look;

  // C · Minerals: the podium drops away and the bottle comes back to the middle for one slow turn, ending on its
  // label, while the mineral figures count up alongside.
  const atMinerals = across(minerals);
  bottle.x = mix(bottle.x, 0, easeInOut(span(atMinerals, 0.05, 0.4)));
  bottle.rotY += (Math.PI / 2 + TAU) * easeInOut(span(atMinerals, 0.15, 0.95));

  // D · Cap: the camera moves in close on the neck as the bottle tilts towards it; the cap twists off and lifts as
  // the seal ring drops; then the camera pulls back as the bottle comes apart into its parts, an exploded view.
  const atCap = across(cap);
  const tilt = easeInOut(span(atCap, 0.1, 0.45));
  const close = easeInOut(span(cap.enter, 0.35, 1)) * (1 - easeInOut(span(cap.dwell, 0.5, 0.78)));
  bottle.rotX = mix(bottle.rotX, 0.14, tilt);
  bottle.rotY = mix(bottle.rotY, TURNED, tilt);
  bottle.rotZ = mix(bottle.rotZ, -0.12, tilt);
  bottle.x = mix(bottle.x, -side * 0.5, tilt);
  bottle.y = mix(bottle.y, rest - height * 0.06, tilt);
  stage.floor.y = mix(restY, restY - height * 0.06, tilt);
  stage.cap.turn = Math.max(stage.cap.turn, easeInOut(span(cap.dwell, 0.04, 0.3)));
  stage.seal = span(cap.dwell, 0.04, 0.1);
  stage.explode = easeInOut(span(cap.dwell, 0.55, 0.85));
  stage.cap.lift = Math.max(stage.cap.lift, easeOut(span(cap.dwell, 0.28, 0.5)));
  const zoom = mix(1, closeUp.zoom, close);
  // Aim at the neck (it leans with the bottle), placed where the copy leaves room (layout.closeUp).
  const neckHeight = bottleHalf * bottle.scale * 0.8;
  const neckX = bottle.x - Math.sin(bottle.rotZ) * neckHeight + (closeUp.x * width) / zoom;
  const neckY = bottle.y + Math.cos(bottle.rotZ) * neckHeight + (closeUp.y * height) / zoom;
  camera.x = mix(camera.x, neckX, close);
  camera.y = mix(camera.y, neckY, close);
  camera.zoom = mix(camera.zoom, zoom, close);
  camera.pitch = closeUp.pitch * close;

  // E · Purification: the bottle goes back together and steps aside while four bands of white slide in from
  // alternating sides, like layers settling in a filter; once pinned, a ring of cyan light passes down the bottle
  // as the steps light up one after another.
  const atProcess = across(process);
  const settle = easeInOut(span(atProcess, 0.05, 0.45));
  stage.explode *= 1 - easeInOut(span(atProcess, 0, 0.3));
  stage.cap.lift *= 1 - easeInOut(span(atProcess, 0, 0.3));
  stage.cap.turn *= 1 - easeInOut(span(atProcess, 0.15, 0.45));
  bottle.rotX = mix(bottle.rotX, 0, settle);
  bottle.rotZ = mix(bottle.rotZ, 0, settle);
  bottle.x = mix(bottle.x, aside.x, settle);
  bottle.y = mix(bottle.y, aside.y, settle);
  bottle.scale = mix(1, aside.scale, settle);
  stage.floor.y = mix(stage.floor.y, aside.y - bottleHalf * aside.scale, settle);
  bottle.rotY += 1.2 * easeInOut(span(atProcess, 0.3, 1));
  backdrop.bands.in = span(process.enter, 0.05, 0.85);
  stage.scan.presence = easeOut(span(process.dwell, 0, 0.06)) * (1 - easeIn(span(products.enter, 0, 0.3)));
  stage.scan.y = 1 - easeInOut(span(process.dwell, 0.04, 0.72));

  // F · Products: the bands slide on out of the screen; the bottle hops into place as the 500 ml of a lineup, and
  // the 1 L and the 20 L jar drop in from above beside it and bounce. The three turn a little together while the
  // section is pinned.
  const arrive = easeInOut(span(products.enter, 0.25, 1));
  stage.lineupTurn = LINEUP_TURN * easeInOut(products.dwell);
  backdrop.bands.out = span(products.enter, 0, 0.7);
  bottle.x = mix(bottle.x, lineup.x[0], arrive);
  bottle.y = mix(bottle.y, lineup.y + bottleHalf * lineup.scale, arrive) + Math.sin(arrive * Math.PI) * height * 0.12;
  bottle.scale = mix(bottle.scale, lineup.scale, arrive);
  bottle.rotY = mix(bottle.rotY, TURNED - 0.1 + stage.lineupTurn, arrive);
  stage.floor.y = mix(stage.floor.y, lineup.y, arrive);
  stage.lineup = span(products.enter, 0.35, 1);

  // G · Order: the other sizes are swept off to the side, white runs down the screen like thick paint, and the
  // 500 ml comes forward, tilted, as the closing word's letters swing up behind it one by one.
  const leave = easeInOut(span(cta.enter, 0, 0.9));
  stage.exit = leave;
  bottle.x = mix(bottle.x, 0, leave);
  bottle.y = mix(bottle.y, finale.y, leave);
  bottle.scale = mix(bottle.scale, finale.scale, leave);
  bottle.rotY = mix(bottle.rotY, TURNED, leave);
  bottle.rotZ = mix(bottle.rotZ, FINALE_TILT, leave);
  stage.floor.y += leave * height * 0.9;
  backdrop.drip = span(cta.enter, 0.05, 0.6);
  if (cta.enter > 0) {
    stage.poster.name = 'cta';
    stage.poster.fill = 0;
    stage.poster.fade = easeInOut(span(cta.enter, 0.35, 1));
    popLetters(stage.poster.letters, cta.enter, letters);
  }

  stage.floor.x = mix(bottle.x, 0, arrive);
  const podiumShown = podium.stack * (1 - podium.drop);
  const bandsShown = backdrop.bands.in * (1 - backdrop.bands.out);
  stage.shadow = upright * (1 - podiumShown) * (1 - bandsShown) * (1 - backdrop.drip) * (1 - leave);
  return stage;
}

// prefers-reduced-motion: a still, full, capped bottle, a still ribbon and still letters, with only fades left to
// follow the scroll. The podium is left out.
export function holdStill(stage, layout) {
  Object.assign(stage.bottle, { x: 0, y: layout.rest, rotX: 0, rotY: LABEL_TURN, rotZ: 0, scale: 1 });
  Object.assign(stage.cap, { turn: 0, lift: 0 });
  Object.assign(stage.pour, { head: 0, tail: 0, churn: 0 });
  Object.assign(stage.camera, { x: 0, y: 0, zoom: 1, pitch: 0, yaw: 0 });
  for (const letter of stage.poster.letters) Object.assign(letter, { tip: 0, size: 1 });
  Object.assign(stage.ribbon, { draw: 1, unwind: 0 });
  Object.assign(stage.podium, { stack: 0, drop: 0 });
  stage.fill = 1;
  Object.assign(stage.floor, { x: 0, y: layout.rest - layout.bottleHalf });
  stage.seal = 0;
  stage.explode = 0;
  stage.scan.presence = 0;
  stage.lineup = 0;
  stage.lineupTurn = 0;
  stage.exit = 0;
  const { backdrop } = stage;
  stage.shadow = (1 - backdrop.bands.in * (1 - backdrop.bands.out)) * (1 - backdrop.drip);
}
