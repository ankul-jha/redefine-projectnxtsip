import { Link } from 'react-router';
import { formatMoney } from '../lib/format.js';
import { adminApi, formatDate } from './api.js';
import styles from './admin.module.css';
import { useAdminData } from './session.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function Dashboard() {
  const { data, error, loading } = useAdminData(adminApi.summary);

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Dashboard</h1>
      </header>
      {error && <p className="alert alert--error">{error}</p>}
      {loading && !data && <p className={styles.muted}>Loading…</p>}
      {data && (
        <>
          <section className={styles.stats}>
            <Stat label="Orders today" value={data.today.orders} />
            <Stat label="Revenue today" value={formatMoney(data.today.revenue)} />
            <Stat label="Waiting to confirm" value={data.pending} to="/admin/orders?status=placed" />
            <Stat label="Customers" value={data.customers} to="/admin/customers" />
            <Stat label="Soda waitlist" value={data.waitlist} to="/admin/waitlist" />
          </section>

          {data.refunds.length > 0 && (
            <div className="alert alert--error" role="alert">
              {data.refunds.length === 1 ? 'An order was' : `${data.refunds.length} orders were`} paid online after it
              expired and its stock was gone. Refund in the Razorpay dashboard:{' '}
              {data.refunds.map((order, index) => (
                <span key={order.reference}>
                  {index > 0 && ', '}
                  <Link to={`/admin/orders/${order.reference}`} className={styles.mono}>
                    {order.reference}
                  </Link>
                </span>
              ))}
            </div>
          )}

          <div className={styles.columns}>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Recent orders</h2>
                <Link to="/admin/orders">All orders</Link>
              </div>
              {data.recent.length === 0 ? (
                <p className={styles.muted}>No orders yet.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((order) => (
                      <tr key={order.reference}>
                        <td>
                          <Link to={`/admin/orders/${order.reference}`} className={styles.mono}>
                            {order.reference}
                          </Link>
                          <span className={styles.sub}>{formatDate(order.createdAt)}</span>
                        </td>
                        <td>
                          {order.customer}
                          {order.company && <span className={styles.sub}>{order.company}</span>}
                        </td>
                        <td>{formatMoney(order.total)}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Low stock</h2>
                <Link to="/admin/products">Products</Link>
              </div>
              {data.lowStock.length === 0 ? (
                <p className={styles.muted}>Every product has 50 or more cases.</p>
              ) : (
                <ul className={styles.list}>
                  {data.lowStock.map((product) => (
                    <li key={product.id}>
                      <Link to={`/admin/products/${product.id}`}>{product.name}</Link>
                      <strong>{product.stock} cases</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, to }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
  return to ? (
    <Link to={to} className={styles.stat}>
      {content}
    </Link>
  ) : (
    <div className={styles.stat}>{content}</div>
  );
}
