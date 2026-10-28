import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BRAND } from '../brand.js';
import { telLink } from '../lib/format.js';
import { useCart } from '../state/cart.jsx';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Header.module.css';
import Logo from './Logo.jsx';

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/soda', label: 'Soda', soon: true },
  { to: '/shop#wholesale', label: 'Wholesale' },
  { to: '/track', label: 'Track order' },
];

// Publishes the header's height, and the announcement's, as CSS variables: pages start below the header, and the
// announcement slides away on scroll.
function useHeaderSize(ref) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const announcement = ref.current.querySelector('[data-announcement]');
      root.style.setProperty('--header-height', `${ref.current.offsetHeight}px`);
      root.style.setProperty('--announce-height', `${announcement?.offsetHeight ?? 0}px`);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
}

// A pill that slides behind the hovered link and rests on the current page's link.
function useIndicator(navRef, pathname) {
  const [target, setTarget] = useState(null);
  const place = (link) => setTarget(link ? { x: link.offsetLeft, width: link.offsetWidth } : null);
  const current = () => navRef.current?.querySelector('a[aria-current="page"]');

  useLayoutEffect(() => {
    place(current());
    // Link widths change once the web font arrives.
    document.fonts.ready.then(() => place(current()));
  }, [pathname]);

  return {
    style: target ? { '--x': `${target.x}px`, '--w': `${target.width}px` } : undefined,
    shown: Boolean(target),
    onPointerOver: (event) => {
      const link = event.target.closest('a');
      if (link) place(link);
    },
    onPointerLeave: () => place(current()),
  };
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count, added, openDrawer } = useCart();
  const { site } = useCatalog();
  const { pathname } = useLocation();
  const headerRef = useRef(null);
  const navRef = useRef(null);
  const indicator = useIndicator(navRef, pathname);
  useHeaderSize(headerRef);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={styles.root} data-scrolled={scrolled && !open}>
      {site.announcement && (
        <p className={styles.announcement} data-announcement>
          {site.announcement}
        </p>
      )}
      <div className={styles.bar}>
        <div className={styles.pill}>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
            <span className={styles.bars} aria-hidden="true" />
          </button>

          <Link to="/" className={styles.brand} aria-label={`${BRAND.name} home`} onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav
            ref={navRef}
            id="site-nav"
            className={styles.nav}
            data-open={open}
            style={indicator.style}
            onPointerOver={indicator.onPointerOver}
            onPointerLeave={indicator.onPointerLeave}
            onClick={(event) => event.target.closest('a') && setOpen(false)}
          >
            <span className={styles.indicator} data-shown={indicator.shown} aria-hidden="true" />
            {LINKS.map((link, index) => {
              const LinkTag = link.to.includes('#') ? Link : NavLink;
              return (
                <LinkTag key={link.to} to={link.to} style={{ '--i': index }}>
                  {link.label}
                  {link.soon && <span className={styles.soon}>Soon</span>}
                </LinkTag>
              );
            })}
            <div className={styles.menuFoot}>
              <Link to="/shop" className="button button--large">
                Order now
              </Link>
              {site.contactPhone && <a href={telLink(site.contactPhone)}>{site.contactPhone}</a>}
              {site.contactEmail && <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>}
            </div>
          </nav>

          <div className={styles.actions}>
            <Link to="/shop" className={`button button--small ${styles.order}`}>
              Order now
            </Link>
            <button type="button" className={styles.cart} onClick={openDrawer}>
              <svg className={styles.bag} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5.5 8.5h13l-1 11.5h-11z" />
                <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
              </svg>
              <span className="visually-hidden">
                Cart, {count} {count === 1 ? 'case' : 'cases'}
              </span>
              {count > 0 && (
                <span key={added} className={styles.count} aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
