import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatMoney, formatPercent } from '../lib/format.js';
import { adminApi, formatDate, PAYMENT_STATUSES } from './api.js';
import styles from './admin.module.css';
import StatusSelect from './StatusSelect.jsx';
import { useAdminData, useSession } from './session.jsx';

// Cash on delivery is marked paid by hand; refunds are made in the Razorpay dashboard and recorded here.
function PaymentSelect({ order, onChanged }) {
  const { expire } = useSession();
  const [saving, setSaving] = useState(false);

  async function change(event) {
    setSaving(true);
    try {
      await adminApi.setPaymentStatus(order.reference, event.target.value);
      onChanged();
    } catch (error) {
      if (error.status === 401) expire();
      else window.alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className={styles.status}
      data-status={order.paymentStatus}
      value={order.paymentStatus}
      onChange={change}
      disabled={saving}
      aria-label="Payment status"
    >
      {PAYMENT_STATUSES.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );
}

export default function OrderDetail() {
  const { reference } = useParams();
  const load = useCallback(() => adminApi.order(reference), [reference]);
  const { data: order, error, reload } = useAdminData(load);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link to="/admin/orders" className={styles.back}>
            ← Orders
          </Link>
          <h1 className={styles.mono}>{reference}</h1>
        </div>
        {order && <StatusSelect reference={order.reference} status={order.status} onChanged={reload} />}
      </header>
      {error && <p className="alert alert--error">{error}</p>}
      {order && (
        <div className={styles.columns}>
          <section className={styles.panel}>
            <h2>Items</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Cases</th>
                  <th>Case price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.sku}>
                    <td>
                      {item.name}
                      <span className={styles.sub}>{item.sku}</span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.casePrice)}</td>
                    <td>{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div>
                  <dt>Wholesale discount ({formatPercent(order.discountBps)})</dt>
                  <dd>−{formatMoney(order.discount)}</dd>
                </div>
              )}
              {order.couponDiscount > 0 && (
                <div>
                  <dt>Coupon {order.couponCode}</dt>
                  <dd>−{formatMoney(order.couponDiscount)}</dd>
                </div>
              )}
              <div>
                <dt>Delivery</dt>
                <dd>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : 'Free'}</dd>
              </div>
              <div className={styles.grandTotal}>
                <dt>Total</dt>
                <dd>{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </section>

          <div className={styles.settings}>
            <section className={styles.panel}>
              <h2>Payment</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Method</dt>
                  <dd>{order.paymentMethod === 'online' ? 'Online (Razorpay)' : 'Cash on delivery'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <PaymentSelect order={order} onChanged={reload} />
                  </dd>
                </div>
                {order.gatewayPaymentId && (
                  <div>
                    <dt>Razorpay payment</dt>
                    <dd className={styles.mono}>{order.gatewayPaymentId}</dd>
                  </div>
                )}
                {order.paidAt && (
                  <div>
                    <dt>Paid</dt>
                    <dd>{formatDate(order.paidAt)}</dd>
                  </div>
                )}
              </dl>
              {order.status === 'cancelled' && order.paymentStatus === 'paid' && (
                <p className={styles.warn}>
                  Cancelled after payment: refund it in the Razorpay dashboard, then mark it refunded.
                </p>
              )}
            </section>

            <section className={styles.panel}>
              <h2>Customer</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Name</dt>
                  <dd>{order.customer}</dd>
                </div>
                {order.company && (
                  <div>
                    <dt>Company</dt>
                    <dd>{order.company}</dd>
                  </div>
                )}
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${order.phone}`}>{order.phone}</a>
                  </dd>
                </div>
                {order.gstin && (
                  <div>
                    <dt>GSTIN</dt>
                    <dd className={styles.mono}>{order.gstin}</dd>
                  </div>
                )}
                <div>
                  <dt>Deliver to</dt>
                  <dd>
                    {order.address}, {order.city} {order.pin}
                  </dd>
                </div>
                <div>
                  <dt>Placed</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
