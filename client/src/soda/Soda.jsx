import { lazy, Suspense, useState } from 'react';
import { BRAND } from '../brand.js';
import { joinWaitlist } from '../lib/api.js';
import { formatFlavour, formatVolume } from '../lib/format.js';
import { useReducedMotion } from '../lib/useReducedMotion.js';
import { useCatalog, useContent } from '../state/catalog.jsx';
import styles from './Soda.module.css';

const CanCanvas = lazy(() => import('./CanCanvas.jsx'));
const FALLBACK = { id: 0, name: 'Classic', color: '#3b94ea', volumeMl: 330 };

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ status: 'sending', message: '' });
    try {
      await joinWaitlist(email);
      setState({ status: 'done', message: "You're on the list. We'll email you the day it lands." });
      setEmail('');
    } catch (error) {
      setState({ status: 'error', message: error.details?.fields?.email ?? error.message });
    }
  }

  if (state.status === 'done') return <p className={styles.success}>{state.message}</p>;

  return (
    <form className={styles.waitlist} onSubmit={handleSubmit} noValidate>
      <label htmlFor="waitlist-email" className="visually-hidden">
        Email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={state.status === 'error'}
        aria-describedby={state.status === 'error' ? 'waitlist-error' : undefined}
        required
      />
      <button type="submit" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Joining…' : 'Notify me'}
      </button>
      {state.status === 'error' && (
        <p id="waitlist-error" className={styles.error}>
          {state.message}
        </p>
      )}
    </form>
  );
}

// Line-art bubbles rising past the can (wide screens). Positions are shares of the stage.
const BUBBLES = [
  { x: 44, y: 70, size: 22 },
  { x: 47, y: 58, size: 12 },
  { x: 86, y: 30, size: 30 },
  { x: 90, y: 44, size: 14 },
  { x: 83, y: 72, size: 18 },
];

// The soda page, laid out like a poster: the 3D can in front of a blob of its flavour's colour and the flavour's
// name, with the copy and the waitlist beside it. Choosing a flavour repaints all of it.
export default function Soda() {
  const { soda } = useCatalog();
  const { soda: copy } = useContent();
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState(null);
  const flavour = soda.find((product) => product.id === selectedId) ?? soda[0] ?? FALLBACK;
  const color = flavour.color || FALLBACK.color;
  const name = formatFlavour(flavour);

  return (
    <section
      className={styles.stage}
      style={{ '--flavour': color, '--letters': Math.max(name.length, 4) }}
      aria-labelledby="soda-title"
    >
      <div className={styles.blob} aria-hidden="true" />
      <p className={`shout ${styles.word}`} aria-hidden="true">
        {name}
      </p>
      <div className={styles.bubbles} aria-hidden="true">
        {BUBBLES.map((bubble) => (
          <span
            key={`${bubble.x}-${bubble.y}`}
            style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: bubble.size }}
          />
        ))}
      </div>

      <Suspense fallback={null}>
        <CanCanvas color={color} flavour={name} reducedMotion={reducedMotion} />
      </Suspense>

      <div className={styles.copy}>
        <p className="eyebrow">
          {BRAND.name} Soda · Sparkling · {formatVolume(flavour.volumeMl)}
        </p>
        <h1 id="soda-title" className={`shout ${styles.title}`}>
          {copy.title}
        </h1>
        <p className={styles.text}>{copy.text}</p>
        {soda.length > 1 && (
          <div className={styles.flavours} role="radiogroup" aria-label="Flavour">
            {soda.map((product) => (
              <button
                key={product.id}
                type="button"
                role="radio"
                aria-checked={product.id === flavour.id}
                style={{ '--swatch': product.color || FALLBACK.color }}
                onClick={() => setSelectedId(product.id)}
              >
                {formatFlavour(product)}
              </button>
            ))}
          </div>
        )}
        <WaitlistForm />
      </div>

      <div className={styles.specs}>
        <p className={`shout ${styles.specsSize}`}>{formatVolume(flavour.volumeMl)}</p>
        <dl>
          <div>
            <dt>Flavour</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Water</dt>
            <dd>Purified, sparkling</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Coming soon</dd>
          </div>
        </dl>
      </div>

      {!reducedMotion && <p className={styles.hint}>Drag the can</p>}
    </section>
  );
}
