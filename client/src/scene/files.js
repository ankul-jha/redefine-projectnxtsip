// Every file the story loads. To use production assets, replace the files or point these paths at them (see README).
// Kept free of three.js, so the page can start downloading them before the scene's code arrives. Paths start from
// the site's base, which is / except in the GitHub Pages preview.
const BASE = import.meta.env.BASE_URL;
export const ASSETS = {
  bottle: `${BASE}models/nxtsip-bottle.glb`,
  jar: `${BASE}models/nxtsip-jar.glb`,
  environment: `${BASE}textures/studio.hdr`,
  bottleLabel: `${BASE}textures/label-bottle.ktx2`,
  jarLabel: `${BASE}textures/label-jar.ktx2`,
  capNormal: `${BASE}textures/cap-normal.ktx2`,
  condensationNormal: `${BASE}textures/condensation-normal.ktx2`,
  font: `${BASE}fonts/unbounded-800.json`,
};

// Needed for the first frame, behind the loading screen. The rest streams in afterwards.
export const CORE_ASSETS = ['bottle', 'environment', 'bottleLabel', 'capNormal', 'condensationNormal', 'font'];
export const LATER_ASSETS = ['jar', 'jarLabel'];
