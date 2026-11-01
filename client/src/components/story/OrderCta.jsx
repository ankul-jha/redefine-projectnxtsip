import { useRef } from 'react';
import { Link } from 'react-router';
import { formatMoney } from '../../lib/format.js';
import { useCatalog } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// The section is one screen tall, so it only has an entrance; its dark copy waits for the white to run down.
const PHASES = { enter: ['top bottom', 'top top'] };
const reveal = (timelines, select, distance, layout) => revealCopy(timelines, select, distance, { ...layout, from: 0.5 });

// G · Order. White runs down the screen like paint and the 500 ml comes forward, tilted, in front of the closing
// word, whose letters spring up one by one (drawn by the scene, clear of the copy underneath).
export default function OrderCta() {
  const ref = useRef(null);
  const { content, site } = useCatalog();
  useStoryProgress(ref, 'cta', { phases: PHASES, reveal });

  return (
    <section ref={ref} className={`${styles.section} ${styles.cta}`} aria-labelledby="cta-title">
      <div className={styles.frame} data-frame>
        <h2 id="cta-title" className="visually-hidden">
          {content.cta.word}
        </h2>
        {/* The scene draws this word; the page shows it only when WebGL is unavailable. */}
        <p className={`shout ${styles.posterWord}`} aria-hidden="true">
          {content.cta.word}
        </p>
        <div className={styles.ctaCopy} data-clear="cta">
          <p className={styles.ctaLead} data-reveal>
            {content.cta.text}
          </p>
          <div className={styles.actions} data-reveal>
            <Link to="/shop" className="button button--large button--arrow">
              Order now
            </Link>
            <Link to="/shop#wholesale" className="button button--large button--secondary">
              Wholesale pricing
            </Link>
          </div>
          {site.delivery.freeFrom > 0 && (
            <p className={styles.ctaNote} data-reveal>
              Free delivery on orders over {formatMoney(site.delivery.freeFrom)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
