import * as THREE from 'three';
import { BOTTLE_HEIGHT, createCapPlastic, createPaper, createPlastic, createWater, dress, fitModel } from './bottle.js';

// Relative to the 500 ml bottle. The jar is drawn smaller than life so all three sizes read well side by side.
export const JAR = { height: 1.6, aspect: 0.55 };
const LITRE = { height: 1.22, width: 1.1 };

// The 1 L bottle (the 500 ml model, stretched) and the 20 L jar, which join the main bottle in the products section.
export function createLineup(bottle, jarGltf, { label, capColor }) {
  // The clone gets its own still water (the sloshing material follows the main bottle). It may be copied while the
  // opening is still filling and capping the bottle, so it is filled and its cap and seal put back in place.
  const litre = bottle.group.clone(true);
  dress(litre, 'Water', createWater(bottle.scale))?.traverse((water) => {
    water.scale.y = 1;
    water.visible = true;
  });
  litre.traverse((part) => {
    if (part.userData.rest === undefined) return;
    part.position.set(0, part.userData.rest, 0);
    part.rotation.set(0, 0, 0);
  });
  litre.getObjectByName('Label')?.scale.setScalar(1);

  const jar = jarGltf.scene;
  const scale = fitModel(jar, JAR.height * BOTTLE_HEIGHT);
  label.anisotropy = 8;
  dress(jar, 'Body', createPlastic(scale, { tint: '#cfe3ef' }));
  dress(jar, 'Water', createWater(scale));
  dress(jar, 'Label', createPaper(label));
  dress(jar, 'Cap', createCapPlastic(capColor));
  const jarHolder = new THREE.Group();
  jarHolder.add(jar);

  const group = new THREE.Group();
  group.add(litre, jarHolder);

  return {
    group,
    update(stage, { lineup, width, height }) {
      group.visible = stage.lineup > 0.001;
      if (!group.visible) return;
      const { x, y, scale: size } = lineup;
      // Each drops in from above the frame in turn and bounces to rest; with the order section both are swept off
      // to the right, tipping as they go.
      const drop = (from) => (1 - bounceOut(THREE.MathUtils.clamp((stage.lineup - from) / 0.65, 0, 1))) * height;
      const sweep = stage.exit * width;

      litre.position.set(x[1] + sweep * 0.8, y + drop(0) + (BOTTLE_HEIGHT / 2) * size * LITRE.height, 0);
      litre.scale.set(size * LITRE.width, size * LITRE.height, size * LITRE.width);
      litre.rotation.set(0, 0.15 + stage.lineupTurn, -0.9 * stage.exit);
      jarHolder.position.set(x[2] + sweep * 0.7, y + drop(0.3), 0);
      jarHolder.scale.setScalar(size);
      jarHolder.rotation.set(0, -0.35 + stage.lineupTurn, -0.6 * stage.exit);
    },
  };
}

// GSAP's bounce.out: a fall that bounces three times, lower each time.
function bounceOut(t) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t - 1.5 / d) ** 2 + 0.75;
  if (t < 2.5 / d) return n * (t - 2.25 / d) ** 2 + 0.9375;
  return n * (t - 2.625 / d) ** 2 + 0.984375;
}
