import { Link } from 'react-router';
import { BRAND } from '../brand.js';
import { telLink, whatsappLink } from '../lib/format.js';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Footer.module.css';
import Marquee from './Marquee.jsx';

export default function Footer() {
  const { site, content } = useCatalog();
  const { payments, delivery } = site;
  const ways = [
    ...(payments.online ? ['UPI', 'Cards', 'Netbanking'] : []),
    ...(payments.cod ? ['Cash on delivery'] : []),
  ];

  return (
    <footer className={styles.footer}>
      <Marquee words={content.marquee} />
      <div className={`container ${styles.grid}`}>
        <div className={styles.intro}>
          <img className={styles.logo} src={BRAND.logo.full} alt={BRAND.name} width="960" height="611" />
          <p>Sealed at the source, delivered by the case to homes, offices and stores.</p>
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
        {ways.length > 0 && (
          <ul className={styles.ways} aria-label="Ways to pay">
            {ways.map((way) => (
              <li key={way}>{way}</li>
            ))}
          </ul>
        )}
        <p className={`shout ${styles.wordmark}`} aria-hidden="true">
          {BRAND.name}
        </p>
        <p className={styles.legal}>
          © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}.
        </p>
      </div>
    </footer>
  );
}
