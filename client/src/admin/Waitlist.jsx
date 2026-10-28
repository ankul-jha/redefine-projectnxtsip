import { useState } from 'react';
import { adminApi, formatDate } from './api.js';
import styles from './admin.module.css';
import { useAdminData } from './session.jsx';

export default function Waitlist() {
  const { data: entries, error, loading } = useAdminData(adminApi.waitlist);
  const [copied, setCopied] = useState(false);

  async function copyEmails() {
    await navigator.clipboard.writeText(entries.map((entry) => entry.email).join(', '));
    setCopied(true);
  }

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Soda waitlist</h1>
        {entries?.length > 0 && (
          <button type="button" className="button button--secondary" onClick={copyEmails}>
            {copied ? 'Copied' : `Copy ${entries.length} emails`}
          </button>
        )}
      </header>
      {error && <p className="alert alert--error">{error}</p>}
      <section className={styles.panel}>
        {loading && !entries ? (
          <p className={styles.muted}>Loading…</p>
        ) : entries?.length === 0 ? (
          <p className={styles.muted}>Nobody has joined yet. Sign-ups from the soda page appear here.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {entries?.map((entry) => (
                <tr key={entry.email}>
                  <td>
                    <a href={`mailto:${entry.email}`}>{entry.email}</a>
                  </td>
                  <td>{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
