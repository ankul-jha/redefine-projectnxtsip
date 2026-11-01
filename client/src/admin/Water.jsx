import styles from './Water.module.css';

// A regular swell, one crest and one trough every 300 units, drawn across 2400: twice the visible width, so sliding
// it by half loops seamlessly.
const WAVE = `M0 40 Q75 16 150 40 ${Array.from({ length: 15 }, (_, i) => `T${300 + i * 150} 40`).join(' ')} V80 H0 Z`;

// Back to front: slower, paler waves behind; the front wave matches the water below it.
const LAYERS = [
  { tone: 0.3, duration: 32, offset: -12, lift: 16 },
  { tone: 0.55, duration: 22, offset: -5, lift: 8 },
  { tone: 1, duration: 15, offset: 0, lift: 0 },
];

// Water filling the bottom of its box to `level` (0–1), with layered waves drifting slowly sideways. Decorative;
// still under prefers-reduced-motion.
export default function Water({ level = 0.4, className = '' }) {
  return (
    <div className={`${styles.root} ${className}`} style={{ '--level': level }} aria-hidden="true">
      <div className={styles.body} />
      {LAYERS.map((layer) => (
        <svg
          key={layer.duration}
          className={styles.wave}
          viewBox="0 0 2400 80"
          preserveAspectRatio="none"
          style={{
            '--tone': layer.tone,
            '--duration': `${layer.duration}s`,
            '--offset': `${layer.offset}s`,
            '--lift': `${layer.lift}px`,
          }}
        >
          <path d={WAVE} />
        </svg>
      ))}
    </div>
  );
}
