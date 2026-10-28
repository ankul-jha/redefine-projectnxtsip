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
  '--lineup-below': `${LINEUP.below}px`,
};

function SizeCard({ product }) {
  const { add } = useCart();
  const soldOut = stockStatus(product.stock) === 'out';

  return (
    <>
      <h3 className={styles.slotName}>{formatVolume(product.volumeMl)}</h3>
      <p className={styles.slotMeta}>{formatCase(product)}</p>
      <p className={styles.slotPrice}>
        {formatMoney(product.casePrice)} <span>per {formatUnit(product)}</span>
      </p>
      <button type="button" className="button button--small" disabled={soldOut} onClick={() => add(product.id, 1)}>
        {soldOut ? 'Out of stock' : 'Add a case'}
      </button>
    </>
  );
}

// F · Products. The bottle joins the 1 L and the 20 L jar; each size's details sit under it, with wholesale pricing.
export default function Products() {
  const ref = useRef(null);
  const { water, tiers } = useCatalog();
  useStoryProgress(ref, 'products', { reveal: revealCopy });

  return (
    <section
      id="products"
      ref={ref}
      className={`${styles.section} ${styles.products}`}
      style={BASELINE}
      aria-labelledby="products-title"
    >
      <div className={styles.frame}>
        <div className={styles.productsHead} data-reveal>
          <p className="eyebrow">05 · The range</p>
          <h2 id="products-title" className={styles.title}>
            Choose your size.
          </h2>
        </div>

        <ul className={styles.slots}>
          {LINEUP_SIZES.map((volume) => {
            const product = water.find((item) => item.volumeMl === volume);
            return (
              <li key={volume} className={styles.slot} data-reveal>
                {product ? <SizeCard product={product} /> : <h3 className={styles.slotName}>{formatVolume(volume)}</h3>}
              </li>
            );
          })}
        </ul>

        <div id="wholesale" className={styles.tiers} data-reveal>
          <p className={styles.tiersTitle}>Wholesale, applied automatically</p>
          <ul>
            {tiers.map((tier) => (
              <li key={tier.minCases}>
                <strong>{formatPercent(tier.discountBps)}</strong> off from {tier.minCases} cases
              </li>
            ))}
          </ul>
          <div className={styles.tiersActions}>
            <Link to="/shop" className={styles.allSizes}>
              All sizes
            </Link>
            <CallButton className="button button--small">Call for wholesale</CallButton>
          </div>
        </div>
      </div>
    </section>
  );
}
