import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../brand.js';
import { EASE, gsap } from '../../lib/motion.js';
import styles from './Story.module.css';

// The wordmark and the percentage, centred on the screen.
function Face({ logo, percent }) {
  return (
    <div className={styles.loaderFace}>
      <img className={styles.loaderLogo} src={logo} alt="" width="720" height="229" />
      <p className={styles.percent}>{percent}%</p>
    </div>
  );
}

// The loading screen: a white screen that fills with the page's blue from the bottom up as the scene downloads.
// Under the blue the wordmark turns white. Once full the screen is the page itself, so the loader fades out without
// a seam and the bottle rises through it.
export default function Loader({ progress, done }) {
  const [shown, setShown] = useState(0);
  const counter = useRef({ value: 0 });

  useEffect(() => {
    const tween = gsap.to(counter.current, {
      value: done ? 1 : progress,
      duration: 0.6,
      ease: EASE.out,
      onUpdate: () => setShown(counter.current.value),
    });
    return () => tween.kill();
  }, [progress, done]);

  // Keep the page still underneath until the scene is ready.
  useEffect(() => {
    if (done) return undefined;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = '';
    };
  }, [done]);

  const percent = Math.round(shown * 100);
  return (
    <div
      className={styles.loader}
      data-done={done}
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-hidden={done}
    >
      <Face logo={BRAND.logo.wordmark} percent={percent} />
      <div className={styles.blue} style={{ '--level': shown }}>
        <div className={styles.blueInside}>
          <Face logo={BRAND.logo.wordmarkOnDark} percent={percent} />
        </div>
      </div>
    </div>
  );
}
