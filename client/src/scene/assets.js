import * as THREE from 'three';
import { DRACO_GLTF_CONFIG, DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { ASSETS } from './files.js';

// The Draco decoder and Basis transcoder ship with three.js; the bundler emits them next to the app's own files.
export function createLoaders(renderer) {
  const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
  const ktx2 = new KTX2Loader().detectSupport(renderer);
  const loaders = {
    model: new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2),
    ktx2,
    hdr: new HDRLoader(),
    font: new FontLoader(),
    image: new THREE.TextureLoader(),
  };
  const forUrl = (url) => {
    if (/\.(glb|gltf)$/.test(url)) return loaders.model;
    if (url.endsWith('.ktx2')) return loaders.ktx2;
    if (url.endsWith('.hdr')) return loaders.hdr;
    if (url.endsWith('.json')) return loaders.font;
    return loaders.image;
  };

  return {
    // Loads assets by key and reports overall progress (0–1) as the files download.
    async load(keys, onProgress) {
      const fractions = new Map(keys.map((key) => [key, 0]));
      const report = () => onProgress?.([...fractions.values()].reduce((sum, value) => sum + value, 0) / keys.length);
      const entries = await Promise.all(
        keys.map(async (key) => {
          const asset = await forUrl(ASSETS[key]).loadAsync(ASSETS[key], (event) => {
            if (!event.lengthComputable) return;
            fractions.set(key, event.loaded / event.total);
            report();
          });
          fractions.set(key, 1);
          report();
          return [key, asset];
        }),
      );
      return Object.fromEntries(entries);
    },
    dispose() {
      draco.dispose();
      ktx2.dispose();
    },
  };
}
