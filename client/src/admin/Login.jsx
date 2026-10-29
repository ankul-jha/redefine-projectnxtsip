import { useState } from 'react';
import { BRAND } from '../brand.js';
import { PREVIEW } from '../lib/api.js';
import { PREVIEW_ADMIN } from '../preview/account.js';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import Water from './Water.jsx';

export default function Login({ onSignedIn }) {
  const [values, setValues] = useState(
    PREVIEW ? { email: PREVIEW_ADMIN.email, password: PREVIEW_ADMIN.password } : { email: '', password: '' },
  );
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onSignedIn(await adminApi.login(values));
    } catch (failure) {
      setError(failure.message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.login}>
      <Water level={0.42} />
      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <img src={BRAND.logo.full} alt={BRAND.name} width="960" height="611" className={styles.loginLogo} />
        <h1 className={styles.loginTitle}>Welcome back.</h1>
        <p className={styles.loginNote}>
          {PREVIEW
            ? 'This is the preview: the demo sign-in is filled in, and your changes are saved in this browser only.'
            : 'Sign in to manage the store.'}
        </p>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" value={values.email} onChange={update} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={update}
            required
          />
        </div>
        <button type="submit" className="button button--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
