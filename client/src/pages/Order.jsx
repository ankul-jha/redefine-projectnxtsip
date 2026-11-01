import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import OrderSummary from '../components/OrderSummary.jsx';
import ProductVisual from '../components/ProductVisual.jsx';
import { confirmPayment, getOrder } from '../lib/api.js';
import { formatMoney, telLink, whatsappLink } from '../lib/format.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { payWithRazorpay } from '../lib/razorpay.js';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Order.module.css';

const STAGES = [
  { status: 'placed', label: 'Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'dispatched', label: 'On its way' },
  { status: 'delivered', label: 'Delivered' },
];

const HEADLINES = {
  awaiting_payment: 'Almost there.',
  placed: 'Thank you!',
  confirmed: 'Order confirmed.',
  dispatched: 'On its way.',
  delivered: 'Delivered.',
  cancelled: 'Order cancelled.',
};

function paymentLabel({ paymentMethod, paymentStatus }) {
  if (paymentStatus === 'refunded') return 'Refunded';
  if (paymentStatus === 'paid') return paymentMethod === 'online' ? 'Paid online' : 'Paid';
  return paymentMethod === 'online' ? 'Waiting for payment' : 'Pay on delivery';
}

// An order's page, at a link only its customer has (the reference is long and random). It shows where the order
// is and lets the customer pay again if an online payment did not go through.
export default function Order() {
  const { reference } = useParams();
  usePageMeta({ title: `Order ${reference}`, listed: false });
  const { site } = useCatalog();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(
    () =>
      getOrder(reference).then(setOrder, (failure) =>
        setError(failure.status === 404 ? 'We could not find this order.' : 'This order could not be loaded.'),
      ),
    [reference],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function payNow() {
    setPaying(true);
    try {
      const result = await payWithRazorpay(order.payment, { reference });
      if (result) await confirmPayment(reference, result);
    } catch {
      // Shown by the reload below: the order stays waiting for payment.
    }
    await load();
    setPaying(false);
  }

  if (error) {
    return (
      <div className="container page">
        <h1 className="page-title">{error}</h1>
        <p className="muted">Check the order ID and try again.</p>
        <Link to="/track" className="button button--arrow">
          Track an order
        </Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="container page">
        <p className="muted">Loading your order…</p>
      </div>
    );
  }

  const reached = STAGES.findIndex((stage) => stage.status === order.status);

  return (
    <div className={`container page ${styles.page}`}>
      <section className={styles.hero}>
        <p className="eyebrow">Order {order.reference}</p>
        <h1 className="page-title">{HEADLINES[order.status]}</h1>
        {order.status === 'awaiting_payment' && (
          <>
            <p className={styles.lead}>Your order is reserved. Complete the payment to place it.</p>
            {order.payment && (
              <button type="button" className="button button--large button--arrow" onClick={payNow} disabled={paying}>
                {paying ? 'Waiting for payment…' : `Pay ${formatMoney(order.total)}`}
              </button>
            )}
          </>
        )}
        {reached >= 0 && (
          <p className={styles.lead}>
            We'll call you to confirm the delivery slot. Keep this page's link to check on your order.
          </p>
        )}
        {order.status === 'cancelled' && (
          <p className={styles.lead}>
            {order.paymentStatus === 'paid'
              ? 'Your payment arrived after the order had expired. We will refund it in full.'
              : 'Nothing was charged. You are welcome to place a new order.'}
          </p>
        )}
      </section>

      {reached >= 0 && (
        <ol className={styles.timeline} aria-label="Order progress">
          {STAGES.map((stage, index) => (
            <li key={stage.status} data-done={index <= reached} aria-current={index === reached ? 'step' : undefined}>
              <span aria-hidden="true">{index + 1}</span>
              {stage.label}
            </li>
          ))}
        </ol>
      )}

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="order-items">
          <h2 id="order-items">Items</h2>
          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={item.productId}>
                <div className={styles.thumb}>
                  <ProductVisual product={item} />
                </div>
                <p>
                  <strong>{item.name}</strong>
                  {item.quantity} × {formatMoney(item.casePrice)}
                </p>
                <p className={styles.lineTotal}>{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.card} aria-labelledby="order-total">
          <h2 id="order-total">Payment</h2>
          <p className={`chip ${styles.payment}`} data-status={order.paymentStatus}>
            {paymentLabel(order)}
          </p>
          <OrderSummary totals={order} />
          {site.contactPhone && (
            <p className={styles.help}>
              Questions? Call <a href={telLink(site.contactPhone)}>{site.contactPhone}</a>
              {site.whatsapp && (
                <>
                  {' '}
                  or <a href={whatsappLink(site.whatsapp)}>message us on WhatsApp</a>
                </>
              )}
              .
            </p>
          )}
        </aside>
      </div>

      <Link to="/shop" className="button button--secondary button--arrow">
        Continue shopping
      </Link>
    </div>
  );
}
