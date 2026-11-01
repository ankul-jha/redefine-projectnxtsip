import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import Emphasis from '../Emphasis.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// Thin line icons, one per step in order: filter, membrane, minerals, light.
const ICONS = [
  (
    <>
      <path d="M4 5h16l-3 13.4a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L4 5z" />
      <path d="M5.3 10h13.4M6.4 14.5h11.2" />
    </>
  ),
  (
    <>
      <path d="M3 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
      <path d="M8 3.5v4M12 3.5v4M16 3.5v4M12 16.5v4" />
    </>
  ),
  (
    <>
      <path d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.8 6-11z" />
      <circle cx="10" cy="15" r="1.2" />
      <circle cx="14" cy="12.5" r="1.2" />
    </>
  ),
  (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
];

// The copy (dark, on white) arrives once the bands have slid in; the steps come in dimmed, then light up one after another
// (the --lit variable, so it never fights the entrance over opacity) while the rail beside them fills (--fill).
function reveal(timelines, select, distance, layout) {
  revealCopy(timelines, select, distance, { ...layout, from: 0.6 });
  const { enter, dwell } = timelines;
  const steps = select('[data-step]');
  enter.from(steps, { autoAlpha: 0, y: 24 * distance, duration: 0.2, stagger: { amount: 0.08 }, ease: 'power3.out' }, 0.72);
  dwell.fromTo(select('[data-rail]'), { '--fill': 0 }, { '--fill': 1, duration: 0.68, ease: 'none' }, 0.04);
  steps.forEach((step, index) => {
    dwell.fromTo(step, { '--lit': 0 }, { '--lit': 1, duration: 0.08, ease: 'power2.out' }, 0.04 + index * 0.2);
  });
}

// E · Purification. White bands slide in like filter layers and the bottle moves aside while the four steps arrive;
// a ring of light passes down the bottle as each lights up.
export default function Process() {
  const ref = useRef(null);
  const { process } = useContent();
  useStoryProgress(ref, 'process', { reveal, deps: [process.title] });

  return (
    <section ref={ref} className={`${styles.section} ${styles.process}`} aria-labelledby="process-title">
      <div className={styles.frame} data-frame>
        <div className={`${styles.copy} ${styles.end}`} data-exit>
          <p className="eyebrow" data-reveal>
            04 · Purification
          </p>
          <h2 key={process.title} id="process-title" className={styles.title} data-split>
            <Emphasis text={process.title} />
          </h2>
          <ol className={styles.steps} data-rail>
            {process.steps.map((step, index) => (
              <li key={index} className={styles.step} data-step>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {ICONS[index]}
                </svg>
                <div>
                  <h3>
                    <span className={styles.stepNumber}>0{index + 1}</span>
                    {step.title}
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
