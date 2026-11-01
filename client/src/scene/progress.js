// Scroll progress of each story section, written by the section components (GSAP ScrollTrigger, scrub) and read by
// the WebGL scene every frame. `enter` runs 0 → 1 while a section scrolls into view, `dwell` while its frame is
// pinned, `leave` while its frame scrolls away (only the copy uses that one). `intro` plays once when the scene is
// ready.
export const progress = {
  intro: 0,
  hero: { enter: 1, dwell: 0, leave: 0 },
  source: { enter: 0, dwell: 0, leave: 0 },
  minerals: { enter: 0, dwell: 0, leave: 0 },
  cap: { enter: 0, dwell: 0, leave: 0 },
  process: { enter: 0, dwell: 0, leave: 0 },
  products: { enter: 0, dwell: 0, leave: 0 },
  cta: { enter: 0, dwell: 0, leave: 0 },
};
