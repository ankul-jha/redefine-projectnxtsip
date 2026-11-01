import { useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useScrollRefresh, useSmoothScroll } from '../lib/scroll.js';
import CartDrawer from './CartDrawer.jsx';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

// Every full page load gets the key "default", so key those by path to avoid restoring another page's position.
const scrollKey = (location) => (location.key === 'default' ? location.pathname : location.key);
// Pages that run under the floating header, edge to edge.
const FULL_BLEED = new Set(['/', '/soda']);

export default function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  useSmoothScroll();
  useScrollRefresh(mainRef);

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Header />
      <main ref={mainRef} id="content" data-bleed={FULL_BLEED.has(pathname)}>
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ScrollRestoration getKey={scrollKey} />
    </>
  );
}
