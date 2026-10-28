import { useState } from 'react';
import CallButton from '../components/CallButton.jsx';
import CoolerArt from '../components/CoolerArt.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { formatMoney, formatPercent, whatsappLink } from '../lib/format.js';
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

export default function Shop() {
  const { status, products, tiers, site, reload } = useCatalog();
  const [filter, setFilter] = useState('all');
  const shown = products.filter(FILTERS.find((item) => item.id === filter).test);
  const { delivery, payments } = site;
  const topTier = tiers.at(-1);

  const perks = [
    delivery.freeFrom > 0 && `Free delivery over ${formatMoney(delivery.freeFrom)}`,
    topTier && `Up to ${formatPercent(topTier.discountBps)} off wholesale`,
    paymentPerk(payments),
  ].filter(Boolean);

  return (
    <>
      <section className={styles.head}>
        <div className={`container ${styles.headInner}`}>
          <div>
            <p className="eyebrow">Shop</p>
            <h1 className={`shout ${styles.title}`}>Order by the case.</h1>
          </div>
          <div className={styles.headAside}>
            <p className={styles.intro}>
              Prices are per case (or per jar). Wholesale discounts apply on their own as your order grows.
            </p>
            <ul className={styles.perks}>
              {perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="container page">
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

        <section id="wholesale" className={styles.wholesale} aria-labelledby="wholesale-title">
          <div className={styles.wholesaleCopy}>
            <p className="eyebrow">Wholesale</p>
            <h2 id="wholesale-title" className={`shout ${styles.wholesaleTitle}`}>
              Buying in bulk?
            </h2>
            <p>
              Shops, offices, events and distributors: the more cases in one order, the lower the price. Call us for a
              quote, regular deliveries or larger orders.
            </p>
            <div className={styles.wholesaleActions}>
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
                  <strong className="shout">{formatPercent(tier.discountBps)}</strong>
                  off from {tier.minCases} cases
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.cooler} aria-labelledby="cooler-title">
          <CoolerArt className={styles.coolerArt} />
          <div className={styles.wholesaleCopy}>
            <p className={styles.soonTag}>Coming soon</p>
            <h2 id="cooler-title" className={`shout ${styles.coolerTitle}`}>
              A Nxtsip cooler for your shop.
            </h2>
            <p>
              Stock Nxtsip and get a branded glass-door cooler for your counter, the way the big drink brands do, so
              every bottle you sell is ice cold. Call us to reserve one for your shop.
            </p>
            <CallButton className="button button--large">Call to reserve</CallButton>
          </div>
        </section>

        <ul className={styles.promises}>
          <li>
            <strong>Sealed at the source</strong>
            Every cap carries a tamper-evident ring.
          </li>
          <li>
            <strong>Delivered to your door</strong>
            {delivery.note || 'We confirm a delivery slot after you order.'}
          </li>
          <li>
            <strong>{payments.online ? 'Secure payments' : 'Pay on delivery'}</strong>
            {payments.online ? 'UPI, cards and netbanking through Razorpay.' : 'Cash or UPI when your order arrives.'}
          </li>
        </ul>
      </div>
    </>
  );
}
