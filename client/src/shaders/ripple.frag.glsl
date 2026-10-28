// One step of a height-field water simulation (the wave equation on a grid).
// r holds the surface height, g its vertical velocity. uDrop adds a smooth bump: x, y (uv), radius, strength.
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec4 uDrop;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec4 state = texture2D(uState, vUv);
  float average = (
    texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv + vec2(0.0, uTexel.y)).r +
    texture2D(uState, vUv - vec2(0.0, uTexel.y)).r
  ) * 0.25;
  state.g += (average - state.r) * 2.0;
  state.g *= 0.985;
  state.r += state.g;

  float distanceToDrop = length((vUv - uDrop.xy) * vec2(uAspect, 1.0));
  float bump = max(0.0, 1.0 - distanceToDrop / max(uDrop.z, 1e-4));
  state.r += (0.5 - 0.5 * cos(bump * 3.14159265)) * uDrop.w;

  gl_FragColor = state;
}
