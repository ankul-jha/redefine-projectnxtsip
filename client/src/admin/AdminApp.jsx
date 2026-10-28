import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router';
import { BRAND } from '../brand.js';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import Content from './Content.jsx';
import Coupons from './Coupons.jsx';
import Customers from './Customers.jsx';
import Dashboard from './Dashboard.jsx';
import Login from './Login.jsx';
import OrderDetail from './OrderDetail.jsx';
import Orders from './Orders.jsx';
import ProductForm from './ProductForm.jsx';
import Products from './Products.jsx';
import { SessionProvider } from './session.jsx';
import Settings from './Settings.jsx';
import Waitlist from './Waitlist.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/content', label: 'Page content' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/waitlist', label: 'Soda waitlist' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminApp() {
  const [admin, setAdmin] = useState(undefined);

  useEffect(() => {
    adminApi.me().then(setAdmin, () => setAdmin(null));
  }, []);

  const expire = useCallback(() => setAdmin(null), []);
  const signOut = useCallback(async () => {
    await adminApi.logout().catch(() => {});
    setAdmin(null);
  }, []);
  const session = useMemo(() => ({ admin, expire, signOut }), [admin, expire, signOut]);

  if (admin === undefined) return <div className={styles.loading}>Loading…</div>;
  if (admin === null) return <Login onSignedIn={setAdmin} />;

  return (
    <SessionProvider value={session}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link to="/admin" className={styles.brand}>
            <img src={BRAND.logo.wordmark} alt={BRAND.name} width="720" height="229" />
            <span>Admin</span>
          </Link>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.account}>
            <p>{admin.name}</p>
            <p className={styles.muted}>{admin.email}</p>
            <div className={styles.accountActions}>
              <Link to="/" className={styles.ghost}>
                View store
              </Link>
              <button type="button" className={styles.ghost} onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:reference" element={<OrderDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="content" element={<Content />} />
            <Route path="customers" element={<Customers />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </SessionProvider>
  );
}
