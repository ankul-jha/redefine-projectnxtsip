import * as THREE from 'three';

export function createCanvasTexture(width, height, renderer, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// Draws images (such as the logo) onto a canvas texture once they have loaded.
export function drawImagesLater(texture, sources, draw) {
  const images = sources.map((src) => {
    const image = new Image();
    image.src = src;
    return image.decode().then(() => image);
  });
  Promise.all(images).then(
    (loaded) => {
      draw(texture.image.getContext('2d'), ...loaded);
      texture.needsUpdate = true;
    },
    () => {},
  );
}
