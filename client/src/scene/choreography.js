import { progress } from './progress.js';

const LABEL_TURN = 0.3; // label to camera, at a slight angle
const HERO_TURN = LABEL_TURN - 0.25; // the hero shows the logo; the source section turns it 90° to the label's text
const HERO_TILT = 0.32; // the opening bottle leans into the frame, like a product on a poster
const FINALE_TILT = -0.26; // and the closing one leans the other way

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const mix = (from, to, t) => from + (to - from) * t;
// Position of `value` within [from, to], clamped to 0–1.
const span = (value, from, to) => clamp01((value - from) / (to - from));
// Rises over [a, b], holds, and falls back over [c, d].
const bell = (value, a, b, c, d) => span(value, a, b) * (1 - span(value, c, d));
// GSAP's power2.out and power2.inOut, so the canvas moves like the page's text.
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// One value across a whole section: roughly 0 → 0.5 while it scrolls in, 0.5 → 1 while it is pinned.
const across = (section) => (section.enter + section.dwell) / 2;

export function createStage() {
  return {
    bottle: { x: 0, y: 0, rotX: 0, rotY: HERO_TURN, rotZ: 0, scale: 1 },
    cap: { turn: 0, lift: 0 },
    seal: 0,
    floor: { x: 0, y: 0 },
    mist: 0,
    poster: { name: 'hero', amount: 0, scale: 1 },
    pour: { head: 0, tail: 0, splash: 0 },
    droplets: { time: 0, amount: 0 },
    sheet: { amount: 0, front: 0 },
    backdrop: { photo: 0, zoom: 1, dark: 0, caustics: 0 },
    shadow: 0,
    lineup: 0,
    exit: 0,
    ripples: 0,
  };
}

// Recomputes the stage from scroll progress. Sections run in page order and each eases the stage on from wherever
// the previous one left it, so every frame is a pure function of the scroll position and scrolling back reverses it.
export function choreograph(stage, layout) {
  const { intro, hero, source, pour, cap, process, products, cta } = progress;
  const { height, side, rest, aside, lineup, finale, heroScale, bottleHalf } = layout;
  const bottle = stage.bottle;
  const restY = rest - bottleHalf;

  // A · Hero: once loaded, the bottle rises out of the mist, tilted, in front of the poster (a drop and one word).
  // Scrolling stands it upright while the poster fades and the mist clears.
  const upright = easeInOut(span(hero.dwell, 0.04, 0.3));
  bottle.x = 0;
  bottle.y = rest + (intro - 1) * height * 0.55;
  bottle.rotX = 0;
  bottle.rotY = HERO_TURN + hero.dwell * 0.25;
  bottle.rotZ = HERO_TILT * (1 - upright);
  bottle.scale = mix(heroScale, 1, upright);
  // The mist clears completely as the bottle settles, leaving the poster clean.
  stage.mist = 1 - intro;
  stage.poster.name = 'hero';
  stage.poster.amount = intro * (1 - span(hero.dwell, 0.04, 0.26));
  stage.poster.scale = 1 + 0.06 * span(hero.dwell, 0, 0.26);
  stage.floor.y = restY;

  // B · The source: the spring photograph comes up behind and the bottle turns to the label's text.
  const atSource = across(source);
  bottle.rotY -= (Math.PI / 2) * easeInOut(span(atSource, 0.15, 0.7));
  bottle.x = mix(bottle.x, side, easeInOut(span(atSource, 0.15, 0.55)));
  stage.backdrop.photo = easeInOut(span(atSource, 0.1, 0.45));
  stage.backdrop.zoom = 1 + 0.08 * atSource;

  // C · Pour: water falls from the top of the screen, wraps the bottle and splashes at its foot.
  const atPour = across(pour);
  stage.backdrop.photo *= 1 - easeInOut(span(atPour, 0, 0.3));
  bottle.x = mix(bottle.x, 0, easeInOut(span(atPour, 0.05, 0.35)));
  bottle.rotY += 0.7 * easeInOut(span(atPour, 0.2, 1));
  stage.pour.head = easeInOut(span(atPour, 0.3, 0.62));
  stage.pour.tail = easeInOut(span(atPour, 0.78, 0.98));
  stage.pour.splash = bell(atPour, 0.48, 0.56, 0.86, 0.97);
  stage.sheet.amount = bell(atPour, 0.4, 0.55, 0.8, 0.96) * 0.6;
  stage.sheet.front = span(atPour, 0.4, 0.7);
  stage.backdrop.caustics = 0.6 * bell(atPour, 0.3, 0.5, 0.85, 1);

  // D · Cap: the bottle tilts towards the camera, the cap twists off and a few droplets lift out.
  const atCap = across(cap);
  const tilt = easeInOut(span(atCap, 0.1, 0.45));
  bottle.rotX = mix(bottle.rotX, 0.22, tilt);
  bottle.rotY = mix(bottle.rotY, LABEL_TURN, tilt);
  bottle.rotZ = mix(bottle.rotZ, -0.2, tilt);
  bottle.x = mix(bottle.x, -side * 0.6, tilt);
  bottle.y = mix(bottle.y, rest - height * 0.06, tilt);
  stage.floor.y = mix(restY, restY - height * 0.06, tilt);
  stage.cap.turn = easeInOut(span(atCap, 0.5, 0.72));
  stage.seal = span(atCap, 0.5, 0.53);
  stage.cap.lift = easeOut(span(atCap, 0.72, 0.9));
  stage.droplets.time = span(atCap, 0.7, 1);
  stage.droplets.amount = 1;

  // E · Process: the cap goes back on and the bottle moves aside on dark stone while the steps come in.
  const atProcess = across(process);
  const settle = easeInOut(span(atProcess, 0.05, 0.45));
  stage.cap.lift *= 1 - easeInOut(span(atProcess, 0, 0.25));
  stage.cap.turn *= 1 - easeInOut(span(atProcess, 0.15, 0.45));
  stage.droplets.amount = 1 - span(atProcess, 0, 0.2);
  bottle.rotX = mix(bottle.rotX, 0, settle);
  bottle.rotZ = mix(bottle.rotZ, 0, settle);
  bottle.x = mix(bottle.x, aside.x, settle);
  bottle.y = mix(bottle.y, aside.y, settle);
  bottle.scale = mix(1, aside.scale, settle);
  stage.floor.y = mix(stage.floor.y, aside.y - bottleHalf * aside.scale, settle);
  bottle.rotY += 1.2 * easeInOut(span(atProcess, 0.3, 1));
  stage.backdrop.dark = easeInOut(span(atProcess, 0.05, 0.4));

  // F · Products: the bottle becomes the 500 ml of a lineup with the 1 L and the 20 L jar.
  const arrive = easeInOut(span(products.enter, 0.25, 1));
  stage.backdrop.dark *= 1 - easeInOut(span(products.enter, 0, 0.6));
  bottle.x = mix(bottle.x, lineup.x[0], arrive);
  bottle.y = mix(bottle.y, lineup.y + bottleHalf * lineup.scale, arrive);
  bottle.scale = mix(bottle.scale, lineup.scale, arrive);
  bottle.rotY = mix(bottle.rotY, LABEL_TURN - 0.1, arrive);
  stage.floor.y = mix(stage.floor.y, lineup.y, arrive);
  stage.lineup = easeOut(span(products.enter, 0.5, 1));
  stage.ripples = span(products.enter, 0.7, 1);

  // G · Order: the other sizes rise out of frame, and the 500 ml comes forward, tilted, in front of the closing
  // poster on clean paper; the cursor still ripples the screen's water.
  const leave = easeInOut(span(cta.enter, 0, 0.9));
  stage.exit = leave;
  bottle.x = mix(bottle.x, 0, leave);
  bottle.y = mix(bottle.y, finale.y, leave);
  bottle.scale = mix(bottle.scale, finale.scale, leave);
  bottle.rotY = mix(bottle.rotY, LABEL_TURN, leave);
  bottle.rotZ = mix(bottle.rotZ, FINALE_TILT, leave);
  stage.floor.y += leave * height * 0.9;
  stage.backdrop.caustics *= 1 - leave;
  if (cta.enter > 0) {
    stage.poster.name = 'cta';
    stage.poster.amount = easeInOut(span(cta.enter, 0.35, 1));
    stage.poster.scale = 1.06 - 0.06 * stage.poster.amount;
  }

  stage.floor.x = mix(bottle.x, 0, arrive);
  stage.shadow = upright * (1 - stage.backdrop.photo) * (1 - stage.backdrop.dark) * (1 - leave);
  return stage;
}

// prefers-reduced-motion: a still bottle, with only the backdrop's fades left to follow the scroll.
export function holdStill(stage, layout) {
  Object.assign(stage.bottle, { x: 0, y: layout.rest, rotX: 0, rotY: LABEL_TURN, rotZ: 0, scale: 1 });
  Object.assign(stage.cap, { turn: 0, lift: 0 });
  Object.assign(stage.pour, { head: 0, tail: 0, splash: 0 });
  Object.assign(stage.sheet, { amount: 0, front: 0 });
  Object.assign(stage.floor, { x: 0, y: layout.rest - layout.bottleHalf });
  stage.seal = 0;
  stage.mist = 0;
  stage.droplets.amount = 0;
  stage.lineup = 0;
  stage.exit = 0;
  stage.ripples = 0;
  stage.backdrop.zoom = 1;
  stage.poster.scale = 1;
  stage.shadow = (1 - stage.backdrop.photo) * (1 - stage.backdrop.dark);
}
