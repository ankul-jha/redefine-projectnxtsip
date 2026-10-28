// Instanced droplets, moved on the GPU. Each instance has a launch velocity, a phase and a size.
// SPLASH: droplets leap from uOrigin where the pour lands and fall back, looping while uAmount (the pour) is up.
// Otherwise: droplets lift slowly out of the open bottle as uTime goes from 0 to 1 with the scroll.
attribute vec3 aVelocity;
attribute float aPhase;
attribute float aSize;
uniform vec3 uOrigin;
uniform float uTime;
uniform float uAmount;

vec3 dropletPosition(vec3 position) {
#ifdef SPLASH
  float age = fract(uTime * 1.3 + aPhase);
  float t = age * 0.75;
  vec3 offset = aVelocity * t + vec3(0.0, -4.9 * t * t, 0.0);
  float size = aSize * uAmount * smoothstep(0.0, 0.08, age) * smoothstep(-0.12, 0.0, offset.y);
#else
  float age = clamp(uTime * 1.25 - aPhase * 0.25, 0.0, 1.0);
  float rise = 1.0 - (1.0 - age) * (1.0 - age);
  vec3 offset = aVelocity * rise + vec3(sin(age * 6.0 + aPhase * 20.0) * 0.03, 0.0, 0.0);
  float size = aSize * uAmount * smoothstep(0.0, 0.15, age);
#endif
  return uOrigin + offset + position * size;
}
