import * as THREE from 'three';
import { createCanvasTexture, drawImagesLater } from '../three/canvasTexture.js';
import { createWaterMaterial } from '../three/materials.js';
import { createEnvironment } from '../three/studio.js';

// Wide screens stand the can right of centre, beside the copy; others give it an area of its own above the copy.
// Must match the media query in Soda.module.css.
const WIDE_QUERY = '(min-aspect-ratio: 11/10)';

const TAU = Math.PI * 2;
const CAN = { radius: 0.33, height: 1.22, bodyBottom: 0.07, bodyTop: 1.04, segments: 128 };
const FRAME = {
  centerY: 0.61,
  halfHeight: 0.86,
  halfWidth: 0.62,
  margin: 1.12,
  // Wide screens leave room around the can for the flavour's name behind it.
  wideMargin: 1.4,
  wideShift: 0.16,
};
const LEAN = -0.32;
const IDLE_SPIN = 0.35;
const DRAG_SPEED = 0.012;
const FRICTION = 3;
const CONDENSATION = 420;

export class CanScene {
  constructor(container, { brand, color, flavour, font, reducedMotion }) {
    this.brand = brand;
    this.font = font;
    this.reducedMotion = reducedMotion;
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    container.append(this.renderer.domElement);

    this.environment = createEnvironment(this.renderer);
    this.scene = new THREE.Scene();
    this.scene.environment = this.environment.texture;
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 3);
    rim.position.set(4, 2, -3);

    this.label = createCanvasTexture(2048, 958, this.renderer, () => {});
    this.can = createCan(this.label);
    this.can.add(createCondensation());
    this.pivot = new THREE.Group();
    this.pivot.rotation.z = LEAN;
    this.pivot.add(this.can);
    this.scene.add(key, rim, this.pivot);

    this.spin = 0;
    this.velocity = reducedMotion ? 0 : 6;
    this.tilt = 0;
    this.drag = null;
    this.lastTime = null;
    this.setFlavour(color, flavour);

    container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  setFlavour(color, flavour) {
    drawCanLabel(this.label, this.brand, color, flavour, this.font);
    if (!this.reducedMotion) this.velocity += 7;
    this.render();
  }

  resize(width, height) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const wide = window.matchMedia(WIDE_QUERY).matches;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const margin = wide ? FRAME.wideMargin : FRAME.margin;
    const distance = margin * Math.max(FRAME.halfHeight / tan, FRAME.halfWidth / (tan * aspect));

    this.camera.aspect = aspect;
    this.camera.position.set(0, FRAME.centerY, distance);
    this.camera.setViewOffset(width, height, wide ? -width * FRAME.wideShift : 0, 0, width, height);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  setActive(active) {
    if (this.reducedMotion) return;
    this.lastTime = null;
    this.renderer.setAnimationLoop(active ? this.tick : null);
  }

  onPointerDown = (event) => {
    this.drag = { x: event.clientX, y: event.clientY };
    this.velocity = 0;
  };

  onPointerMove = (event) => {
    if (!this.drag) return;
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    this.drag = { x: event.clientX, y: event.clientY };
    this.spin += dx * DRAG_SPEED;
    this.velocity = dx * DRAG_SPEED * 60;
    this.tilt = THREE.MathUtils.clamp(this.tilt + dy * 0.004, -0.35, 0.35);
    if (this.reducedMotion) this.update(0);
  };

  onPointerUp = () => {
    this.drag = null;
  };

  tick = (time) => {
    const delta = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (!this.drag) {
      this.velocity += (IDLE_SPIN - this.velocity) * (1 - Math.exp(-delta * FRICTION));
      this.spin += this.velocity * delta;
      this.tilt *= 1 - Math.min(delta * 2, 1);
    }
    this.pivot.position.y = Math.sin(time / 800) * 0.03;
    this.update(time / 1000);
  };

  update(seconds) {
    this.can.rotation.set(this.tilt, this.spin, 0);
    this.pivot.rotation.z = LEAN + Math.sin(seconds * 0.7) * 0.03;
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
      if (object.isInstancedMesh) object.dispose();
    });
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function createCan(label) {
  const aluminium = new THREE.MeshPhysicalMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.26 });
  const print = new THREE.MeshPhysicalMaterial({
    map: label,
    metalness: 0.45,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  const shell = new THREE.Path()
    .moveTo(0, 0.05)
    .quadraticCurveTo(0.17, 0.055, 0.22, 0.012)
    .quadraticCurveTo(0.24, 0, 0.27, 0)
    .quadraticCurveTo(CAN.radius, 0.005, CAN.radius, CAN.bodyBottom)
    .lineTo(CAN.radius, CAN.bodyTop)
    .bezierCurveTo(CAN.radius, 1.1, 0.28, 1.12, 0.276, 1.17)
    .lineTo(0.276, 1.2)
    .quadraticCurveTo(0.276, 1.215, 0.266, 1.215)
    .lineTo(0.256, 1.2)
    .lineTo(0.25, 1.185)
    .lineTo(0, 1.185)
    .getPoints(12);

  const bodyHeight = CAN.bodyTop - CAN.bodyBottom;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(CAN.radius + 0.0008, CAN.radius + 0.0008, bodyHeight, CAN.segments, 1, true, Math.PI),
    print,
  );
  body.position.y = CAN.bodyBottom + bodyHeight / 2;

  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.LatheGeometry(shell, CAN.segments), aluminium), body, createTab(aluminium));
  return group;
}

function createTab(material) {
  const outline = new THREE.Shape();
  outline.moveTo(-0.06, -0.05);
  outline.lineTo(0.06, -0.05);
  outline.quadraticCurveTo(0.08, -0.05, 0.08, -0.03);
  outline.lineTo(0.08, 0.1);
  outline.quadraticCurveTo(0.08, 0.14, 0.04, 0.14);
  outline.lineTo(-0.04, 0.14);
  outline.quadraticCurveTo(-0.08, 0.14, -0.08, 0.1);
  outline.lineTo(-0.08, -0.03);
  outline.quadraticCurveTo(-0.08, -0.05, -0.06, -0.05);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.075, 0.045, 0.035, 0, TAU, false);
  outline.holes.push(hole);

  const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.006, bevelEnabled: false }), material);
  tab.rotation.x = -Math.PI / 2;
  tab.position.set(0, 1.192, 0.05);
  return tab;
}

// A painted can: flavour colour, the white wordmark running up the front, and small print around it.
function drawCanLabel(texture, brand, color, flavour, font) {
  const ctx = texture.image.getContext('2d');
  const { width, height } = texture.image;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgb(255 255 255 / 0.9)';
  ctx.fillRect(0, height * 0.035, width, 6);
  ctx.fillRect(0, height * 0.965 - 6, width, 6);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(height * 0.045)}px ${font}`;
  ctx.fillText('SPARKLING SODA · 330 ML', width * 0.5, height * 0.9);
  ctx.fillText(`${flavour.toUpperCase()} · COMING SOON`, width * 0.5, height * 0.1);
  ctx.font = `800 ${Math.round(height * 0.06)}px ${font}`;
  for (const center of [0.18, 0.82]) ctx.fillText(flavour.toUpperCase(), width * center, height * 0.5);
  ctx.font = `600 ${Math.round(height * 0.032)}px ${font}`;
  for (const seam of [0, width]) ctx.fillText(brand.tagline.toUpperCase(), seam, height * 0.5);
  texture.needsUpdate = true;

  drawImagesLater(texture, [brand.logo.wordmarkOnDark], (context, wordmark) => {
    const length = height * 0.76;
    const thickness = (length * wordmark.height) / wordmark.width;
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(-Math.PI / 2);
    context.drawImage(wordmark, -length / 2, -thickness / 2, length, thickness);
    context.restore();
  });
}

function createCondensation() {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 6),
    createWaterMaterial({ thickness: 0.02, side: THREE.FrontSide }),
    CONDENSATION,
  );
  const droplet = new THREE.Object3D();
  const outward = new THREE.Vector3();
  const target = new THREE.Vector3();

  for (let i = 0; i < CONDENSATION; i += 1) {
    const angle = Math.random() * TAU;
    const y = CAN.bodyBottom + 0.02 + Math.random() * (CAN.bodyTop - CAN.bodyBottom - 0.04);
    const size = 0.004 + Math.random() ** 3 * 0.014;
    outward.set(Math.sin(angle), 0, Math.cos(angle));
    droplet.position.copy(outward).multiplyScalar(CAN.radius + 0.001).setY(y);
    droplet.lookAt(target.copy(droplet.position).add(outward));
    droplet.scale.set(size, size * (1 + Math.random() * 0.6), size * 0.5);
    droplet.updateMatrix();
    mesh.setMatrixAt(i, droplet.matrix);
  }
  return mesh;
}
