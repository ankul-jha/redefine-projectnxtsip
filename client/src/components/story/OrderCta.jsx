import { useRef } from 'react';
import { Link } from 'react-router';
import { formatMoney } from '../../lib/format.js';
import { useCatalog } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// The section is one screen tall, so it only has an entrance.
const PHASES = { enter: ['top bottom', 'top top'] };

// G · Order. The 500 ml comes forward, tilted, in front of the closing poster (a pool of azure circled by ripples,
// with the word over it, drawn by the scene); the order buttons sit underneath. The cursor ripples the water.
export default function OrderCta() {
  const ref = useRef(null);
  const { content, site } = useCatalog();
  useStoryProgress(ref, 'cta', { phases: PHASES, reveal: revealCopy });

  return (
    <section ref={ref} className={`${styles.section} ${styles.cta}`} aria-labelledby="cta-title">
      <div className={styles.frame}>
        <h2 id="cta-title" className="visually-hidden">
          {content.cta.word}
        </h2>
        {/* The scene draws this word; the page shows it only when WebGL is unavailable. */}
        <p className={`shout ${styles.posterWord}`} aria-hidden="true">
          {content.cta.word}
        </p>
        <div className={styles.ctaCopy}>
          <p className={styles.lead} data-reveal>
            {content.cta.text}
          </p>
          <div className={styles.actions} data-reveal>
            <Link to="/shop" className="button button--large">
              Order now
            </Link>
            <a className="button button--large button--secondary" href="#wholesale">
              Wholesale pricing
            </a>
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
