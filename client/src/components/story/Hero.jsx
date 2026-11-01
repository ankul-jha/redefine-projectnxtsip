import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { BRAND } from '../../brand.js';
import { EASE, gsap, splitText } from '../../lib/motion.js';
import { useReducedMotion } from '../../lib/useMediaQuery.js';
import { progress } from '../../scene/progress.js';
import { useContent } from '../../state/catalog.jsx';
import Emphasis, { plain } from '../Emphasis.jsx';
import styles from './Story.module.css';
import { useStoryProgress } from './useStoryProgress.js';

// The hero starts on screen, so it has no entrance: its progress runs as it scrolls away.
const PHASES = { dwell: ['top top', 'bottom top'] };
// When each part of the opening starts, in seconds after the scene is ready. The scene's opening (`intro`) waits for
// the loader to fade, then runs for `intro` seconds: the bottle is filled and capped about two thirds of the way in,
// so the title rises during the pour and the chips pop on as the ribbon finishes winding round it. Under reduced
// motion everything simply fades in, sooner.
const START = 0.6;
const TIMING = {
  motion: { intro: 4.2, title: 1.2, copy: 1.5, chips: 4.3 },
  still: { intro: 1.2, title: 0.6, copy: 0.7, chips: 0.8 },
};

// The copy stays while the hero is pinned and lifts away as its frame scrolls off, before it reaches the header (the
// hero's dwell runs from pinned to gone; copy along the bottom of a compact frame reaches the header later).
function reveal({ dwell }, select, distance, { compact }) {
  dwell.to(select('[data-exit]'), { autoAlpha: 0, y: -40 * distance, duration: 0.2, stagger: 0.02, ease: 'power2.in' }, compact ? 0.55 : 0.3);
}

// A · Hero, laid out like a poster: the scene draws a white sphere behind the bottle and a satin ribbon winding
// round it (ribbon.js), the size sticks to the bottle's shoulder, and the copy sits in the corners, which the sphere
// keeps clear of ([data-clear]). Once the scene is ready the empty bottle rises as the sphere springs open, water
// pours in from above, the cap drops on, and the ribbon draws itself round the bottle (choreography.js times each
// part along `intro`, which runs linearly). The title rises line by line meanwhile, and the chips pop on at the
// end.
export default function Hero({ ready }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { headline, intro, hero } = useContent();
  useStoryProgress(ref, 'hero', { phases: PHASES, reveal });

  useLayoutEffect(() => {
    if (!ready) return undefined;
    const { intro: duration } = reducedMotion ? TIMING.still : TIMING.motion;
    const context = gsap.context(() => {
      gsap.fromTo(progress, { intro: 0 }, { intro: 1, duration, delay: START, ease: 'none' });
    });
    return () => context.revert();
  }, [ready, reducedMotion]);

  useLayoutEffect(() => {
    if (!ready) return undefined;
    const timing = reducedMotion ? TIMING.still : TIMING.motion;
    const context = gsap.context((self) => {
      const [title] = self.selector('[data-split]');
      splitText(title, 'lines', (lines) =>
        gsap.from(lines, {
          ...(reducedMotion ? { opacity: 0 } : { yPercent: 110 }),
          duration: 1.4,
          stagger: 0.1,
          delay: timing.title,
          ease: EASE.out,
        }),
      );
      gsap.from(self.selector('[data-rise]'), {
        autoAlpha: 0,
        y: reducedMotion ? 0 : 24,
        duration: 1.2,
        stagger: 0.08,
        delay: timing.copy,
        ease: EASE.out,
      });
      gsap.from(self.selector('[data-pop]'), {
        autoAlpha: 0,
        ...(reducedMotion ? {} : { scale: 0.2, rotation: -24 }),
        duration: 1,
        stagger: 0.12,
        delay: timing.chips,
        ease: 'back.out(2.2)',
      });
    }, ref);
    return () => context.revert();
  }, [ready, reducedMotion, hero.title, hero.size, hero.facts.length]);

  return (
    <section ref={ref} className={`${styles.section} ${styles.hero}`} aria-labelledby="hero-title">
      <div className={styles.frame} data-frame>
        <h1 id="hero-title" className="visually-hidden">
          {plain(headline)}
        </h1>

        <div className={styles.heroIntro} data-clear="hero" data-exit>
          <p className="eyebrow" data-rise>
            {BRAND.name} · Natural drinking water
          </p>
          <p key={hero.title} className={`display ${styles.heroTitle}`} data-split aria-hidden="true">
            <Emphasis text={hero.title} />
          </p>
        </div>

        <div className={styles.heroLead} data-clear="hero" data-exit>
          <p className="lead" data-rise>
            {intro}
          </p>
          <ul className={styles.facts} aria-label="About this bottle">
            {hero.facts.map((fact) => (
              <li key={fact}>
                <span className="chip" data-pop>
                  {fact}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.sizeSticker} data-exit>
          <span className="chip" data-pop>
            {hero.size}
          </span>
        </p>

        <div className={styles.badgeSlot} data-clear="hero" data-exit>
          <a className={styles.badge} href="#source" data-pop>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <path id="badge-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" fill="none" />
              <text>
                <textPath href="#badge-ring" textLength="282">
                  Scroll to explore · {BRAND.name} · Pure water ·
                </textPath>
              </text>
            </svg>
            <span className="visually-hidden">Scroll to the story</span>
          </a>
        </div>

        <div className={styles.heroActions} data-clear="hero" data-exit>
          <div className={styles.actions} data-rise>
            <a className="button button--large button--arrow" href="#products">
              Order by the case
            </a>
            <Link className="button button--large button--secondary" to="/shop#wholesale">
              Wholesale pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
