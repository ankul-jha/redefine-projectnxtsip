import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import styles from './Story.module.css';

const DROP = 'M20 2C20 2 4 20.5 4 32a16 16 0 0 0 32 0C36 20.5 20 2 20 2z';
const WAVE = 'M-40 0q5-2.5 10 0t10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0 10 0V60H-40z';

// The loading screen: a single drop that fills as the scene downloads, with the percentage beneath it.
export default function Loader({ progress, done }) {
  const [shown, setShown] = useState(0);
  const counter = useRef({ value: 0 });

  useEffect(() => {
    const tween = gsap.to(counter.current, {
      value: done ? 1 : progress,
      duration: 0.6,
      ease: 'power2.out',
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
      <svg className={styles.drop} viewBox="0 0 40 50" aria-hidden="true">
        <clipPath id="loader-drop">
          <path d={DROP} />
        </clipPath>
        <g clipPath="url(#loader-drop)">
          <g style={{ transform: `translateY(${50 - 48 * shown}px)` }}>
            <path className={styles.dropWater} d={WAVE} />
          </g>
        </g>
        <path className={styles.dropOutline} d={DROP} />
      </svg>
      <p className={styles.percent}>{percent}%</p>
    </div>
  );
}
