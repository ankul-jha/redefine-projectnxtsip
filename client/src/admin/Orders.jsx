import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatMoney } from '../lib/format.js';
import { adminApi, formatDate, ORDER_STATUSES, statusLabel } from './api.js';
import styles from './admin.module.css';
import StatusBadge from './StatusBadge.jsx';
import StatusSelect from './StatusSelect.jsx';
import { useAdminData } from './session.jsx';

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  const load = useCallback(() => adminApi.orders({ status, q }), [status, q]);
  const { data: orders, error, loading, reload } = useAdminData(load);

  const filter = (next) => setParams((current) => {
    const updated = new URLSearchParams(current);
    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value);
      else updated.delete(key);
    }
    return updated;
  });

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Orders</h1>
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            filter({ q: search.trim() });
          }}
        >
          <input
            type="search"
            placeholder="Order ID, name, email or company"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search orders"
          />
          <button type="submit" className="button">
            Search
          </button>
        </form>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Filter by status">
        {['', 'awaiting_payment', ...ORDER_STATUSES].map((value) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => filter({ status: value })}
          >
            {value ? statusLabel(value) : 'All'}
          </button>
        ))}
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      <section className={styles.panel}>
        {loading && !orders ? (
          <p className={styles.muted}>Loading…</p>
        ) : orders?.length === 0 ? (
          <p className={styles.muted}>No orders match.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Cases</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.reference}>
                  <td>
                    <Link to={`/admin/orders/${order.reference}`} className={styles.mono}>
                      {order.reference}
                    </Link>
                    <span className={styles.sub}>{formatDate(order.createdAt)}</span>
                  </td>
                  <td>
                    {order.customer}
                    <span className={styles.sub}>{order.company || order.email}</span>
                  </td>
                  <td>{order.cases}</td>
                  <td>{formatMoney(order.total)}</td>
                  <td>
                    <StatusBadge status={order.paymentStatus} />
                    <span className={styles.sub}>{order.paymentMethod === 'online' ? 'Online' : 'On delivery'}</span>
                  </td>
                  <td>
                    <StatusSelect reference={order.reference} status={order.status} onChanged={reload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
