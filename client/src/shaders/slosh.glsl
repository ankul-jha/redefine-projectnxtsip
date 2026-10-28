// Water sloshing, by vertex displacement. The top of the water mesh rests at uLevel; uSlope tilts that surface
// (in the mesh's own space) so it stays level as the bottle tilts and lags behind its motion, and uWave adds a
// small standing wave. Walls stretch with the surface, so the water never leaves the bottle.
uniform float uLevel;
uniform float uFloor;
uniform vec2 uCentre;
uniform float uHalfWidth;
uniform vec2 uSlope;
uniform float uWave;
uniform float uTime;

float sloshHeight(vec2 xz) {
  vec2 q = (xz - uCentre) / uHalfWidth;
  return uHalfWidth * (dot(q, uSlope) + uWave * cos(length(q) * 9.4) * sin(uTime * 8.0));
}

vec3 sloshPosition(vec3 position) {
  float lift = clamp((position.y - uFloor) / (uLevel - uFloor), 0.0, 1.0);
  return position + vec3(0.0, sloshHeight(position.xz) * lift, 0.0);
}

// The top surface faces up; its normal follows the displaced surface. Other normals are unchanged.
vec3 sloshNormal(vec3 position, vec3 normal) {
  if (normal.y < 0.99) return normal;
  vec2 q = (position.xz - uCentre) / uHalfWidth;
  float r = max(length(q), 1e-4);
  vec2 gradient = uSlope - uWave * 9.4 * sin(r * 9.4) * sin(uTime * 8.0) * q / r;
  return normalize(vec3(-gradient.x, 1.0, -gradient.y));
}
