import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../lib/motion.js';
import { useReducedMotion } from '../lib/useMediaQuery.js';
import styles from './Marquee.module.css';

// The words repeat enough times to span wide screens, twice over so the loop is seamless.
const REPEAT = 3;
// How much faster the strip runs per pixel per second of scroll speed (up to `boost` times), and how far it leans.
const SCROLL = { perPixel: 1 / 300, boost: 6, skewPerPixel: 1 / 350, skew: 8 };

// The strip glides on its own, runs faster while the page scrolls (backwards when scrolling up) and leans into the
// motion, then eases back. Under reduced motion it stands still.
function useScrollingStrip(ref) {
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const track = ref.current;
    if (reducedMotion || !track) return undefined;
    const context = gsap.context(() => {
      const loop = gsap.to(track, { xPercent: -50, duration: 48, ease: 'none', repeat: -1 });
      const lean = { skew: 0 };
      const setSkew = gsap.quickSetter(track, 'skewX', 'deg');
      ScrollTrigger.create({
        onUpdate(self) {
          const speed = self.getVelocity();
          const boost = gsap.utils.clamp(1, SCROLL.boost, 1 + Math.abs(speed) * SCROLL.perPixel);
          gsap
            .timeline()
            .to(loop, { timeScale: boost * self.direction, duration: 0.15 })
            .to(loop, { timeScale: self.direction, duration: 1, ease: 'power2.out' });
          const skew = gsap.utils.clamp(-SCROLL.skew, SCROLL.skew, -speed * SCROLL.skewPerPixel);
          if (Math.abs(skew) > Math.abs(lean.skew)) {
            lean.skew = skew;
            gsap.to(lean, { skew: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: () => setSkew(lean.skew) });
          }
        },
      });
    });
    return () => context.revert();
  }, [ref, reducedMotion]);
}

// A strip of big words gliding across the top of the footer, every other one outlined. Decorative, so hidden from
// screen readers.
export default function Marquee({ words }) {
  const trackRef = useRef(null);
  useScrollingStrip(trackRef);
  if (words.length === 0) return null;
  const run = Array.from({ length: REPEAT }, () => words).flat();

  return (
    <div className={styles.band} aria-hidden="true">
      <div ref={trackRef} className={styles.track}>
        {[0, 1].map((half) => (
          <p key={half} className={styles.run}>
            {run.map((word, index) => (
              <span key={index} className={styles.item} data-outline={index % 2 === 1}>
                {word}
                <svg viewBox="0 0 24 34" className={styles.drop}>
                  <path d="M12 1.5C9 8 3 14.5 3 21.5a9 9 0 0 0 18 0C21 14.5 15 8 12 1.5Z" />
                </svg>
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
