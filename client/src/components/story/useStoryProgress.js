import { useLayoutEffect } from 'react';
import { gsap, splitText } from '../../lib/motion.js';
import { useMediaQuery, useReducedMotion } from '../../lib/useMediaQuery.js';
import { COMPACT_QUERY } from '../../scene/layout.js';
import { progress } from '../../scene/progress.js';

// A section's scroll phases: `enter` while it scrolls into view, `dwell` while its frame is pinned (position: sticky),
// `leave` while its frame scrolls away.
const PHASES = { enter: ['top bottom', 'top top'], dwell: ['top top', 'bottom bottom'], leave: ['bottom bottom', 'bottom top'] };

// Scrubs the section's progress for the WebGL scene (scrub: 1, so the canvas trails the scroll by a beat) and lets
// the section animate its copy on the same timelines: `reveal({ enter, dwell, leave }, select, distance, { compact })`
// adds tweens in 0–1 timeline units. `distance` is 0 under prefers-reduced-motion, so the copy only fades; `compact`
// is true when the copy runs along the bottom of the frame (COMPACT_QUERY), which changes when it comes and goes.
// Split headings must be keyed by their text and that text passed in `deps`: when it changes, React swaps the
// element and the tweens are built again for the new one.
export function useStoryProgress(ref, key, { phases = PHASES, reveal, deps = [] } = {}) {
  const reducedMotion = useReducedMotion();
  const compact = useMediaQuery(COMPACT_QUERY);

  useLayoutEffect(() => {
    const section = ref.current;
    const context = gsap.context(() => {
      const timelines = {};
      for (const [phase, [start, end]] of Object.entries(phases)) {
        timelines[phase] = gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: section, start, end, scrub: 1 } })
          .fromTo(progress[key], { [phase]: 0 }, { [phase]: 1, duration: 1 }, 0);
      }
      reveal?.(timelines, gsap.utils.selector(section), reducedMotion ? 0 : 1, { compact });
    }, section);
    return () => context.revert();
  }, [ref, key, phases, reveal, reducedMotion, compact, ...deps]);
}

const STAGGER = 0.12;
// The length of an entrance starting at `at`, so it and its stagger end by 1.
const fit = (at) => Math.min(0.3, 1 - at - STAGGER);

// The ways a section's heading can arrive from behind its line masks, so that no two sections in a row enter
// alike: lines rising, words rising with a tilt, lines sliding in from the left, letters flipping up, letters
// springing up.
const HEADINGS = {
  rise: { unit: 'lines', from: { yPercent: 110 } },
  words: { unit: 'words', from: { yPercent: 110, rotate: 10 } },
  slide: { unit: 'lines', from: { xPercent: -104 } },
  flip: { unit: 'chars', from: { rotationX: -90, transformOrigin: '50% 100%', transformPerspective: 400 } },
  spring: { unit: 'chars', from: { yPercent: 110, scale: 0.4 }, ease: 'back.out(2)' },
};

// A heading arrives in the given way, starting at `at` on the timeline; under reduced motion it fades instead. It
// is split again whenever it re-wraps.
function revealHeading(timeline, heading, at, distance, style) {
  const { unit, from, ease = 'power3.out' } = HEADINGS[style];
  splitText(heading, unit, (pieces) => {
    const tween = gsap.from(pieces, {
      ...(distance ? from : { opacity: 0 }),
      duration: fit(at),
      stagger: { amount: STAGGER },
      ease,
    });
    timeline.add(tween, at);
    return tween;
  });
}

// The usual entrance and exit, overlapping the sections either side, so there is always copy on screen: [data-split]
// headings arrive (in the `heading` way, from HEADINGS) and [data-reveal] copy fades up from `from` of the scroll-in;
// as the frame scrolls away the [data-exit] blocks lift off, before they reach the header (or from `exit` of it). Copy along the bottom of
// a compact frame is the last to scroll into view and the last to reach the header, so there it comes and goes later.
// (Entrance and exit animate different elements, so fast scrolling back and forth never sets one property from two
// timelines.) Tweens must end by 1, or they would stretch the timeline that drives the scene.
export function revealCopy({ enter, leave }, select, distance, { from = 0.2, exit, heading = 'rise', compact = false } = {}) {
  const at = compact ? Math.max(from, 0.45) : from;
  for (const element of select('[data-split]')) revealHeading(enter, element, at, distance, heading);
  const copyAt = at + 0.1;
  enter.from(
    select('[data-reveal]'),
    { autoAlpha: 0, y: 28 * distance, duration: fit(copyAt), stagger: { amount: STAGGER }, ease: 'power3.out' },
    copyAt,
  );
  const exitAt = exit ?? (compact ? 0.4 : 0.15);
  leave?.to(select('[data-exit]'), { autoAlpha: 0, y: -32 * distance, duration: 0.3, ease: 'power2.in' }, exitAt);
}
