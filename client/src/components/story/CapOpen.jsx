import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import Emphasis from '../Emphasis.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// The copy is white, so it leaves as the purification's white bands slide in.
const reveal = (timelines, select, distance, layout) =>
  revealCopy(timelines, select, distance, { ...layout, heading: 'flip', exit: 0.05 });

// D · Cap open. The camera moves in close as the cap twists off and lifts, then pulls back as the bottle comes apart
// into its parts. The heading's letters flip up.
export default function CapOpen() {
  const ref = useRef(null);
  const { seal } = useContent();
  useStoryProgress(ref, 'cap', { reveal, deps: [seal.title] });

  return (
    <section ref={ref} className={`${styles.section} ${styles.cap}`} aria-labelledby="cap-title">
      <div className={styles.frame} data-frame>
        <div className={`${styles.copy} ${styles.end}`} data-exit>
          <p className="eyebrow" data-reveal>
            03 · Sealed
          </p>
          <h2 key={seal.title} id="cap-title" className={styles.title} data-split>
            <Emphasis text={seal.title} />
          </h2>
          <p className={styles.text} data-reveal>
            {seal.text}
          </p>
        </div>
      </div>
    </section>
  );
}
