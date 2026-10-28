import { useState } from 'react';
import { adminApi, ORDER_STATUSES, statusLabel } from './api.js';
import styles from './admin.module.css';
import { useSession } from './session.jsx';

export default function StatusSelect({ reference, status, onChanged }) {
  const { expire } = useSession();
  const [saving, setSaving] = useState(false);

  async function change(event) {
    const next = event.target.value;
    if (next === 'cancelled' && !window.confirm(`Cancel order ${reference}? Its cases go back into stock.`)) {
      event.target.value = status;
      return;
    }
    setSaving(true);
    try {
      await adminApi.setOrderStatus(reference, next);
      onChanged();
    } catch (error) {
      if (error.status === 401) expire();
      else window.alert(error.message);
      event.target.value = status;
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className={styles.status}
      data-status={status}
      defaultValue={status}
      key={status}
      onChange={change}
      disabled={saving || status === 'cancelled'}
      aria-label={`Status of order ${reference}`}
    >
      {!ORDER_STATUSES.includes(status) && (
        <option value={status} disabled>
          {statusLabel(status)}
        </option>
      )}
      {ORDER_STATUSES.map((value) => (
        <option key={value} value={value}>
          {statusLabel(value)}
        </option>
      ))}
    </select>
  );
}
