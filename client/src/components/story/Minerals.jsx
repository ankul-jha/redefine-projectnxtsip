import { useRef } from 'react';
import { useContent } from '../../state/catalog.jsx';
import Emphasis from '../Emphasis.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

const PLAIN_NUMBER = /^\d+(\.\d+)?$/;

// The copy's usual entrance and exit, and each mineral figure counting up from zero as it arrives. Only plain
// numbers count ("7.4", "120"); anything else shows as written. The count writes into React's own text node, so
// React can still update it.
function reveal(timelines, select, distance, layout) {
  revealCopy(timelines, select, distance, { ...layout, heading: 'slide' });
  if (!distance) return;
  for (const figure of select('[data-count]')) {
    const written = figure.dataset.count;
    if (!PLAIN_NUMBER.test(written)) continue;
    const decimals = written.split('.')[1]?.length ?? 0;
    const counter = { value: 0 };
    const show = () => {
      figure.firstChild.nodeValue = counter.value.toFixed(decimals);
    };
    // From the moment the figures start to fade in, so the written value never shows first.
    timelines.enter.to(counter, { value: Number(written), duration: 0.35, ease: 'power2.out', onUpdate: show }, 0.55);
  }
}

// C · Minerals. The bottle comes back to the middle for one slow turn, mineral beads circling it; the mineral
// profile reads alongside. The heading's lines slide in from the left.
export default function Minerals() {
  const ref = useRef(null);
  const { balance, minerals } = useContent();
  const figures = minerals.map((mineral) => mineral.value).join(' ');
  useStoryProgress(ref, 'minerals', { reveal, deps: [balance.title, figures] });

  return (
    <section ref={ref} className={`${styles.section} ${styles.minerals}`} aria-labelledby="minerals-title">
      <div className={styles.frame} data-frame>
        <div className={styles.copy} data-exit>
          <p className="eyebrow" data-reveal>
            02 · In every bottle
          </p>
          <h2 key={balance.title} id="minerals-title" className={styles.title} data-split>
            <Emphasis text={balance.title} />
          </h2>
          <p className={styles.text} data-reveal>
            {balance.text}
          </p>
        </div>
        <div className={styles.readout} data-exit>
          <dl className={styles.figures}>
            {minerals.map((mineral) => (
              <div key={mineral.label} data-reveal>
                <dt>{mineral.label}</dt>
                <dd>
                  <span key={mineral.value} data-count={mineral.value}>
                    {mineral.value}
                  </span>
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
