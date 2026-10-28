import styles from './Water.module.css';

// A regular swell, one crest and one trough every 300 units, drawn across 2400: twice the visible width, so sliding
// it by half loops seamlessly.
const WAVE = `M0 40 Q75 16 150 40 ${Array.from({ length: 15 }, (_, i) => `T${300 + i * 150} 40`).join(' ')} V80 H0 Z`;

// Back to front: slower, paler waves behind; the front wave matches the water below it.
const LAYERS = [
  { tone: 0.3, duration: 19, offset: -12, lift: 18 },
  { tone: 0.55, duration: 13, offset: -5, lift: 9 },
  { tone: 1, duration: 9, offset: 0, lift: 0 },
];

// Where bubbles start (share of the width), their size in px, and how long each takes to rise.
const BUBBLES = [
  [8, 10, 7],
  [17, 6, 5.5],
  [29, 12, 8],
  [41, 7, 6],
  [56, 9, 7.5],
  [68, 5, 5],
  [79, 11, 8.5],
  [91, 7, 6.5],
];

// Water filling the bottom of its box to `level` (0–1): layered waves drifting sideways at different speeds, and
// bubbles rising through it. Decorative; still under prefers-reduced-motion.
export default function Water({ level = 0.4, bubbles = true, className = '' }) {
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
      {bubbles &&
        BUBBLES.map(([x, size, duration], index) => (
          <span
            key={x}
            className={styles.bubble}
            style={{ left: `${x}%`, width: size, '--duration': `${duration}s`, '--delay': `${-index * 1.3}s` }}
          />
        ))}
    </div>
  );
}
