import { useState } from 'react';
import { Link } from 'react-router';
import { formatCase, formatMoney, formatUnit, formatVolume } from '../lib/format.js';
import { MAX_CASES_PER_LINE, stockStatus } from '../lib/pricing.js';
import { useCart } from '../state/cart.jsx';
import CallButton from './CallButton.jsx';
import ProductVisual from './ProductVisual.jsx';
import styles from './ProductCard.module.css';
import QuantityInput from './QuantityInput.jsx';

const STOCK_LABELS = { in: 'In stock', low: 'Low stock', out: 'Out of stock', soon: 'Coming soon' };

export default function ProductCard({ product }) {
  const { add, quantityOf } = useCart();
  const [quantity, setQuantity] = useState(1);
  const inCart = quantityOf(product.id);
  const available = Math.max(Math.min(product.stock, MAX_CASES_PER_LINE) - inCart, 0);
  const status = product.comingSoon ? 'soon' : stockStatus(product.stock);

  function handleSubmit(event) {
    event.preventDefault();
    add(product.id, Math.min(quantity, available));
    setQuantity(1);
  }

  return (
    <article className={styles.card} data-reveal>
      <div className={styles.media}>
        <ProductVisual product={product} />
        <p className={`shout ${styles.size}`} aria-hidden="true">
          {formatVolume(product.volumeMl)}
        </p>
        <span className={`chip ${styles.stock}`} data-status={status}>
          {STOCK_LABELS[status]}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.meta}>{formatCase(product)}</p>
        <p className={styles.price}>
          {formatMoney(product.casePrice)} <span>/ {formatUnit(product)}</span>
          {product.unitsPerCase > 1 && (
            <small>
              {formatMoney(Math.round(product.casePrice / product.unitsPerCase))} per{' '}
              {product.category === 'soda' ? 'can' : 'bottle'}
            </small>
          )}
        </p>
      </div>

      {product.comingSoon ? (
        <div className={styles.buy}>
          {product.category === 'soda' ? (
            <Link to="/soda" className="button button--secondary button--block">
              Get notified
            </Link>
          ) : (
            <CallButton className="button button--secondary button--block">Call to pre-order</CallButton>
          )}
        </div>
      ) : (
        <form className={styles.buy} onSubmit={handleSubmit}>
          <QuantityInput
            compact
            value={Math.min(quantity, Math.max(available, 1))}
            max={Math.max(available, 1)}
            disabled={available === 0}
            label={`Cases of ${product.name}`}
            onChange={setQuantity}
          />
          <button type="submit" className="button" disabled={available === 0}>
            {available === 0 && inCart === 0 ? 'Sold out' : 'Add to cart'}
          </button>
        </form>
      )}

      {inCart > 0 && (
        <p className={styles.inCart}>
          <span aria-hidden="true">✓</span> {inCart} {inCart === 1 ? 'case' : 'cases'} in your cart ·{' '}
          <Link to="/cart">View cart</Link>
        </p>
      )}
    </article>
  );
}
