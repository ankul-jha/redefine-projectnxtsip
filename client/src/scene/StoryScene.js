import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { CORE_ASSETS, LATER_ASSETS, createLoaders } from './assets.js';
import { createBackdrop } from './backdrop.js';
import { BOTTLE_HEIGHT, createBottle } from './bottle.js';
import { choreograph, createStage, holdStill } from './choreography.js';
import { ContactShadow } from './contactShadow.js';
import { createDroplets } from './droplets.js';
import { COMPACT_QUERY, LINEUP } from './layout.js';
import { JAR, createLineup } from './lineup.js';
import { createMist } from './mist.js';
import { createPoster } from './poster.js';
import { createPourStream } from './pourStream.js';
import { Ripples } from './ripples.js';
import { createScreenWater } from './screenWater.js';

const FOV = 30;
// Turns the studio HDRI so its dark side and both softboxes sit behind the bottle: clear plastic then gets dark,
// defined edges with long highlights, instead of mirroring the white cyclorama.
const ENVIRONMENT_TURN = Math.PI;
// Compact screens (copy along the bottom): the share of the canvas height the bottle fills, and how far above the
// middle it stands. Phones and tablets sit at either end of a range set by the aspect ratio: squarer screens have
// shorter copy below, so the bottle grows and comes down. Landscape windows that are still compact keep it small.
const COMPACT = {
  phone: { fill: 0.36, rise: 0.16, aspect: 0.5 },
  tablet: { fill: 0.43, rise: 0.07, aspect: 0.8 },
  landscape: { fill: 0.34, rise: 0.13 },
};
const WIDE_FILL = 0.6;
const TILT = THREE.MathUtils.degToRad(6);
const FLOAT = { pixels: 4, period: 5 };
const SWAY = { angle: 0.05, period: 16 };
const PARTICLES = {
  full: { splash: 64, rising: 8, condensation: 160 },
  light: { splash: 24, rising: 5, condensation: 60 },
};
const RIPPLE = { radius: 0.025, strength: 0.8, maxStrength: 0.03, ambientEvery: 1.8 };
// The hero poster keeps clear of the copy in the corners: on narrower wide screens the drop, its word and the bottle
// shrink until half the frame, less `copy` CSS pixels, holds half the drop (`dropHalf` screen heights wide).
// The word may run under the intro in the top-right corner only if it passes below it; the intro's size mirrors
// Story.module.css (19rem wide, about 190px tall, below the header and the frame's top padding).
const HERO = { copy: 400, dropHalf: 0.27, minScale: 0.65, intro: { width: 304, height: 190 } };
// How strongly the posters' word shows through the bottle's water: faintly, as a real bottle would show print behind
// it. At full strength the refracted letters read as dark blots.
const WORD_THROUGH_WATER = 0.5;

// The page palette from theme.css, so canvas and page share one set of colours.
function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => styles.getPropertyValue(name).trim();
  return {
    paper: read('--color-paper'),
    mist: read('--color-mist'),
    stone: read('--color-stone'),
    accent: read('--color-accent'),
    brand: read('--color-brand'),
    deep: read('--color-deep'),
  };
}

function disposeMaterial(material) {
  const values = [...Object.values(material), ...Object.values(material.uniforms ?? {}).map((uniform) => uniform.value)];
  for (const value of values) if (value?.isTexture) value.dispose();
  material.dispose();
}

// Where the hero's intro sits, as shares of the frame: its left edge and its bottom.
function heroIntroBox(width, height) {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 110;
  const gutter = THREE.MathUtils.clamp(width * 0.04, 16, 32);
  const inset = Math.max(gutter, (width - 1320) / 2 + gutter);
  const padding = THREE.MathUtils.clamp(height * 0.03, 8, 36);
  return { left: (width - inset - HERO.intro.width) / width, bottom: (header + padding + HERO.intro.height) / height };
}

// The pinned WebGL scene behind the landing page. Section components write scroll progress (progress.js),
// choreography.js turns it into a stage, and this class draws that stage every frame.
export class StoryScene {
  constructor(container, { reducedMotion }) {
    this.reducedMotion = reducedMotion;
    // Touch devices get fewer particles, no screen-space water and a lighter render.
    this.light = window.matchMedia('(pointer: coarse)').matches;
    this.particles = this.light ? PARTICLES.light : PARTICLES.full;
    this.palette = readPalette();

    this.renderer = new THREE.WebGLRenderer({ antialias: this.light, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.light ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (this.light) this.renderer.transmissionResolutionScale = 0.5;
    container.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0xffffff, 2.4);
    rim.position.set(2.5, 1.5, -5);

    this.poster = createPoster(this.palette);
    this.backdrop = createBackdrop(this.palette, this.poster);
    this.mist = createMist(this.palette.paper);
    this.shadow = new ContactShadow({ width: 8, depth: 2.4, reach: BOTTLE_HEIGHT });
    this.scene.add(key, rim, this.backdrop.mesh, this.mist.mesh, this.shadow.group);

    if (!this.light) {
      this.ripples = new Ripples();
      this.screenWater = createScreenWater();
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(this.screenWater.pass);
      this.composer.addPass(new OutputPass());
    }

    // Seen through the bottle, the posters' word fades (WORD_THROUGH_WATER). The refraction comes from three.js's
    // transmission pass, the one render of the scene into neither the screen nor the composer's buffers.
    this.backdrop.mesh.onBeforeRender = (renderer) => {
      const target = renderer.getRenderTarget();
      const { readBuffer, writeBuffer } = this.composer ?? {};
      const direct = target === null || target === readBuffer || target === writeBuffer;
      this.backdrop.setWordStrength(direct ? 1 : WORD_THROUGH_WATER);
    };

    this.stage = createStage();
    this.pointer = { x: 0, y: 0, u: 0.5, v: 0.5, travel: 0 };
    this.tilt = { x: 0, y: 0 };
    this.time = 0;
    this.lastFrame = null;
    this.lastDrop = 0;
    this.active = false;
    this.scratch = { origin: new THREE.Vector3(), floor: new THREE.Vector3(), projected: new THREE.Vector3() };
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
      capColor: this.palette.accent,
      droplets: this.particles.condensation,
    });
    this.splash = createDroplets(this.particles.splash, 'splash');
    this.rising = createDroplets(this.particles.rising, 'rise');
    this.scene.add(this.bottle.group, this.splash.mesh, this.rising.mesh);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.updateLoop();
    this.loadRest();
  }

  async loadRest() {
    try {
      const assets = await this.loaders.load(LATER_ASSETS);
      if (this.disposed) return;
      this.backdrop.setPhoto(assets.source);
      this.stream = createPourStream(assets.waterNormal);
      this.lineup = createLineup(this.bottle, assets.jar, { label: assets.jarLabel, capColor: this.palette.accent });
      this.scene.add(this.stream.mesh, this.lineup.group);
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
    const baseline = compact ? LINEUP.baseline.compact : Math.min(LINEUP.baseline.wide, 1 - LINEUP.below / height);
    const jarShare = Math.min(compact ? 0.42 : baseline - 0.18, (baseline - LINEUP.above / height) * JAR.height);

    this.layout = {
      aspect,
      unit,
      width: visibleWidth,
      height: visibleHeight,
      bottleHalf: BOTTLE_HEIGHT / 2,
      side: compact ? 0 : visibleWidth * 0.2,
      rest: compact ? visibleHeight * fit.rise : 0,
      heroScale: compact
        ? 1
        : THREE.MathUtils.clamp((width / 2 - HERO.copy) / (HERO.dropHalf * height), HERO.minScale, 1),
      // Where the bottle stands in front of the closing poster, above the order copy.
      finale: { y: visibleHeight * (compact ? 0.15 : 0.09), scale: compact ? 1 : 0.8 },
      // Where the bottle steps aside for a long block of copy: to the left, or on phones up and smaller.
      aside: compact ? { x: 0, y: visibleHeight * 0.24, scale: 0.7 } : { x: -visibleWidth * 0.2, y: 0, scale: 1 },
      lineup: {
        x: [-spacing, 0, spacing],
        y: visibleHeight * (0.5 - baseline),
        scale: Math.min((jarShare * visibleHeight) / jarHeight, (0.8 * spacing) / (JAR.aspect * jarHeight)),
      },
    };

    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    const ratio = this.renderer.getPixelRatio();
    const { rest, side, finale, heroScale } = this.layout;
    const centres = {
      hero: { x: 0.5, y: 0.5 - rest / visibleHeight },
      cta: { x: 0.5, y: 0.5 - finale.y / visibleHeight },
    };
    // The compact poster grows with the bottle on squarer screens.
    const posterScale = compact ? fit.fill / phone.fill : heroScale;
    const clear = compact ? null : heroIntroBox(width, height);
    this.poster.resize(width * ratio, height * ratio, { centres, compact, heroScale: posterScale, clear });
    // The source photograph's arch, behind the bottle where the source section puts it (half sizes in screen heights).
    const archHalfHeight = compact ? 0.24 : 0.4;
    const archHalfWidth = Math.min(archHalfHeight * 0.6, aspect * 0.42);
    const arch = new THREE.Vector4(0.5 + side / visibleWidth, 0.5 + rest / visibleHeight, archHalfWidth, archHalfHeight);
    this.backdrop.fit({ arch, pixels: height * ratio });
    this.ripples?.resize(aspect);
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, visibleHeight / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.camera.updateProjectionMatrix();
    this.mist.fit(this.layout);
  }

  // The words on the opening and closing posters (they come from the site's content).
  setPosterWords(words) {
    this.poster.setWords(words);
  }

  setPointer(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    const v = 1 - (clientY - rect.top) / rect.height;
    const { pointer } = this;
    pointer.travel += Math.hypot(u - pointer.u, v - pointer.v);
    Object.assign(pointer, { x: u * 2 - 1, y: 1 - v * 2, u, v });
  }

  setActive(active) {
    this.active = active;
    this.updateLoop();
  }

  updateLoop() {
    this.lastFrame = null;
    this.renderer.setAnimationLoop(this.active && this.bottle ? this.tick : null);
  }

  tick = (now) => {
    if (!this.layout) return;
    const delta = this.lastFrame === null ? 0 : Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.time += delta;
    const { layout, stage, time } = this;
    const motion = !this.reducedMotion;

    choreograph(stage, layout);
    if (!motion) holdStill(stage, layout);

    // Idle float (±4 px), a very slow sway, and a lerped tilt of up to 6° towards the cursor.
    const settle = 1 - Math.exp(-delta * 4);
    this.tilt.x += ((motion ? this.pointer.y * TILT : 0) - this.tilt.x) * settle;
    this.tilt.y += ((motion ? this.pointer.x * TILT : 0) - this.tilt.y) * settle;
    const float = motion ? Math.sin((time * Math.PI * 2) / FLOAT.period) * FLOAT.pixels * layout.unit : 0;
    const sway = motion ? Math.sin((time * Math.PI * 2) / SWAY.period) * SWAY.angle : 0;

    this.bottle.update(stage, { time, delta, tilt: this.tilt, float, sway });
    this.lineup?.update(stage, layout);
    this.stream?.update(stage, { time, rest: layout.rest });
    const { origin } = this.scratch;
    if (this.stream) this.splash.update(this.stream.endPosition(origin), time, stage.pour.splash);
    this.rising.update(this.bottle.mouthPosition(origin), stage.droplets.time, stage.droplets.amount);
    this.mist.update(stage.mist, motion ? time : 0);
    this.poster.show(stage.poster.name);
    this.backdrop.update(stage, { time: motion ? time : 0, aspect: layout.aspect, floor: this.floorOnScreen() });

    this.shadow.group.position.set(stage.floor.x, stage.floor.y, 0);
    this.shadow.opacity = stage.shadow * 0.55;
    this.shadow.render(this.renderer, this.scene);

    if (this.composer) {
      this.updateRipples(delta);
      this.screenWater.update(stage, { time, aspect: layout.aspect, ripples: this.ripples });
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  // The bottle's base in screen uv, and the width of the light pool around it in screen heights.
  floorOnScreen() {
    const { floor, projected } = this.scratch;
    const { stage, layout } = this;
    projected.set(stage.floor.x, stage.floor.y, 0).project(this.camera);
    return floor.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5, (stage.bottle.scale * BOTTLE_HEIGHT * 0.35) / layout.height);
  }

  updateRipples(delta) {
    const { stage, pointer, ripples } = this;
    if (stage.ripples < 0.001) return;
    if (pointer.travel > 0) {
      ripples.drop(pointer.u, pointer.v, RIPPLE.radius, Math.min(pointer.travel * RIPPLE.strength, RIPPLE.maxStrength) * stage.ripples);
      pointer.travel = 0;
    }
    // Now and then a drop falls near the order buttons, below the poster, so the water is never quite still.
    if (stage.exit > 0.5 && this.time - this.lastDrop > RIPPLE.ambientEvery) {
      this.lastDrop = this.time;
      ripples.drop(0.5 + (Math.random() - 0.5) * 0.4, 0.12 + (Math.random() - 0.5) * 0.08, 0.02, 0.015);
    }
    ripples.update(this.renderer, delta);
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
    this.ripples?.dispose();
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.loaders?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
