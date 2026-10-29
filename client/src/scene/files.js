// Every file the story loads. To use production assets, replace the files or point these paths at them (see README).
// Kept free of three.js, so the page can start downloading them before the scene's code arrives.
export const ASSETS = {
  bottle: '/models/nxtsip-bottle.glb',
  jar: '/models/nxtsip-jar.glb',
  environment: '/textures/studio.hdr',
  bottleLabel: '/textures/label-bottle.ktx2',
  jarLabel: '/textures/label-jar.ktx2',
  capNormal: '/textures/cap-normal.ktx2',
  condensationNormal: '/textures/condensation-normal.ktx2',
  waterNormal: '/textures/water-normal.ktx2',
  source: '/textures/source.jpg',
};

// Needed for the first frame, behind the loading screen. The rest streams in afterwards.
export const CORE_ASSETS = ['bottle', 'environment', 'bottleLabel', 'capNormal', 'condensationNormal'];
export const LATER_ASSETS = ['jar', 'jarLabel', 'waterNormal', 'source'];
