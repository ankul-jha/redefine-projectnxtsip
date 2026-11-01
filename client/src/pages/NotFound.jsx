import { Link } from 'react-router';
import { usePageMeta } from '../lib/usePageMeta.js';
import styles from './NotFound.module.css';

export default function NotFound() {
  usePageMeta({ title: 'Page not found', listed: false });
  return (
    <div className={`container page ${styles.page}`}>
      <p className={`shout ${styles.code}`} aria-hidden="true">
        404
      </p>
      <h1 className="page-title">
        This page has <em>drifted</em> off.
      </h1>
      <p className="lead">The page you are looking for does not exist, or it has moved.</p>
      <div className={styles.actions}>
        <Link to="/" className="button button--large button--arrow">
          Back to home
        </Link>
        <Link to="/shop" className="button button--large button--secondary">
          Shop water
        </Link>
      </div>
    </div>
  );
}
