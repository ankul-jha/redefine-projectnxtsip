// The low mist in front of the bottle in the opening scene. Needs noise.glsl and untonemap.glsl.
uniform vec3 uColor;
uniform float uAmount;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 p = vec2(vUv.x * 3.2 + uTime * 0.02, vUv.y * 1.6 - uTime * 0.008);
  float cloud = fbm(p + fbm(p * 1.7 - uTime * 0.01));
  float band = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  float sides = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
  float alpha = smoothstep(0.4, 0.82, cloud) * band * sides * uAmount;
  gl_FragColor = vec4(untonemap(uColor), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
