import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion.js';
import { progress } from '../../scene/progress.js';

gsap.registerPlugin(ScrollTrigger);

// A section's scroll phases: `enter` while it scrolls into view, `dwell` while its frame is pinned (position: sticky).
const PHASES = { enter: ['top bottom', 'top top'], dwell: ['top top', 'bottom bottom'] };

// Scrubs the section's progress for the WebGL scene (scrub: 1, so the canvas trails the scroll by a beat) and lets
// the section animate its copy on the same timelines: `reveal({ enter, dwell }, select, distance)` adds tweens in
// 0–1 timeline units. `distance` is 0 under prefers-reduced-motion, so the copy only fades.
export function useStoryProgress(ref, key, { phases = PHASES, reveal } = {}) {
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = ref.current;
    const context = gsap.context(() => {
      const timelines = {};
      for (const [phase, [start, end]] of Object.entries(phases)) {
        timelines[phase] = gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: section, start, end, scrub: 1 } })
          .fromTo(progress[key], { [phase]: 0 }, { [phase]: 1, duration: 1 }, 0);
      }
      reveal?.(timelines, gsap.utils.selector(section), reducedMotion ? 0 : 1);
    }, section);
    return () => context.revert();
  }, [ref, key, phases, reveal, reducedMotion]);
}

// The usual entrance: the section's [data-reveal] elements rise into place in the second half of its scroll-in.
// Tweens must end by 1, or they would stretch the timeline that drives the scene.
export function revealCopy({ enter }, select, distance) {
  enter.from(select('[data-reveal]'), { autoAlpha: 0, y: 32 * distance, duration: 0.3, stagger: { amount: 0.2 }, ease: 'power2.out' }, 0.5);
}

// Sections change height as content loads (catalog, fonts), so trigger positions are measured again when they do.
export function useScrollRefresh(ref) {
  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
}
