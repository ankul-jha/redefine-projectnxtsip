import { useRef } from 'react';
import { Link } from 'react-router';
import CallButton from '../CallButton.jsx';
import { formatCase, formatMoney, formatPercent, formatUnit, formatVolume } from '../../lib/format.js';
import { stockStatus } from '../../lib/pricing.js';
import { LINEUP } from '../../scene/layout.js';
import { useCart } from '../../state/cart.jsx';
import { useCatalog } from '../../state/catalog.jsx';
import styles from './Story.module.css';
import { revealCopy, useStoryProgress } from './useStoryProgress.js';

// The sizes standing in the 3D lineup, left to right.
const LINEUP_SIZES = [500, 1000, 20000];
const BASELINE = {
  '--baseline-wide': LINEUP.baseline.wide,
  '--baseline-compact': LINEUP.baseline.compact,
  '--lineup-below': `${LINEUP.below.wide}px`,
  '--lineup-below-short': `${LINEUP.below.short}px`,
};

function SizeCard({ product }) {
  const { add } = useCart();
  const soldOut = stockStatus(product.stock) === 'out';

  return (
    <>
      <h3 className={styles.slotName}>{formatVolume(product.volumeMl)}</h3>
      <p className={styles.slotMeta}>{formatCase(product)}</p>
      <p className={styles.slotPrice}>
        {formatMoney(product.casePrice)} <span>/ {formatUnit(product)}</span>
      </p>
      <button type="button" className="button button--small" disabled={soldOut} onClick={() => add(product.id, 1)}>
        {soldOut ? 'Out of stock' : 'Add a case'}
      </button>
    </>
  );
}

// The heading arrives with the lineup; the size cards and the tiers only once the frame is pinned, when the
// bottles above them have settled.
function reveal(timelines, select, distance, layout) {
  // The copy is white, so it waits for the white bands to clear and leaves as the closing section's white runs in.
  revealCopy(timelines, select, distance, { ...layout, heading: 'spring', from: 0.45, exit: 0.05 });
  timelines.dwell.from(
    select('[data-arrive]'),
    { autoAlpha: 0, y: 24 * distance, duration: 0.18, stagger: { amount: 0.08 }, ease: 'power3.out' },
    0,
  );
}

// F · Products. The bottle hops into a lineup as the 1 L and the 20 L jar drop in beside it; each size's details sit
// under it, with wholesale pricing. The heading's letters spring up.
export default function Products() {
  const ref = useRef(null);
  const { water, tiers } = useCatalog();
  useStoryProgress(ref, 'products', { reveal });

  return (
    <section
      id="products"
      ref={ref}
      className={`${styles.section} ${styles.products}`}
      style={BASELINE}
      aria-labelledby="products-title"
    >
      <div className={styles.frame} data-frame>
        <div className={styles.productsHead} data-exit>
          <p className="eyebrow" data-reveal>
            05 · The range
          </p>
          <h2 id="products-title" className={styles.title} data-split>
            Choose your <em>size</em>.
          </h2>
        </div>

        <ul className={styles.slots} data-exit>
          {LINEUP_SIZES.map((volume) => {
            const product = water.find((item) => item.volumeMl === volume);
            return (
              <li key={volume} className={styles.slot} data-arrive>
                {product ? <SizeCard product={product} /> : <h3 className={styles.slotName}>{formatVolume(volume)}</h3>}
              </li>
            );
          })}
        </ul>

        <div className={styles.tiers} data-exit>
          <p className={styles.tiersTitle} data-arrive>
            Wholesale, applied automatically
          </p>
          <ul data-arrive>
            {tiers.map((tier) => (
              <li key={tier.minCases}>
                <strong>{formatPercent(tier.discountBps)}</strong> off from {tier.minCases} cases
              </li>
            ))}
          </ul>
          <div className={styles.tiersActions} data-arrive>
            <Link to="/shop" className="text-link">
              All sizes →
            </Link>
            <CallButton className="button button--small button--secondary">Call for wholesale</CallButton>
          </div>
        </div>
      </div>
    </section>
  );
}
