import { useState } from 'react';
import { formatMoney } from '../lib/format.js';
import { useCart } from '../state/cart.jsx';
import styles from './CouponField.module.css';

// Applies a coupon code to the cart. The API's quote says whether it is valid and what it takes off.
export default function CouponField({ quote }) {
  const { couponCode, setCouponCode } = useCart();
  const [draft, setDraft] = useState(couponCode);
  const error = couponCode && quote?.couponError;

  if (couponCode && quote?.couponCode) {
    return (
      <div className={styles.applied}>
        <p>
          <strong>{quote.couponCode}</strong> applied · −{formatMoney(quote.couponDiscount)}
        </p>
        <button type="button" className="link-button" onClick={() => setCouponCode('')}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        setCouponCode(draft.trim().toUpperCase());
      }}
    >
      <label htmlFor="coupon-code" className="visually-hidden">
        Coupon code
      </label>
      <input
        id="coupon-code"
        value={draft}
        placeholder="Coupon code"
        autoComplete="off"
        maxLength={32}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'coupon-error' : undefined}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className="button button--secondary button--small" disabled={!draft.trim()}>
        Apply
      </button>
      {error && (
        <p id="coupon-error" className="field-error">
          {error}
        </p>
      )}
    </form>
  );
}
