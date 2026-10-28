import { BRAND } from '../brand.js';
import styles from './ProductVisual.module.css';

const JAR_ML = 10000;

function Bottle() {
  return (
    <svg viewBox="0 0 70 170">
      <rect className={styles.cap} x="27" y="2" width="16" height="11" rx="2" />
      <rect className={styles.cap} x="26" y="13" width="18" height="3" rx="1.5" />
      <path
        className={styles.body}
        d="M29 16v10c0 9-21 12-21 26v106a8 8 0 0 0 8 8h38a8 8 0 0 0 8-8V52c0-14-21-17-21-26V16z"
      />
      <path className={styles.edge} d="M17 56v108M53 56v108" />
      <rect className={styles.label} x="8" y="82" width="54" height="46" />
      <image href={BRAND.logo.wordmark} x="13" y="96" width="44" height="16" preserveAspectRatio="xMidYMid meet" />
      <path className={styles.shine} d="M13 60v18M13 134v26" />
    </svg>
  );
}

function Jar() {
  return (
    <svg viewBox="0 0 120 160">
      <rect className={styles.cap} x="48" y="2" width="24" height="12" rx="3" />
      <rect className={styles.cap} x="46" y="14" width="28" height="4" rx="2" />
      <path
        className={styles.body}
        d="M50 18v8c0 8-38 10-38 34v88a10 10 0 0 0 10 10h76a10 10 0 0 0 10-10V60c0-24-38-26-38-34v-8z"
      />
      <path className={styles.edge} d="M12 80h96M12 88h96M12 136h96M12 144h96" />
      <rect className={styles.label} x="12" y="96" width="96" height="32" />
      <image href={BRAND.logo.wordmark} x="30" y="102" width="60" height="20" preserveAspectRatio="xMidYMid meet" />
      <path className={styles.shine} d="M22 66v12M22 132v10" />
    </svg>
  );
}

function Can({ color }) {
  return (
    <svg viewBox="0 0 60 120" style={{ '--can': color }}>
      <rect className={styles.metal} x="11" y="4" width="38" height="7" rx="3" />
      <rect className={styles.can} x="8" y="9" width="44" height="102" rx="5" />
      <rect className={styles.metal} x="11" y="109" width="38" height="7" rx="3" />
      <rect className={styles.label} x="8" y="44" width="44" height="26" />
      <image href={BRAND.logo.wordmark} x="12" y="49" width="36" height="16" preserveAspectRatio="xMidYMid meet" />
      <path className={styles.shine} d="M15 16v22M15 76v28" />
    </svg>
  );
}

function artFor(product) {
  if (product.category === 'soda') return { height: 64, art: <Can color={product.color || 'var(--color-brand)'} /> };
  if (product.volumeMl >= JAR_ML) return { height: 66, art: <Jar /> };
  return { height: 40 + Math.min(Math.log2(product.volumeMl / 250), 3) * 14, art: <Bottle /> };
}

export default function ProductVisual({ product }) {
  const { height, art } = artFor(product);

  return (
    <div className={styles.frame} data-category={product.category} style={{ '--flavour': product.color || undefined }}>
      {product.imageUrl ? (
        <img className={styles.photo} src={product.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className={styles.art} style={{ height: `${height}%` }} aria-hidden="true">
          {art}
        </div>
      )}
    </div>
  );
}
