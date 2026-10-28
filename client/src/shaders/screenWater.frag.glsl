// Screen-space water on the glass in front of the scene. During the pour a film runs down the screen from the top;
// in the products and order sections the cursor leaves ripples (from the ripple simulation). Both refract the
// rendered frame and catch a little light. Needs noise.glsl.
uniform sampler2D tDiffuse;
uniform sampler2D uRipples;
uniform vec2 uRippleTexel;
uniform float uRipple;
uniform float uSheet;
uniform float uFront;
uniform float uTime;
uniform float uAspect;

varying vec2 vUv;

const vec3 LIGHT = vec3(-0.45, 0.6, 0.66);

// Film thickness: long runs crawling downward, covering the screen from the top down to uFront.
float film(vec2 uv) {
  vec2 p = vec2(uv.x * uAspect * 7.0, uv.y * 2.0 + uTime * 0.18);
  float runs = valueNoise(vec2(p.x, p.y * 0.3)) * 0.65 + valueNoise(p * vec2(2.3, 0.9) + 5.2) * 0.35;
  float reach = 1.0 - uv.y + (valueNoise(vec2(uv.x * uAspect * 9.0, 3.1)) - 0.5) * 0.12;
  return runs * (1.0 - smoothstep(uFront - 0.06, uFront + 0.02, reach));
}

void main() {
  vec2 slope = vec2(0.0);

  if (uSheet > 0.0) {
    vec2 e = vec2(0.002 / uAspect, 0.002);
    slope += vec2(film(vUv + vec2(e.x, 0.0)) - film(vUv - vec2(e.x, 0.0)), film(vUv + vec2(0.0, e.y)) - film(vUv - vec2(0.0, e.y))) * 0.6 * uSheet;
  }
  if (uRipple > 0.0) {
    vec2 dx = vec2(uRippleTexel.x, 0.0);
    vec2 dy = vec2(0.0, uRippleTexel.y);
    slope += vec2(texture2D(uRipples, vUv + dx).r - texture2D(uRipples, vUv - dx).r, texture2D(uRipples, vUv + dy).r - texture2D(uRipples, vUv - dy).r) * 4.0 * uRipple;
  }

  vec3 normal = normalize(vec3(-slope * 12.0, 1.0));
  vec4 color = texture2D(tDiffuse, clamp(vUv - slope * 0.2, vec2(0.001), vec2(0.999)));
  float facing = dot(normal.xy, normalize(LIGHT.xy));
  color.rgb *= 1.0 + facing * 0.35;
  color.rgb += pow(max(dot(reflect(-normalize(LIGHT), normal), vec3(0.0, 0.0, 1.0)), 0.0), 90.0) * 6.0;
  gl_FragColor = color;
}
