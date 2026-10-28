import { useState } from 'react';
import styles from './QuantityInput.module.css';

export default function QuantityInput({ value, max, min = 1, disabled = false, compact = false, label, onChange }) {
  const [draft, setDraft] = useState(null);
  const commit = (next) => onChange(Math.min(Math.max(next, min), max));

  function handleChange(event) {
    setDraft(event.target.value);
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(parsed)) commit(parsed);
  }

  return (
    <div className={styles.root} data-compact={compact}>
      <button
        type="button"
        onClick={() => commit(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? value}
        disabled={disabled}
        aria-label={label}
        onChange={handleChange}
        onFocus={(event) => event.target.select()}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        onClick={() => commit(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
