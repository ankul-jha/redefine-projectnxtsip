// A 2 × 2 plane drawn straight into clip space on the far plane, so it sits behind everything at any camera.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
