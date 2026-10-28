// Passes uv through. Used by the mist and by the full-screen passes (three's FullScreenQuad draws with an orthographic camera).
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
