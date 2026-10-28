import { Link } from 'react-router';
import CouponField from '../components/CouponField.jsx';
import DeliveryProgress from '../components/DeliveryProgress.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import ProductVisual from '../components/ProductVisual.jsx';
import QuantityInput from '../components/QuantityInput.jsx';
import { formatCase, formatMoney, formatUnit } from '../lib/format.js';
import { MAX_CASES_PER_LINE } from '../lib/pricing.js';
import { useCartTotals } from '../lib/useQuote.js';
import { useCart } from '../state/cart.jsx';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Cart.module.css';

export default function Cart() {
  const { status, products, reload } = useCatalog();
  const { lines, count, setQuantity, remove } = useCart();
  const { quote, totals } = useCartTotals();

  if (status === 'loading') {
    return (
      <div className="container page">
        <p className="muted">Loading cart…</p>
      </div>
    );
  }

  if (status === 'error' && products.length === 0) {
    return (
      <div className="container page">
        <div className="alert alert--error" role="alert">
          Your cart could not be loaded.{' '}
          <button type="button" className="link-button" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className={`container page ${styles.empty}`}>
        <h1 className="shout">Your cart is empty.</h1>
        <p className="muted">Choose a size and we'll deliver it by the case.</p>
        <Link to="/shop" className="button button--large">
          Shop water
        </Link>
      </div>
    );
  }

  const exceedsStock = lines.some((line) => line.quantity > line.product.stock);

  return (
    <div className="container page">
      <h1 className={`shout ${styles.title}`}>
        Your cart <span>{count}</span>
      </h1>
      <div className={styles.layout}>
        <ul className={styles.lines}>
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className={styles.line}>
              <div className={styles.thumb}>
                <ProductVisual product={product} />
              </div>
              <div className={styles.info}>
                <h2 className={styles.name}>{product.name}</h2>
                <p className="muted">
                  {formatCase(product)} · {formatMoney(product.casePrice)} per {formatUnit(product)}
                </p>
                {quantity > product.stock && (
                  <p className={styles.warning}>
                    Only {product.stock} {product.stock === 1 ? 'case' : 'cases'} available
                  </p>
                )}
                <div className={styles.controls}>
                  <QuantityInput
                    value={quantity}
                    max={Math.max(Math.min(product.stock, MAX_CASES_PER_LINE), 1)}
                    label={`Cases of ${product.name}`}
                    onChange={(next) => setQuantity(product.id, next)}
                  />
                  <button type="button" className="link-button" onClick={() => remove(product.id)}>
                    Remove<span className="visually-hidden"> {product.name}</span>
                  </button>
                </div>
              </div>
              <p className={styles.lineTotal}>{formatMoney(product.casePrice * quantity)}</p>
            </li>
          ))}
        </ul>

        <aside className={styles.summary} aria-labelledby="summary-title">
          <h2 id="summary-title" className={styles.summaryTitle}>
            Order summary
          </h2>
          <DeliveryProgress totals={totals} />
          <CouponField quote={quote} />
          <OrderSummary totals={totals} />
          {exceedsStock ? (
            <button type="button" className="button button--block button--large" disabled>
              Adjust quantities to continue
            </button>
          ) : (
            <Link to="/checkout" className="button button--block button--large">
              Checkout · {formatMoney(totals.total)}
            </Link>
          )}
          <p className={styles.secure}>Secure checkout · UPI, cards, netbanking or cash on delivery</p>
        </aside>
      </div>
    </div>
  );
}
