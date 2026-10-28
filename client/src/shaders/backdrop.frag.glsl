// The studio backdrop: flat paper (with a studio "table" while the bottle stands on it), low haze, the posters, the
// source photograph in an arched window, the purification section's colour block, soft caustics, a light vignette
// and a trace of film grain. Colours are worked out in display space and then untonemapped
// (see untonemap.glsl). Needs noise.glsl, caustics.glsl and untonemap.glsl.
uniform vec3 uPaper;
uniform vec3 uMist;
uniform vec3 uStone;
uniform vec3 uDeep;
uniform sampler2D uPhoto;
uniform float uPhotoAspect;
uniform float uPhotoMix;
uniform float uPhotoZoom;
uniform vec4 uWindow;
uniform sampler2D uPosterShape;
uniform sampler2D uPosterWord;
uniform float uPosterMix;
uniform float uWordMix;
uniform float uPosterScale;
uniform float uDark;
uniform float uHaze;
uniform float uCaustics;
uniform vec3 uFloor;
uniform float uFloorLight;
uniform float uAspect;
uniform float uResolutionY;
uniform float uTime;
uniform float uGrain;

varying vec2 vUv;

// Distance to an arch (a rectangle with a round top) of half width `size.x` and half height `size.y`, centred on
// the origin. Negative inside.
float archDistance(vec2 p, vec2 size) {
  float shoulder = size.y - size.x;
  float round = length(p - vec2(0.0, shoulder)) - size.x;
  vec2 box = abs(p - vec2(0.0, (shoulder - size.y) * 0.5)) - vec2(size.x, (shoulder + size.y) * 0.5);
  return min(round, length(max(box, 0.0)) + min(max(box.x, box.y), 0.0));
}

// object-fit: cover for the photograph inside a window of the given aspect, zoomed around its centre.
vec2 coverUv(vec2 uv, float aspect) {
  vec2 scale = aspect > uPhotoAspect ? vec2(1.0, uPhotoAspect / aspect) : vec2(aspect / uPhotoAspect, 1.0);
  return (uv - 0.5) * scale / uPhotoZoom + 0.5;
}

void main() {
  vec2 screen = vec2(vUv.x * uAspect, vUv.y);

  // A studio sweep while the bottle stands on the floor (uFloorLight): mist "table" up to a soft horizon a little
  // above its base, paper above. The bottle bends this line, which helps clear plastic read on a pale ground.
  // A floating bottle (the posters) gets flat paper.
  float horizon = uFloor.y + 0.12;
  vec3 table = mix(uMist, uPaper, smoothstep(horizon - 0.05, horizon + 0.12, vUv.y));
  vec3 calm = mix(uPaper, table, uFloorLight);
  calm *= 1.0 + (valueNoise(screen * vec2(5.0, 80.0)) - 0.5) * 0.004;

  // Haze that drifts low across the frame in the opening scene (it is also seen through the bottle).
  vec2 drift = vec2(screen.x * 1.6 + uTime * 0.015, vUv.y * 2.2 - uTime * 0.004);
  float haze = smoothstep(0.35, 0.85, fbm(drift + fbm(drift * 1.8))) * (1.0 - smoothstep(0.08, 0.55, vUv.y));
  calm = mix(calm, uPaper, haze * uHaze * 0.9);

  // The posters (poster.js), printed on the paper and scaled about the centre as they fade: the shape, then the word.
  vec2 posterUv = (vUv - 0.5) / uPosterScale + 0.5;
  vec4 poster = texture2D(uPosterShape, posterUv);
  vec4 word = texture2D(uPosterWord, posterUv);
  calm = mix(calm, poster.rgb, poster.a * uPosterMix);
  calm = mix(calm, word.rgb, word.a * uPosterMix * uWordMix);

  // The photograph, printed as a navy-to-paper duotone in an arched window behind the bottle (uWindow: centre in
  // uv, half size in screen heights), with a line-art outline offset from it.
  vec2 fromWindow = (vUv - uWindow.xy) * vec2(uAspect, 1.0);
  float pixel = 1.5 / uResolutionY;
  float inside = 1.0 - smoothstep(-pixel, pixel, archDistance(fromWindow, uWindow.zw));
  float offset = archDistance(fromWindow + vec2(0.022, -0.022), uWindow.zw);
  float outline = 1.0 - smoothstep(0.0, pixel, abs(offset) - pixel * 0.5);
  vec2 windowUv = fromWindow / (2.0 * uWindow.zw) + 0.5;
  vec3 photo = texture2D(uPhoto, coverUv(windowUv, uWindow.z / uWindow.w)).rgb;
  photo = mix(uStone, uPaper, smoothstep(0.02, 0.75, dot(photo, vec3(0.2126, 0.7152, 0.0722))));
  vec3 color = mix(calm, uStone, outline * (1.0 - inside) * uPhotoMix);
  color = mix(color, photo, inside * uPhotoMix);
  color = mix(color, uDeep, uDark);

  float light = caustics(screen * 2.2, uTime * 0.6);
  // Caustics play on the paper, not over the posters' flat colour.
  color *= 1.0 + (light - 0.3) * uCaustics * 0.05 * (1.0 - poster.a * uPosterMix);
  color += uMist * light * uCaustics * uDark * 0.012;

  // Light gathered by the bottle onto the floor around its base.
  vec2 fromFloor = (vUv - uFloor.xy) * vec2(uAspect, 1.0) / vec2(uFloor.z, uFloor.z * 0.3);
  float pool = 1.0 - smoothstep(0.35, 1.0, length(fromFloor));
  color *= 1.0 + pool * uFloorLight * (caustics(screen * 7.0, uTime * 0.9) * 0.16 + 0.02);

  vec2 centred = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
  color *= 1.0 - smoothstep(0.35, 1.05, length(centred) * 1.3) * 0.04;
  color *= 1.0 + (hash12(gl_FragCoord.xy + fract(uTime) * 311.0) - 0.5) * uGrain * 2.0;

  gl_FragColor = vec4(untonemap(color), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
