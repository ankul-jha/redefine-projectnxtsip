import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { BRAND } from '../brand.js';
import { telLink, whatsappLink } from '../lib/format.js';
import { gsap } from '../lib/motion.js';
import { useReducedMotion } from '../lib/useMediaQuery.js';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Footer.module.css';
import Marquee from './Marquee.jsx';

// A smooth swell, one crest every 600 units, drawn across 2400: twice the visible width, so sliding it by half loops
// seamlessly.
const WAVE = `M0 40 Q150 4 300 40 ${Array.from({ length: 7 }, (_, i) => `T${600 + i * 300} 40`).join(' ')} V80 H0 Z`;

// The brand name rises out of the foot of the page as the footer scrolls into view, tied to the scroll.
function useRisingWordmark(ref) {
  const reducedMotion = useReducedMotion();
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(
        ref.current.firstChild,
        { yPercent: 100 },
        { yPercent: 0, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } },
      );
    });
    return () => context.revert();
  }, [ref, reducedMotion]);
}

export default function Footer() {
  const { site, content } = useCatalog();
  const wordmarkRef = useRef(null);
  useRisingWordmark(wordmarkRef);
  const { payments, delivery } = site;
  const ways = [
    ...(payments.online ? ['UPI', 'Cards', 'Netbanking'] : []),
    ...(payments.cod ? ['Cash on delivery'] : []),
  ];

  return (
    <footer className={styles.footer}>
      {/* Water's surface along the top edge: two swells drifting at different speeds. */}
      <div className={styles.surface} aria-hidden="true">
        {[0, 1].map((layer) => (
          <svg key={layer} viewBox="0 0 2400 80" preserveAspectRatio="none" data-layer={layer}>
            <path d={WAVE} />
          </svg>
        ))}
      </div>
      <Marquee words={content.marquee} />
      <div className={`container ${styles.grid}`}>
        <div className={styles.intro}>
          <img
            className={styles.logo}
            src={BRAND.logo.full}
            alt={BRAND.name}
            width="960"
            height="611"
            loading="lazy"
            decoding="async"
          />
          <p>Sealed at the source, delivered by the case to homes, offices and stores.</p>
          <Link to="/shop" className="button button--arrow">
            Order now
          </Link>
        </div>
        <nav className={styles.column} aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={styles.heading}>
            Shop
          </h2>
          <Link to="/shop">All water</Link>
          <Link to="/soda">Soda · coming soon</Link>
          <Link to="/shop#wholesale">Wholesale and bulk orders</Link>
        </nav>
        <nav className={styles.column} aria-labelledby="footer-orders">
          <h2 id="footer-orders" className={styles.heading}>
            Orders
          </h2>
          <Link to="/track">Track an order</Link>
          <Link to="/cart">Your cart</Link>
          {delivery.note && <p>{delivery.note}</p>}
        </nav>
        <div className={styles.column}>
          <h2 className={styles.heading}>Talk to us</h2>
          {site.contactPhone && <a href={telLink(site.contactPhone)}>{site.contactPhone}</a>}
          {site.contactEmail && <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>}
          {site.whatsapp && <a href={whatsappLink(site.whatsapp)}>WhatsApp us</a>}
        </div>
      </div>

      <div className="container">
        <p ref={wordmarkRef} className={`shout ${styles.wordmark}`} aria-hidden="true">
          <span>{BRAND.name}</span>
        </p>
        <div className={styles.legal}>
          <p>
            © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}.
          </p>
          {ways.length > 0 && (
            <ul className={styles.ways} aria-label="Ways to pay">
              {ways.map((way) => (
                <li key={way} className="chip">
                  {way}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
