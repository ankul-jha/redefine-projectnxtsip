import { useState } from 'react';
import { useNavigate } from 'react-router';
import styles from './Track.module.css';

const REFERENCE = /^[2-9A-HJ-NP-Z]{10}$/;

// Finds an order by the ID in its confirmation.
export default function Track() {
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!REFERENCE.test(value)) {
      setError('Order IDs are 10 letters and numbers, like K3BP3447QW.');
      return;
    }
    navigate(`/order/${value}`);
  }

  return (
    <div className={`container page ${styles.page}`}>
      <h1 className={`shout ${styles.title}`}>Track your order.</h1>
      <p className="muted">Enter the order ID from your confirmation to see where your order is.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="track-reference">Order ID</label>
          <input
            id="track-reference"
            value={reference}
            maxLength={10}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'track-error' : undefined}
            onChange={(event) => setReference(event.target.value)}
          />
          {error && (
            <p id="track-error" className="field-error">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="button button--large">
          Track order
        </button>
      </form>
    </div>
  );
}
