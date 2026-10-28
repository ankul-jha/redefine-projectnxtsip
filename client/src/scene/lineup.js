import * as THREE from 'three';
import { BOTTLE_HEIGHT, createCapPlastic, createPaper, createPlastic, createWater, dress, fitModel } from './bottle.js';

// Relative to the 500 ml bottle. The jar is drawn smaller than life so all three sizes read well side by side.
export const JAR = { height: 1.6, aspect: 0.55 };
const LITRE = { height: 1.22, width: 1.1 };

// The 1 L bottle (the 500 ml model, stretched) and the 20 L jar, which join the main bottle in the products section.
export function createLineup(bottle, jarGltf, { label, capColor }) {
  // The clone gets its own still water: the sloshing material follows the main bottle.
  const litre = bottle.group.clone(true);
  dress(litre, 'Water', createWater(bottle.scale));

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
    update(stage, { lineup, height }) {
      group.visible = stage.lineup > 0.001;
      if (!group.visible) return;
      const { x, y, scale: size } = lineup;
      // Each rises into place in turn, and all leave upwards with the order section.
      const rise = (from) => (1 - THREE.MathUtils.smoothstep(stage.lineup, from, from + 0.8)) * height * -0.35;
      const exit = stage.exit * height * 0.9;

      litre.position.set(x[1], y + rise(0) + exit + (BOTTLE_HEIGHT / 2) * size * LITRE.height, 0);
      litre.scale.set(size * LITRE.width, size * LITRE.height, size * LITRE.width);
      litre.rotation.set(0, 0.15, 0);
      jarHolder.position.set(x[2], y + rise(0.2) + exit, 0);
      jarHolder.scale.setScalar(size);
      jarHolder.rotation.y = -0.35;
    },
  };
}
