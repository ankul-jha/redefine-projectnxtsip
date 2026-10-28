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

// Line icons on a 24-unit grid, one per section.
const NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
  { to: '/admin/orders', label: 'Orders', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  {
    to: '/admin/products',
    label: 'Products',
    icon: 'M10 2h4v3c2 1 3 3 3 5v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10c0-2 1-4 3-5zM7 12h10',
  },
  { to: '/admin/coupons', label: 'Coupons', icon: 'M3 8V5h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6zM10 5v12' },
  { to: '/admin/content', label: 'Page content', icon: 'M4 5h16M4 10h16M4 15h10M4 20h7' },
  {
    to: '/admin/customers',
    label: 'Customers',
    icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 7',
  },
  { to: '/admin/waitlist', label: 'Soda waitlist', icon: 'M3 6h18v12H3zM3 7l9 6 9-6' },
  {
    to: '/admin/settings',
    label: 'Settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  },
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
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
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
