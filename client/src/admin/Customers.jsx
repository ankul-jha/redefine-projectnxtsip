import { formatMoney } from '../lib/format.js';
import { adminApi, formatDate } from './api.js';
import styles from './admin.module.css';
import { useAdminData } from './session.jsx';

export default function Customers() {
  const { data: customers, error, loading } = useAdminData(adminApi.customers);

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Customers</h1>
      </header>
      {error && <p className="alert alert--error">{error}</p>}
      <section className={styles.panel}>
        {loading && !customers ? (
          <p className={styles.muted}>Loading…</p>
        ) : customers?.length === 0 ? (
          <p className={styles.muted}>No customers yet. They appear here after their first order.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>GSTIN</th>
                <th>Orders</th>
                <th>Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    {customer.name}
                    <span className={styles.sub}>
                      {customer.company || 'Retail'} · since {formatDate(customer.createdAt)}
                    </span>
                  </td>
                  <td>
                    <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    <span className={styles.sub}>{customer.phone}</span>
                  </td>
                  <td className={styles.mono}>{customer.gstin || '—'}</td>
                  <td>{customer.orders}</td>
                  <td>{formatMoney(customer.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
