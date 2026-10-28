// Shows only the stretch of the pour stream between uTail and uHead (fractions of its length): rings outside it
// collapse onto the centre line, so the water front falls as the page scrolls and the tail drains away after it.
attribute vec3 aCentre;
uniform float uHead;
uniform float uTail;

vec3 streamPosition(vec3 position, float along) {
  float shown = smoothstep(uTail, uTail + 0.04, along) * (1.0 - smoothstep(uHead - 0.04, uHead, along));
  return mix(aCentre, position, shown);
}
