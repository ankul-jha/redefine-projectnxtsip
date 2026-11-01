// The backdrop behind the bottle: the page's gradient (the same as --gradient-page in theme.css), the hero's white
// sphere, and the white blocks of the purification and closing sections. The material is not tone mapped, so these
// are the CSS colours exactly. Colours are blended in sRGB, as CSS blends them (blended in linear light, the soft
// edge between the blue and the white goes lavender). DRIPS comes from backdrop.js.
#define PI 3.14159265

uniform vec3 uRoyal;
uniform vec3 uCobalt;
uniform vec3 uDeep;
uniform vec3 uBlock;
uniform vec3 uShade;
uniform float uAspect;
uniform float uResolutionY;

uniform vec3 uDisc;
uniform float uDiscScale;
uniform float uPosterMix;

uniform vec2 uBands;
uniform float uDrip;
uniform float uBlockMix;

varying vec2 vUv;

vec3 srgb(vec3 linear) {
  return sRGBTransferOETF(vec4(linear, 1.0)).rgb;
}

float hash(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

// A smooth union of two distances: shapes closer than k melt into each other.
float smoothUnion(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Distance to a box of half size `size` with corners rounded by `radius`, centred on the origin. Negative inside.
float roundBox(vec2 p, vec2 size, float radius) {
  vec2 q = abs(p) - size + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// linear-gradient(170deg, royal 0%, cobalt 55%, deep 100%) across the screen, as CSS lays it out: along a line 10°
// off vertical, long enough that its ends meet the top-left and bottom-right corners.
vec3 page(vec2 uv) {
  const vec2 direction = vec2(0.1736, 0.9848);
  float reach = direction.x * uAspect + direction.y;
  float t = 0.5 + ((uv.x - 0.5) * uAspect * direction.x + (0.5 - uv.y) * direction.y) / reach;
  return t < 0.55 ? mix(srgb(uRoyal), srgb(uCobalt), t / 0.55) : mix(srgb(uCobalt), srgb(uDeep), (t - 0.55) / 0.45);
}

// Coverage of a circle (centre in uv, radius in screen heights), with a soft edge one pixel wide.
float circle(vec2 uv, vec3 shape, float pixel) {
  float reach = length((uv - shape.xy) * vec2(uAspect, 1.0));
  return (1.0 - smoothstep(shape.z - pixel, shape.z + pixel, reach)) * step(1e-5, shape.z);
}

// The hero's disc, shaded like a matte white sphere lit from the upper left, turning pale blue on its far side: a
// small white planet behind the bottle. `shape` is its centre in uv and radius in screen heights.
vec3 sphere(vec2 uv, vec3 shape) {
  vec2 n = (uv - shape.xy) * vec2(uAspect, 1.0) / max(shape.z, 1e-4);
  vec3 surface = vec3(n, sqrt(max(1.0 - dot(n, n), 0.0)));
  float light = dot(surface, normalize(vec3(-0.5, 0.6, 0.65)));
  return mix(srgb(uShade), srgb(uBlock), smoothstep(-0.25, 0.7, light));
}

// Four bands of white slide across the screen from alternating sides, top first, like layers settling in a filter:
// uBands.x brings them in and uBands.y carries them on out the far side. Their ends are round.
float bands(vec2 uv, float pixel) {
  float row = clamp(floor(uv.y * 4.0), 0.0, 3.0);
  float delay = (3.0 - row) * 0.1;
  float head = smoothstep(0.0, 1.0, clamp(uBands.x * 1.3 - delay, 0.0, 1.0));
  float tail = smoothstep(0.0, 1.0, clamp(uBands.y * 1.3 - delay, 0.0, 1.0));
  float radius = 0.125;
  float along = (mod(row, 2.0) < 0.5 ? uv.x : 1.0 - uv.x) * uAspect;
  float from = mix(-radius, uAspect + radius, tail);
  float to = mix(-radius, uAspect + radius, head);
  vec2 p = vec2(along - (from + to) * 0.5, uv.y - (row + 0.5) * 0.25);
  float shape = roundBox(p, vec2((to - from) * 0.5 + radius, radius + pixel), radius);
  return (1.0 - smoothstep(-pixel, pixel, shape)) * step(1e-4, to - from);
}

// White runs down from the top of the screen like thick paint: a sheet along the top edge with drips of different
// widths and speeds hanging from it, melting into it. uDrip takes it from nothing (0) to the whole screen (1).
float drips(vec2 uv, float pixel) {
  if (uDrip <= 0.0) return 0.0;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float sheet = 1.02 - 1.25 * pow(uDrip, 1.4);
  float shape = sheet - p.y;
  for (int i = 0; i < DRIPS; i++) {
    float n = float(i);
    float x = (n + 0.2 + 0.6 * hash(n + 1.0)) / float(DRIPS) * uAspect;
    float width = 0.022 + 0.035 * hash(n + 7.0);
    float lead = (0.1 + 0.32 * hash(n + 13.0)) * sin(min(uDrip * 1.15, 1.0) * PI);
    float drip = length(vec2(p.x - x, max(sheet - lead - p.y, 0.0))) - width;
    shape = smoothUnion(shape, drip, 0.06);
  }
  return 1.0 - smoothstep(-pixel, pixel, shape);
}

void main() {
  float pixel = 1.5 / uResolutionY;
  vec3 color = page(vUv);
  color = mix(color, srgb(uBlock), max(bands(vUv, pixel), drips(vUv, pixel)) * uBlockMix);
  vec3 hero = vec3(uDisc.xy, uDisc.z * uDiscScale);
  color = mix(color, sphere(vUv, hero), circle(vUv, hero, pixel) * uPosterMix);

  gl_FragColor = sRGBTransferEOTF(vec4(color, 1.0));
  #include <colorspace_fragment>
}
