// Soft moving caustics: bright seams where cells of two slowly drifting layers meet, like light under shallow water.
// Needs hash12 from noise.glsl.

// Distance from p to the nearest seam between cells whose centres orbit slowly.
float cellSeam(vec2 p, float time) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  float nearest = 8.0;
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 seed = vec2(hash12(cell + offset), hash12(cell + offset + 17.31));
      vec2 centre = offset + 0.5 + 0.38 * sin(time + 6.2831 * seed) - local;
      float d = dot(centre, centre);
      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) {
        second = d;
      }
    }
  }
  return sqrt(second) - sqrt(nearest);
}

float caustics(vec2 p, float time) {
  vec2 warp = vec2(sin(p.y * 1.7 + time * 0.4), cos(p.x * 1.3 - time * 0.3)) * 0.18;
  float a = 1.0 - smoothstep(0.0, 0.16, cellSeam(p + warp, time * 0.55));
  float b = 1.0 - smoothstep(0.0, 0.12, cellSeam(p * 1.45 - warp + 7.3, time * 0.42));
  return a * a * 0.65 + b * b * 0.45;
}
