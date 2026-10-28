import { Link } from 'react-router';
import { formatCase, formatMoney } from '../lib/format.js';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import { useAdminData } from './session.jsx';

export default function Products() {
  const { data: products, error, loading } = useAdminData(adminApi.products);

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Products</h1>
        <Link to="/admin/products/new" className="button">
          Add product
        </Link>
      </header>
      {error && <p className="alert alert--error">{error}</p>}
      <section className={styles.panel}>
        {loading && !products ? (
          <p className={styles.muted}>Loading…</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Case price</th>
                <th>Stock</th>
                <th>Shown as</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className={styles.productName}>
                      {product.color && <i style={{ background: product.color }} />}
                      {product.name}
                    </span>
                    <span className={styles.sub}>
                      {product.sku} · {formatCase(product)}
                    </span>
                  </td>
                  <td className={styles.capitalize}>{product.category}</td>
                  <td>{formatMoney(product.casePrice)}</td>
                  <td>
                    <span className={product.stock < 50 && !product.comingSoon ? styles.warn : undefined}>
                      {product.stock} cases
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} data-status={product.isActive ? (product.comingSoon ? 'soon' : 'live') : 'hidden'}>
                      {product.isActive ? (product.comingSoon ? 'Coming soon' : 'On sale') : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/products/${product.id}`}>Edit</Link>
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
