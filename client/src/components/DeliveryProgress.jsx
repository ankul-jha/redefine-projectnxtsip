import { formatMoney } from '../lib/format.js';
import { useCatalog } from '../state/catalog.jsx';
import styles from './DeliveryProgress.module.css';

// How close the cart is to free delivery. Hidden when the store doesn't offer it.
export default function DeliveryProgress({ totals }) {
  const { freeFrom } = useCatalog().site.delivery;
  if (freeFrom <= 0) return null;
  const unlocked = totals.toFreeDelivery === 0;
  const share = unlocked ? 1 : 1 - totals.toFreeDelivery / freeFrom;

  return (
    <div className={styles.root}>
      <p>
        {unlocked ? (
          <strong>You've unlocked free delivery.</strong>
        ) : (
          <>
            Add <strong>{formatMoney(totals.toFreeDelivery)}</strong> more for free delivery.
          </>
        )}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuenow={Math.round(share * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}
