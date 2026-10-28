import { gsap } from 'gsap';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { BRAND } from '../../brand.js';
import { useReducedMotion } from '../../lib/useReducedMotion.js';
import { progress } from '../../scene/progress.js';
import { useContent } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { useStoryProgress } from './useStoryProgress.js';

// The hero starts on screen, so it has no entrance: its progress runs as it scrolls away.
const PHASES = { dwell: ['top top', 'bottom top'] };

// Line-art drops around the bottle, as on a printed poster (wide screens only). Positions are shares of the frame.
const DROPS = [
  { x: 34, y: 72, size: 30, turn: -12 },
  { x: 39, y: 80, size: 44, turn: 8 },
  { x: 33, y: 89, size: 20, turn: -4 },
  { x: 34, y: 18, size: 26, turn: -14 },
  { x: 30, y: 25, size: 16, turn: 6 },
];

// A · Hero, laid out like a poster: the scene draws a large drop and the word "Pure" behind the tilted bottle
// (poster.js); the copy sits in the corners. Once the scene is ready the bottle rises out of the mist and the title
// fades in letter by letter.
export default function Hero({ ready }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { headline, intro, hero } = useContent();
  useStoryProgress(ref, 'hero', { phases: PHASES });

  useLayoutEffect(() => {
    if (!ready) return undefined;
    const context = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .fromTo(progress, { intro: 0 }, { intro: 1, duration: 1.4 }, 0)
        .from('[data-letter]', { autoAlpha: 0, y: reducedMotion ? 0 : '0.3em', duration: 0.9, stagger: reducedMotion ? 0 : 0.04 }, 0.3)
        .from('[data-rise]', { autoAlpha: 0, y: reducedMotion ? 0 : 16, duration: 1, stagger: 0.1 }, 0.6);
    }, ref);
    return () => context.revert();
  }, [ready, reducedMotion]);

  return (
    <section ref={ref} className={`${styles.section} ${styles.hero}`} aria-labelledby="hero-title">
      <div className={styles.frame}>
        <h1 id="hero-title" className="visually-hidden">
          {headline}
        </h1>
        {/* The scene draws this word; the page shows it only when WebGL is unavailable. */}
        <p className={`shout ${styles.posterWord}`} aria-hidden="true">
          {hero.word}
        </p>
        <div className={styles.lineDrops} aria-hidden="true">
          {DROPS.map((drop) => (
            <svg
              key={`${drop.x}-${drop.y}`}
              viewBox="0 0 24 34"
              style={{ left: `${drop.x}%`, top: `${drop.y}%`, width: drop.size, rotate: `${drop.turn}deg` }}
            >
              <path d="M12 1.5C9 8 3 14.5 3 21.5a9 9 0 0 0 18 0C21 14.5 15 8 12 1.5Z" />
            </svg>
          ))}
        </div>
        <div className={styles.heroIntro}>
          <p className="eyebrow" data-rise>
            {BRAND.name} · Drinking water
          </p>
          <p className={styles.heroTitle} aria-hidden="true">
            {hero.title.split(' ').map((word, index) => (
              <Fragment key={index}>
                {index > 0 && ' '}
                <span className={styles.word}>
                  {[...word].map((letter, i) => (
                    <span key={i} data-letter>
                      {letter}
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          </p>
          <p className={styles.lead} data-rise>
            {intro}
          </p>
        </div>
        <div className={styles.heroFacts} data-rise>
          <p className={styles.heroSize}>{hero.size}</p>
          <ul>
            {hero.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        <div className={styles.actions} data-rise>
          <a className="button" href="#products">
            Order by the case
          </a>
          <a className="button button--secondary" href="#wholesale">
            Wholesale pricing
          </a>
        </div>
      </div>
    </section>
  );
}
