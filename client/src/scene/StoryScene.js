import * as THREE from 'three';
import { createLoaders } from './assets.js';
import { createBackdrop } from './backdrop.js';
import { BOTTLE_HEIGHT, createBottle } from './bottle.js';
import { choreograph, createStage, holdStill } from './choreography.js';
import { ContactShadow } from './contactShadow.js';
import { CORE_ASSETS, LATER_ASSETS } from './files.js';
import { COMPACT_QUERY, LINEUP, SHORT_QUERY } from './layout.js';
import { JAR, createLineup } from './lineup.js';
import { createPodium } from './podium.js';
import { createPoster } from './poster.js';
import { createPour } from './pour.js';
import { createRibbon } from './ribbon.js';
import { createScanner } from './scanner.js';
import { createWord } from './word.js';

const FOV = 30;
// Turns the studio HDRI so its dark side and both softboxes sit behind the bottle: clear plastic then gets dark,
// defined edges with long highlights, instead of mirroring the white cyclorama.
const ENVIRONMENT_TURN = Math.PI;
// The key light, up and to the left in front, sweeps slowly from side to side (`sweep` either way, over `period`
// seconds), so highlights glide across the bottle and the ribbon as under a moving studio light.
const KEY = { x: -3, y: 4, z: 5, sweep: 2, period: 14 };
// Compact screens (copy along the bottom): the share of the canvas height the bottle fills, and how far above the
// middle it stands. Phones and tablets sit at either end of a range set by the aspect ratio: squarer screens have
// shorter copy below, so the bottle grows and comes down. Landscape windows that are still compact keep it small.
const COMPACT = {
  phone: { fill: 0.36, rise: 0.16, aspect: 0.5 },
  tablet: { fill: 0.43, rise: 0.07, aspect: 0.8 },
  landscape: { fill: 0.34, rise: 0.13 },
};
const WIDE_FILL = 0.6;
// The opening bottle and its poster shrink on narrower wide screens, so they keep clear of the copy in the
// corners: until half the frame, less `copy` CSS pixels, holds `half` screen heights.
const HERO = { copy: 400, half: 0.27, minScale: 0.65 };
// The camera follows the cursor a little, turning up to `yaw` across and `pitch` up and down about what it looks at,
// so the scene shows its depth; and the bottle floats slowly, so it never looks pasted on.
const PARALLAX = { yaw: THREE.MathUtils.degToRad(7), pitch: THREE.MathUtils.degToRad(4) };
const FLOAT = { pixels: 4, period: 6 };
// Scrolling tips the bottle back by up to `max` radians, `perPixel` for each CSS pixel per second of scroll speed;
// a slightly underdamped spring brings it back, so it rocks once and settles (and its water sloshes).
const LEAN = { perPixel: 0.00006, max: 0.12, stiffness: 40, damping: 9 };
const CONDENSATION = { full: 160, light: 60 };
// The stream poured into the opening bottle starts this far above the frame and is this wide (world units, at the
// bottle's scale): about the bottle's mouth.
const POUR = { above: 0.3, width: 0.1 };
// How far behind the bottle the posters' 3D letters stand (world units).
const WORD_DEPTH = 1.2;
// The camera's close-up on the cap: where it puts the neck (as a share of the frame from the middle), how far it
// zooms in and how far it looks down (radians). Wide screens see the neck from the front, left of the copy; compact
// ones look down on it from above the copy, so the body, foreshortened, stays clear of the copy below.
const CLOSE_UP = {
  wide: { x: 0.18, y: 0, zoom: 3, pitch: 0.3 },
  compact: { x: 0, y: -0.24, zoom: 2.2, pitch: 1 },
};
const ALL_BANDS = { in: 1, out: 0 };

// The palette from theme.css, so canvas and page share one set of colours: the logo's blues (the page's gradient,
// the ribbon, the letters' shading, the podium and the scanner), the white of the colour blocks and the hero's
// sphere with its pale blue shading, the ribbon's sheen and the print's ground.
function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => styles.getPropertyValue(name).trim();
  return {
    cyan: read('--color-cyan'),
    sky: read('--color-sky'),
    royal: read('--color-royal'),
    cobalt: read('--color-cobalt'),
    deep: read('--color-deep'),
    ice: read('--color-ice'),
    shade: read('--color-tile'),
    block: read('--color-surface'),
  };
}

function disposeMaterial(material) {
  const values = [...Object.values(material), ...Object.values(material.uniforms ?? {}).map((uniform) => uniform.value)];
  for (const value of values) if (value?.isTexture) value.dispose();
  material.dispose();
}

// The pinned WebGL scene behind the landing page. Section components write scroll progress (progress.js),
// choreography.js turns it into a stage, and this class draws that stage every frame.
export class StoryScene {
  constructor(container, { reducedMotion }) {
    this.reducedMotion = reducedMotion;
    // Touch devices get fewer droplets and a lighter render.
    this.light = window.matchMedia('(pointer: coarse)').matches;
    this.palette = readPalette();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.light ? 1.5 : 2));
    // Khronos PBR Neutral keeps the label's and the cap's colours true, and the blues seen through the bottle stay
    // blue (ACES turns saturated blue purple). The flat backdrop skips tone mapping (backdrop.js).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    if (this.light) this.renderer.transmissionResolutionScale = 0.5;
    container.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(KEY.x, KEY.y, KEY.z);
    this.key = key;
    const rim = new THREE.DirectionalLight(0xffffff, 2.6);
    rim.position.set(2.5, 1.5, -5);
    const top = new THREE.DirectionalLight(0xffffff, 0.8);
    top.position.set(0.5, 6, 1);

    this.poster = createPoster();
    this.backdrop = createBackdrop(this.palette);
    this.shadow = new ContactShadow({ width: 8, depth: 2.4, reach: BOTTLE_HEIGHT });
    this.scene.add(key, rim, top, this.backdrop.mesh, this.shadow.group);

    this.stage = createStage();
    this.pointer = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.lean = { angle: 0, velocity: 0 };
    this.bend = { x: 0, y: 0 };
    this.lastScroll = null;
    this.mouth = new THREE.Vector3();
    this.buffer = new THREE.Vector2();
    this.clear = { hero: [], cta: [] };
    this.time = 0;
    this.lastFrame = null;
    this.active = false;
  }

  // Loads what the first frame needs (reporting progress), then streams in the rest.
  async load(onProgress) {
    this.loaders = createLoaders(this.renderer);
    const assets = await this.loaders.load(CORE_ASSETS, onProgress);
    if (this.disposed) return;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromEquirectangular(assets.environment).texture;
    pmrem.dispose();
    assets.environment.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentRotation.y = ENVIRONMENT_TURN;

    this.bottle = createBottle(assets.bottle, {
      label: assets.bottleLabel,
      capNormal: assets.capNormal,
      condensation: assets.condensationNormal,
      capColor: this.palette.royal,
      droplets: this.light ? CONDENSATION.light : CONDENSATION.full,
    });
    this.pour = createPour(assets.condensationNormal.clone());
    this.scanner = createScanner(this.palette.cyan, BOTTLE_HEIGHT / 2);
    this.word = createWord(assets.font, this.palette);
    this.ribbon = createRibbon(this.palette);
    this.ribbon.setWords(this.ribbonText ?? '');
    this.podium = createPodium(this.palette);
    this.scene.add(
      this.bottle.group,
      this.pour.mesh,
      this.scanner.mesh,
      this.word.group,
      this.ribbon.group,
      this.podium.group,
    );
    await this.renderer.compileAsync(this.scene, this.camera);
    this.updateLoop();
    this.loadRest();
  }

  async loadRest() {
    try {
      const assets = await this.loaders.load(LATER_ASSETS);
      if (this.disposed) return;
      this.lineup = createLineup(this.bottle, assets.jar, { label: assets.jarLabel, capColor: this.palette.royal });
      this.scene.add(this.lineup.group);
    } catch (error) {
      // The opening scene works without these; later sections just show less.
      console.warn('Some story assets failed to load.', error);
    }
  }

  resize(width, height) {
    if (!width || !height) return;
    const aspect = width / height;
    const compact = window.matchMedia(COMPACT_QUERY).matches;
    const { phone, tablet, landscape } = COMPACT;
    const t = THREE.MathUtils.smoothstep(aspect, phone.aspect, tablet.aspect);
    const between = (key) => THREE.MathUtils.lerp(phone[key], tablet[key], t);
    const fit = aspect > 1 ? landscape : { fill: between('fill'), rise: between('rise') };
    const visibleHeight = BOTTLE_HEIGHT / (compact ? fit.fill : WIDE_FILL);
    const visibleWidth = visibleHeight * aspect;
    const unit = visibleHeight / height;
    const spacing = Math.min(visibleWidth / 3, LINEUP.maxSpacing * unit);
    const jarHeight = JAR.height * BOTTLE_HEIGHT;
    // Short screens stand the lineup higher, to keep room below it, and shrink it so the 500 ml (the jar's height
    // over JAR.height) stays clear of the section title.
    const room = !compact && window.matchMedia(SHORT_QUERY).matches ? 'short' : 'wide';
    const baseline = compact ? LINEUP.baseline.compact : Math.min(LINEUP.baseline.wide, 1 - LINEUP.below[room] / height);
    const jarShare = Math.min(compact ? 0.42 : baseline - 0.18, (baseline - LINEUP.above[room] / height) * JAR.height);

    this.layout = {
      aspect,
      unit,
      // The camera's distance at rest, and its close-up on the cap.
      distance: visibleHeight / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)),
      closeUp: compact ? CLOSE_UP.compact : CLOSE_UP.wide,
      // How many letters the poster's word moves in (set each frame from the poster on show).
      letters: 0,
      width: visibleWidth,
      height: visibleHeight,
      bottleHalf: BOTTLE_HEIGHT / 2,
      side: compact ? 0 : visibleWidth * 0.2,
      rest: compact ? visibleHeight * fit.rise : 0,
      heroScale: compact ? 1 : THREE.MathUtils.clamp((width / 2 - HERO.copy) / (HERO.half * height), HERO.minScale, 1),
      // Where the bottle stands in front of the closing poster, above the order copy (which stacks up taller on
      // compact screens, so the bottle rises higher and shrinks there).
      finale: { y: visibleHeight * (compact ? 0.21 : 0.09), scale: compact ? 0.82 : 0.8 },
      // Where the bottle steps aside for a long block of copy: to the left, or on phones up and smaller.
      aside: compact ? { x: 0, y: visibleHeight * 0.24, scale: 0.7 } : { x: -visibleWidth * 0.2, y: 0, scale: 1 },
      lineup: {
        x: [-spacing, 0, spacing],
        y: visibleHeight * (0.5 - baseline),
        scale: Math.min((jarShare * visibleHeight) / jarHeight, (0.8 * spacing) / (JAR.aspect * jarHeight)),
      },
    };
    this.size = { width, height, compact, posterScale: compact ? fit.fill / phone.fill : this.layout.heroScale };

    this.renderer.setSize(width, height, false);
    const ratio = this.renderer.getPixelRatio();
    this.backdrop.fit({ pixels: height * ratio, aspect });
    // The plane the posters' 3D letters stand on, WORD_DEPTH behind the bottle, and how the posters' layout (in
    // device pixels) maps onto it.
    const { distance } = this.layout;
    const scale = (visibleHeight * (distance + WORD_DEPTH)) / distance / (height * ratio);
    this.place = {
      scale,
      toWorld: (x, y) => new THREE.Vector3((x - (width * ratio) / 2) * scale, ((height * ratio) / 2 - y) * scale, -WORD_DEPTH),
    };
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.drawPosters();
  }

  // Boxes of page copy the posters keep out of, per poster, in CSS pixels from the top left of the frame.
  setClearance(clear) {
    this.clear = clear;
    this.drawPosters();
  }

  drawPosters() {
    if (!this.layout) return;
    const { width, height, compact, posterScale } = this.size;
    const { rest, finale, height: visibleHeight } = this.layout;
    const ratio = this.renderer.getPixelRatio();
    const toPixels = (rect) => ({ x: rect.x * ratio, y: rect.y * ratio, width: rect.width * ratio, height: rect.height * ratio });
    this.poster.resize(width * ratio, height * ratio, {
      centres: {
        hero: { x: 0.5, y: 0.5 - rest / visibleHeight },
        cta: { x: 0.5, y: 0.5 - finale.y / visibleHeight },
      },
      compact,
      heroScale: posterScale,
      clear: { hero: this.clear.hero.map(toPixels), cta: this.clear.cta.map(toPixels) },
    });
  }

  // The words printed along the hero's ribbon and on the closing poster (they come from the site's content).
  setWords({ ribbon, cta }) {
    this.ribbonText = ribbon;
    this.ribbon?.setWords(ribbon);
    this.poster.setWords({ cta });
  }

  // The cursor (or a finger): the camera turns a little towards it.
  setPointer(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = ((clientY - rect.top) / rect.height) * 2 - 1;
  }

  setActive(active) {
    this.active = active;
    this.updateLoop();
  }

  updateLoop() {
    this.lastFrame = null;
    this.lastScroll = null;
    this.renderer.setAnimationLoop(this.active && this.bottle ? this.tick : null);
  }

  tick = (now) => {
    if (!this.layout) return;
    const delta = this.lastFrame === null ? 0 : Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.time += delta;
    const { layout, stage, time } = this;
    const motion = !this.reducedMotion;

    layout.letters = this.poster.layout.letters.length;
    choreograph(stage, layout);
    if (!motion) holdStill(stage, layout);

    // The camera turns a little towards the cursor (eased); the bottle floats (±4 px) and leans back from fast
    // scrolling (the lineup stands still).
    const settle = 1 - Math.exp(-delta * 3);
    this.look.x += ((motion ? this.pointer.x * PARALLAX.yaw : 0) - this.look.x) * settle;
    this.look.y += ((motion ? this.pointer.y * PARALLAX.pitch : 0) - this.look.y) * settle;
    this.placeCamera();
    const float = motion ? Math.sin((time * Math.PI * 2) / FLOAT.period) * FLOAT.pixels * layout.unit : 0;
    const scroll = window.scrollY;
    const speed = this.lastScroll === null || delta === 0 ? 0 : (scroll - this.lastScroll) / delta;
    this.lastScroll = scroll;
    const { lean } = this;
    const leanTo = motion ? THREE.MathUtils.clamp(-speed * LEAN.perPixel, -LEAN.max, LEAN.max) * (1 - stage.lineup) : 0;
    lean.velocity += (LEAN.stiffness * (leanTo - lean.angle) - LEAN.damping * lean.velocity) * delta;
    lean.angle += lean.velocity * delta;
    this.bend.x = lean.angle;

    this.bottle.update(stage, { time, delta, tilt: this.bend, float });
    if (motion) this.key.position.x = KEY.x + Math.sin((time * Math.PI * 2) / KEY.period) * KEY.sweep;
    this.updatePour();
    this.scanner.update(stage, this.bottle.group);
    this.lineup?.update(stage, layout);
    this.poster.show(stage.poster.name);
    this.updateLetters(motion);
    this.podium.update({
      podium: stage.podium,
      x: stage.bottle.x,
      floor: stage.bottle.y - layout.bottleHalf * stage.bottle.scale,
      scale: stage.bottle.scale,
      width: layout.width,
    });
    this.updateBackdrop(motion);

    this.shadow.group.position.set(stage.floor.x, stage.floor.y, 0);
    this.shadow.opacity = stage.shadow * 0.4;
    this.shadow.render(this.renderer, this.scene);
    this.renderer.render(this.scene, this.camera);
  };

  // Where the camera stands: aimed at the choreography's target, as far back as its zoom allows, looking down by its
  // pitch, swung round by its yaw, and turned towards the cursor.
  placeCamera() {
    const { x, y, zoom, pitch, yaw } = this.stage.camera;
    const distance = this.layout.distance / zoom;
    const across = yaw + this.look.x;
    const down = pitch - this.look.y;
    this.camera.position.set(
      x + Math.sin(across) * Math.cos(down) * distance,
      y + Math.sin(down) * distance,
      Math.cos(across) * Math.cos(down) * distance,
    );
    this.camera.lookAt(x, y, 0);
  }

  // The stream falls from above the frame into the bottle's mouth: its leading end drops first, its trailing end
  // follows once the bottle is full.
  updatePour() {
    const { head, tail } = this.stage.pour;
    const mouth = this.bottle.mouthPosition(this.mouth);
    const sky = this.layout.height / 2 + POUR.above;
    this.pour.update({
      x: mouth.x,
      z: mouth.z,
      bottom: THREE.MathUtils.lerp(sky, mouth.y, head),
      top: THREE.MathUtils.lerp(sky, mouth.y, tail),
      width: POUR.width * this.stage.bottle.scale,
      time: this.time,
    });
  }

  // The hero's ribbon and the closing word. Under reduced motion they stand still and fade with their poster.
  updateLetters(motion) {
    const { poster, ribbon, bottle } = this.stage;
    const opening = poster.name === 'hero';
    this.ribbon.update({
      ribbon,
      bottle,
      half: this.layout.bottleHalf,
      room: this.ribbonRoom(),
      time: this.time,
      still: !motion,
      presence: opening ? (motion ? 1 : poster.fade) : 0,
    });
    this.word.update({
      layout: this.poster.layout,
      place: this.place,
      letters: poster.letters,
      opacity: opening ? 0 : motion ? 1 : poster.fade,
    });
  }

  // The widest the hero's ribbon may wind (world units, at the bottle's scale): inside the sphere, which keeps clear
  // of the copy, and within the frame's width.
  ribbonRoom() {
    const { layout } = this.poster;
    if (layout.name === 'hero') this.heroDisc = layout.disc.z * this.layout.height;
    const { width, heroScale } = this.layout;
    return Math.min(width * 0.4, (this.heroDisc ?? 0) * 0.85) / heroScale;
  }

  // Under reduced motion the disc, the bands and the drips become fades.
  updateBackdrop(motion) {
    const { poster, backdrop } = this.stage;
    this.backdrop.update({
      disc: this.poster.layout.disc,
      discScale: motion ? poster.disc : 1,
      posterMix: motion ? 1 : poster.fade,
      bands: motion ? backdrop.bands : ALL_BANDS,
      drip: motion ? backdrop.drip : 0,
      blockMix: motion ? 1 : Math.max(backdrop.bands.in * (1 - backdrop.bands.out), backdrop.drip),
    });
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      for (const material of [object.material].flat()) disposeMaterial(material);
    });
    this.environment?.dispose();
    this.shadow.dispose();
    this.loaders?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
