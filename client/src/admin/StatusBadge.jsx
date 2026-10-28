import { statusLabel } from './api.js';
import styles from './admin.module.css';

export default function StatusBadge({ status }) {
  return (
    <span className={styles.badge} data-status={status}>
      {statusLabel(status)}
    </span>
  );
}
