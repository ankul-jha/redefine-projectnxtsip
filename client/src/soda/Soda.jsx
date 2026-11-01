import { lazy, Suspense, useState } from 'react';
import { BRAND } from '../brand.js';
import { joinWaitlist } from '../lib/api.js';
import { formatFlavour, formatVolume } from '../lib/format.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { useReducedMotion } from '../lib/useMediaQuery.js';
import Emphasis from '../components/Emphasis.jsx';
import { useCatalog, useContent } from '../state/catalog.jsx';
import styles from './Soda.module.css';

const CanCanvas = lazy(() => import('./CanCanvas.jsx'));
const FALLBACK = { id: 0, name: 'Classic', color: '#0a58f5', volumeMl: 330 };

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
      <button type="submit" className="button button--large button--arrow" disabled={state.status === 'sending'}>
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

// The soda page, laid out like a poster: the 3D can in front of a disc of its flavour's colour and the flavour's
// name, with the copy and the waitlist beside it (below it on phones). Choosing a flavour repaints all of it.
export default function Soda() {
  const { soda } = useCatalog();
  const { soda: copy } = useContent();
  usePageMeta({ title: 'Soda, coming soon', description: copy.text });
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
      <div className={styles.showcase}>
        <div className={styles.disc} aria-hidden="true" />
        <p className={`shout ${styles.word}`} aria-hidden="true">
          {name}
        </p>
        <Suspense fallback={null}>
          <CanCanvas color={color} flavour={name} reducedMotion={reducedMotion} />
        </Suspense>
        {!reducedMotion && <p className={styles.hint}>Drag the can</p>}
      </div>

      <div className={styles.copy}>
        <p className="eyebrow">
          {BRAND.name} Soda · Sparkling · {formatVolume(flavour.volumeMl)}
        </p>
        <h1 id="soda-title" className={`page-title ${styles.title}`}>
          <Emphasis text={copy.title} />
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

    </section>
  );
}
