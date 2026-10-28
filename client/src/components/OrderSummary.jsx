import { formatMoney, formatPercent } from '../lib/format.js';
import styles from './OrderSummary.module.css';

// The price breakdown for the cart, checkout and order pages. `totals` comes from the API or the local estimate.
export default function OrderSummary({ totals }) {
  const { cases, subtotal, discount, discountBps, couponCode, couponDiscount, deliveryFee, total, nextTier } = totals;

  return (
    <div className={styles.summary}>
      <dl>
        <div className={styles.row}>
          <dt>
            Subtotal · {cases} {cases === 1 ? 'case' : 'cases'}
          </dt>
          <dd>{formatMoney(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className={`${styles.row} ${styles.saving}`}>
            <dt>Wholesale discount ({formatPercent(discountBps)})</dt>
            <dd>−{formatMoney(discount)}</dd>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className={`${styles.row} ${styles.saving}`}>
            <dt>Coupon {couponCode}</dt>
            <dd>−{formatMoney(couponDiscount)}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>Delivery</dt>
          <dd>{deliveryFee > 0 ? formatMoney(deliveryFee) : 'Free'}</dd>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <dt>Total</dt>
          <dd>{formatMoney(total)}</dd>
        </div>
      </dl>
      {nextTier && (
        <p className={styles.hint}>
          Add {nextTier.minCases - cases} more {nextTier.minCases - cases === 1 ? 'case' : 'cases'} to save{' '}
          {formatPercent(nextTier.discountBps)} on your whole order.
        </p>
      )}
    </div>
  );
}
