import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import Emphasis from '../Emphasis.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

const reveal = (timelines, select, distance, layout) => revealCopy(timelines, select, distance, { ...layout, heading: 'words' });

// B · The source. The spring photograph's arched window rises behind the bottle as it turns 90° to its label, then
// grows to fill the screen. The heading's words rise with a tilt.
export default function Source() {
  const ref = useRef(null);
  const { source } = useContent();
  useStoryProgress(ref, 'source', { reveal, deps: [source.title] });

  return (
    <section id="source" ref={ref} className={`${styles.section} ${styles.source}`} aria-labelledby="source-title">
      <div className={styles.frame} data-frame>
        <div className={styles.copy} data-exit>
          <p className="eyebrow" data-reveal>
            01 · The source
          </p>
          <h2 key={source.title} id="source-title" className={styles.title} data-split>
            <Emphasis text={source.title} />
          </h2>
          <p className={styles.text} data-reveal>
            {source.text}
          </p>
        </div>
      </div>
    </section>
  );
}
