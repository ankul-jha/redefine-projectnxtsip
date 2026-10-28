import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// C · Water pour. Water falls from the top of the screen and wraps the bottle; the mineral profile reads alongside.
export default function Pour() {
  const ref = useRef(null);
  const { balance, minerals } = useContent();
  useStoryProgress(ref, 'pour', { reveal: revealCopy });

  return (
    <section ref={ref} className={`${styles.section} ${styles.pour}`} aria-labelledby="pour-title">
      <div className={styles.frame}>
        <div className={styles.copy}>
          <p className="eyebrow" data-reveal>
            02 · In every bottle
          </p>
          <h2 id="pour-title" className={styles.title} data-reveal>
            {balance.title}
          </h2>
          <p className={styles.text} data-reveal>
            {balance.text}
          </p>
        </div>
        <div className={styles.mineralPanel}>
          <dl className={styles.minerals}>
            {minerals.map((mineral) => (
              <div key={mineral.label} data-reveal>
                <dt>{mineral.label}</dt>
                <dd>
                  {mineral.value}
                  {mineral.unit && <small>{mineral.unit}</small>}
                </dd>
              </div>
            ))}
          </dl>
          <p className={styles.footnote} data-reveal>
            Typical values; they vary slightly by batch.
          </p>
        </div>
      </div>
    </section>
  );
}
