import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// D · Cap open. The bottle tilts, the cap twists off as the seal ring drops, and droplets lift out.
export default function CapOpen() {
  const ref = useRef(null);
  const { seal } = useContent();
  useStoryProgress(ref, 'cap', { reveal: revealCopy });

  return (
    <section ref={ref} className={`${styles.section} ${styles.cap}`} aria-labelledby="cap-title">
      <div className={styles.frame}>
        <div className={`${styles.copy} ${styles.end}`}>
          <p className="eyebrow" data-reveal>
            03 · Sealed
          </p>
          <h2 id="cap-title" className={styles.title} data-reveal>
            {seal.title}
          </h2>
          <p className={styles.text} data-reveal>
            {seal.text}
          </p>
        </div>
      </div>
    </section>
  );
}
