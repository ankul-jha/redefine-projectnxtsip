// Inverse of three.js ACESFilmicToneMapping at exposure 1 (r186). A colour passed through this comes out of the
// renderer's tone mapping unchanged, so WebGL backgrounds match the CSS palette exactly.
vec3 untonemap(vec3 color) {
  const mat3 outputInverse = mat3(
    vec3(0.64304, 0.05927, 0.00596),
    vec3(0.31119, 0.93144, 0.06393),
    vec3(0.04578, 0.00929, 0.93012)
  );
  const mat3 inputInverse = mat3(
    vec3(1.76474, -0.14703, -0.03634),
    vec3(-0.67578, 1.16025, -0.16244),
    vec3(-0.08896, -0.01322, 1.19877)
  );
  vec3 y = clamp(outputInverse * color, 0.0, 0.98);
  // Solve (v² + 0.0245786 v - 0.000090537) / (0.983729 v² + 0.4329510 v + 0.238081) = y for v (the RRT/ODT fit).
  vec3 a = 1.0 - 0.983729 * y;
  vec3 b = 0.0245786 - 0.4329510 * y;
  vec3 c = -0.000090537 - 0.238081 * y;
  vec3 v = (-b + sqrt(b * b - 4.0 * a * c)) / (2.0 * a);
  return inputInverse * v * 0.6;
}
