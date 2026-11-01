import { useLayoutEffect, useRef } from 'react';
import { EASE, gsap, ScrollTrigger, splitText } from './motion.js';
import { useReducedMotion } from './useMediaQuery.js';

// Entrances for a page's content, each played once as it scrolls into view: headings marked [data-split] rise
// line by line from behind a mask, and [data-reveal] elements fade up, staggered when several arrive together.
// Pass `deps` that bring in content (a catalog arriving, a filter changing): elements that appear then get their
// entrance too, without replaying what is already on screen. Split headings must not change text once shown.
export function useReveal(ref, deps = []) {
  const reducedMotion = useReducedMotion();
  const contextRef = useRef(null);
  const seen = useRef(new WeakSet());

  // One context for the page's whole life, reverted when it closes.
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const context = gsap.context(() => {}, ref);
    contextRef.current = context;
    return () => {
      context.revert();
      contextRef.current = null;
      seen.current = new WeakSet();
    };
  }, [ref, reducedMotion]);

  useLayoutEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const fresh = (selector) => context.selector(selector).filter((element) => !seen.current.has(element));

    context.add(() => {
      for (const heading of fresh('[data-split]')) {
        seen.current.add(heading);
        splitText(heading, 'lines', (lines) =>
          gsap.from(lines, {
            yPercent: 110,
            duration: 1.2,
            stagger: 0.09,
            ease: EASE.out,
            scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
          }),
        );
      }

      const items = fresh('[data-reveal]');
      if (items.length === 0) return;
      for (const item of items) seen.current.add(item);
      gsap.set(items, { autoAlpha: 0, y: 32 });
      ScrollTrigger.batch(items, {
        start: 'top 94%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: EASE.out }),
      });
    });
  }, [reducedMotion, ...deps]);
}
