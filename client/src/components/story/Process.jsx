import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// Thin line icons, one per step in order, drawn on as each step arrives (every shape has pathLength 1).
const ICONS = [
  (
    <>
      <path pathLength="1" d="M4 5h16l-3 13.4a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L4 5z" />
      <path pathLength="1" d="M5.3 10h13.4M6.4 14.5h11.2" />
    </>
  ),
  (
    <>
      <path pathLength="1" d="M3 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
      <path pathLength="1" d="M8 3.5v4M12 3.5v4M16 3.5v4M12 16.5v4" />
    </>
  ),
  (
    <>
      <path pathLength="1" d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.8 6-11z" />
      <circle pathLength="1" cx="10" cy="15" r="1.2" />
      <circle pathLength="1" cx="14" cy="12.5" r="1.2" />
    </>
  ),
  (
    <>
      <circle pathLength="1" cx="12" cy="12" r="4" />
      <path pathLength="1" d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
];

// The steps slide in from the right while the section is pinned, each icon drawing itself as it lands.
function reveal(timelines, select, distance) {
  revealCopy(timelines, select, distance);
  const { dwell } = timelines;
  dwell.from(select('[data-step]'), { autoAlpha: 0, x: 64 * distance, duration: 0.24, stagger: 0.17, ease: 'power2.out' }, 0.04);
  if (distance > 0) {
    dwell.fromTo(select('[data-step] svg > *'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.2, stagger: 0.07, ease: 'power2.out' }, 0.08);
  }
}

// E · Purification. On a block of azure, the bottle moves aside while the four steps arrive.
export default function Process() {
  const ref = useRef(null);
  const { process } = useContent();
  useStoryProgress(ref, 'process', { reveal });

  return (
    <section ref={ref} className={`${styles.section} ${styles.process}`} aria-labelledby="process-title">
      <div className={styles.frame}>
        <div className={`${styles.copy} ${styles.end}`}>
          <p className="eyebrow" data-reveal>
            04 · Purification
          </p>
          <h2 id="process-title" className={styles.title} data-reveal>
            {process.title}
          </h2>
          <ol className={styles.steps}>
            {process.steps.map((step, index) => (
              <li key={index} className={styles.step} data-step>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {ICONS[index]}
                </svg>
                <div>
                  <h3>
                    <span className={styles.stepNumber}>0{index + 1}</span> {step.title}
                  </h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
