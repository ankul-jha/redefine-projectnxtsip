import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// B · The source. The spring photograph comes up in an arch behind the bottle as it turns 90° to its label.
export default function Source() {
  const ref = useRef(null);
  const { source } = useContent();
  useStoryProgress(ref, 'source', { reveal: revealCopy });

  return (
    <section ref={ref} className={`${styles.section} ${styles.source}`} aria-labelledby="source-title">
      <div className={styles.frame}>
        <div className={styles.copy}>
          <p className="eyebrow" data-reveal>
            01 · The source
          </p>
          <h2 id="source-title" className={styles.title} data-reveal>
            {source.title}
          </h2>
          <p className={styles.text} data-reveal>
            {source.text}
          </p>
        </div>
      </div>
    </section>
  );
}
