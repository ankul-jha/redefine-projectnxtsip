import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { formatCase, formatMoney, formatUnit, formatVolume } from '../lib/format.js';
import { MAX_CASES_PER_LINE } from '../lib/pricing.js';
import { useCart } from '../state/cart.jsx';
import { useCatalog } from '../state/catalog.jsx';
import styles from './CartDrawer.module.css';
import DeliveryProgress from './DeliveryProgress.jsx';
import OrderSummary from './OrderSummary.jsx';
import ProductVisual from './ProductVisual.jsx';
import QuantityInput from './QuantityInput.jsx';

const SUGGESTIONS = 2;

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, totals, count, add, setQuantity, remove } = useCart();
  const { water } = useCatalog();
  const closeRef = useRef(null);
  const suggestions = water
    .filter((product) => product.stock > 0 && !lines.some((line) => line.productId === product.id))
    .slice(0, SUGGESTIONS);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    closeRef.current?.focus();
    const closeOnEscape = (event) => event.key === 'Escape' && closeDrawer();
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className={styles.root} data-open={drawerOpen} aria-hidden={!drawerOpen}>
      <button type="button" className={styles.scrim} tabIndex={-1} aria-label="Close cart" onClick={closeDrawer} />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        inert={!drawerOpen}
      >
        <div className={styles.head}>
          <h2 id="cart-drawer-title" className={styles.title}>
            Your cart <span className={styles.count}>{count}</span>
          </h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={closeDrawer} aria-label="Close cart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyWord}>
              <em>Thirsty?</em>
            </p>
            <p className="muted">Your cart is empty. Pick a size and we'll deliver it by the case.</p>
            <Link to="/shop" className="button button--arrow" onClick={closeDrawer}>
              Shop water
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.scroll}>
              <DeliveryProgress totals={totals} />
              <ul className={styles.lines}>
                {lines.map(({ product, quantity }, index) => (
                  <li key={product.id} className={styles.line} style={{ '--i': index }}>
                    <div className={styles.thumb}>
                      <ProductVisual product={product} />
                    </div>
                    <div className={styles.info}>
                      <p className={styles.name}>{product.name}</p>
                      <p className={styles.meta}>
                        {formatCase(product)} · {formatMoney(product.casePrice)} / {formatUnit(product)}
                      </p>
                      <div className={styles.controls}>
                        <QuantityInput
                          compact
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

              {suggestions.length > 0 && (
                <section className={styles.suggest} aria-labelledby="cart-suggest-title">
                  <h3 id="cart-suggest-title">Add to your order</h3>
                  <ul>
                    {suggestions.map((product) => (
                      <li key={product.id}>
                        <div className={styles.suggestThumb}>
                          <ProductVisual product={product} />
                        </div>
                        <p>
                          <strong>{formatVolume(product.volumeMl)}</strong> {formatMoney(product.casePrice)} /{' '}
                          {formatUnit(product)}
                        </p>
                        <button
                          type="button"
                          className={styles.add}
                          onClick={() => add(product.id, 1)}
                          aria-label={`Add a case of ${product.name}`}
                        >
                          +
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className={styles.foot}>
              <OrderSummary totals={totals} />
              <Link to="/checkout" className="button button--block button--large" onClick={closeDrawer}>
                Checkout · {formatMoney(totals.total)}
              </Link>
              <p className={styles.footNote}>
                Have a coupon? Add it at checkout. ·{' '}
                <Link to="/cart" onClick={closeDrawer}>
                  View cart
                </Link>
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
