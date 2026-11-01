import { useRef, useState } from 'react';
import { BRAND } from '../brand.js';
import CallButton from '../components/CallButton.jsx';
import CoolerArt from '../components/CoolerArt.jsx';
import ProductCard from '../components/ProductCard.jsx';
import StructuredData from '../components/StructuredData.jsx';
import { formatMoney, formatPercent, whatsappLink } from '../lib/format.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { useReveal } from '../lib/useReveal.js';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Shop.module.css';

const JAR_ML = 10000;

function paymentPerk({ online, cod }) {
  if (online && cod) return 'Pay online or on delivery';
  return online ? 'Secure online payment' : 'Pay on delivery';
}
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'bottles', label: 'Bottles', test: (product) => product.category === 'water' && product.volumeMl < JAR_ML },
  { id: 'jars', label: 'Jars', test: (product) => product.category === 'water' && product.volumeMl >= JAR_ML },
  { id: 'soda', label: 'Soda', test: (product) => product.category === 'soda' },
];

// Line icons for the three promises at the foot of the shop: a seal, a delivery van, a card.
const PROMISE_ICONS = [
  'M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3zM8.5 12l2.5 2.5 4.5-5',
  'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'M3 6h18v12H3zM3 10h18M7 15h4',
];

// The products on sale, for search engines: each is sold by the case, at the case price.
function productList(products) {
  const availability = (product) => {
    if (product.comingSoon) return 'PreOrder';
    return product.stock > 0 ? 'InStock' : 'OutOfStock';
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        sku: product.sku,
        brand: { '@type': 'Brand', name: BRAND.name },
        ...(product.imageUrl && { image: new URL(product.imageUrl, window.location.href).href }),
        offers: {
          '@type': 'Offer',
          price: (product.casePrice / 100).toFixed(2),
          priceCurrency: 'INR',
          availability: `https://schema.org/${availability(product)}`,
        },
      },
    })),
  };
}

export default function Shop() {
  usePageMeta({
    title: 'Shop water by the case',
    description:
      'Order Nxtsip water by the case: bottles from 250 ml to 2 L and 20 L jars. Cash on delivery or pay online, with wholesale discounts from 20 cases.',
  });
  const { status, products, tiers, site, reload } = useCatalog();
  const [filter, setFilter] = useState('all');
  const pageRef = useRef(null);
  const shown = products.filter(FILTERS.find((item) => item.id === filter).test);
  const { delivery, payments } = site;
  const topTier = tiers.at(-1);
  useReveal(pageRef, [products.length, tiers.length, filter]);

  const perks = [
    delivery.freeFrom > 0 && `Free delivery over ${formatMoney(delivery.freeFrom)}`,
    topTier && `Up to ${formatPercent(topTier.discountBps)} off wholesale`,
    paymentPerk(payments),
  ].filter(Boolean);

  const promises = [
    { title: 'Sealed at the source', text: 'Every cap carries a tamper-evident ring.' },
    { title: 'Delivered to your door', text: delivery.note || 'We confirm a delivery slot after you order.' },
    payments.online
      ? { title: 'Secure payments', text: 'UPI, cards and netbanking through Razorpay.' }
      : { title: 'Pay on delivery', text: 'Cash or UPI when your order arrives.' },
  ];

  return (
    <div ref={pageRef}>
      {products.length > 0 && <StructuredData data={productList(products)} />}
      <section className={`container ${styles.head}`}>
        <div>
          <p className="eyebrow">Shop</p>
          <h1 className="page-title" data-split>
            Order by the <em>case</em>.
          </h1>
        </div>
        <div className={styles.headAside} data-reveal>
          <p className="lead">Prices are per case (or per jar). Wholesale discounts apply on their own as your order grows.</p>
          <ul className={styles.perks}>
            {perks.map((perk) => (
              <li key={perk} className="chip">
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container">
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="Show">
            {FILTERS.filter((item) => item.id === 'all' || products.some(item.test)).map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {tiers.length > 0 && (
            <ul className={styles.tiers} aria-label="Wholesale discounts">
              {tiers.map((tier) => (
                <li key={tier.minCases}>
                  {tier.minCases}+ cases <strong>{formatPercent(tier.discountBps)} off</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        {status === 'loading' && <p className="muted">Loading products…</p>}
        {status === 'error' && products.length === 0 && (
          <div className="alert alert--error" role="alert">
            Products could not be loaded.{' '}
            <button type="button" className="link-button" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        <div className={styles.grid}>
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <section id="wholesale" className={styles.wholesale} aria-labelledby="wholesale-title" data-reveal>
          <div className={styles.panelCopy}>
            <p className="eyebrow">Wholesale</p>
            <h2 id="wholesale-title" className="display">
              Buying in <em>bulk</em>?
            </h2>
            <p>
              Shops, offices, events and distributors: the more cases in one order, the lower the price. Call us for a
              quote, regular deliveries or larger orders.
            </p>
            <div className={styles.panelActions}>
              <CallButton className="button button--large" />
              {site.whatsapp && (
                <a className="button button--large button--secondary" href={whatsappLink(site.whatsapp)}>
                  WhatsApp us
                </a>
              )}
            </div>
          </div>
          {tiers.length > 0 && (
            <ul className={styles.wholesaleTiers}>
              {tiers.map((tier) => (
                <li key={tier.minCases}>
                  <strong>{formatPercent(tier.discountBps)}</strong>
                  <span>
                    off from <b>{tier.minCases} cases</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.cooler} aria-labelledby="cooler-title" data-reveal>
          <CoolerArt className={styles.coolerArt} />
          <div className={styles.panelCopy}>
            <p className="chip">Coming soon</p>
            <h2 id="cooler-title" className="display">
              A Nxtsip cooler for your <em>shop</em>.
            </h2>
            <p>
              Stock Nxtsip and get a branded glass-door cooler for your counter, the way the big drink brands do, so
              every bottle you sell is ice cold. Call us to reserve one for your shop.
            </p>
            <CallButton className="button button--large">Call to reserve</CallButton>
          </div>
        </section>

        <ul className={styles.promises}>
          {promises.map((promise, index) => (
            <li key={promise.title} data-reveal>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={PROMISE_ICONS[index]} />
              </svg>
              <strong>{promise.title}</strong>
              {promise.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
