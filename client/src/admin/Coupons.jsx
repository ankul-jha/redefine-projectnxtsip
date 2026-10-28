import { useState } from 'react';
import { formatMoney, formatPercent } from '../lib/format.js';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import { useAdminData, useSession } from './session.jsx';

const EMPTY = { code: '', kind: 'percent', amount: '', minSubtotal: '', maxUses: '', expiresOn: '' };
const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

const toCoupon = (form) => ({
  code: form.code,
  kind: form.kind,
  // Percentages are stored in basis points and amounts in paise: both are the entered number × 100.
  value: Math.round(Number(form.amount) * 100),
  minSubtotal: Math.round(Number(form.minSubtotal || 0) * 100),
  maxUses: form.maxUses ? Number(form.maxUses) : null,
  expiresOn: form.expiresOn || null,
  isActive: true,
});

// Stored coupons back into the shape the API takes, with one field changed.
const withChange = (coupon, change) => ({
  code: coupon.code,
  kind: coupon.kind,
  value: coupon.value,
  minSubtotal: coupon.minSubtotal,
  maxUses: coupon.maxUses,
  expiresOn: coupon.expiresAt ? istDate.format(new Date(coupon.expiresAt)) : null,
  isActive: coupon.isActive,
  ...change,
});

function couponState(coupon) {
  if (!coupon.isActive) return 'hidden';
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 'cancelled';
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return 'cancelled';
  return 'live';
}

const STATE_LABELS = { live: 'Active', hidden: 'Paused', cancelled: 'Ended' };

export default function Coupons() {
  const { data: coupons, error, reload } = useAdminData(adminApi.coupons);
  const { expire } = useSession();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState({ errors: {}, message: null, saving: false });

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function run(action) {
    try {
      await action();
      reload();
    } catch (failure) {
      if (failure.status === 401) expire();
      else window.alert(failure.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ errors: {}, message: null, saving: true });
    try {
      await adminApi.createCoupon(toCoupon(form));
      setForm(EMPTY);
      setStatus({ errors: {}, message: null, saving: false });
      reload();
    } catch (failure) {
      if (failure.status === 401) return expire();
      setStatus({ errors: failure.details?.fields ?? {}, message: failure.message, saving: false });
    }
  }

  const fieldError = (name) => status.errors[name] && <p className="field-error">{status.errors[name]}</p>;

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Coupons</h1>
      </header>
      {(error || status.message) && <p className="alert alert--error">{error || status.message}</p>}

      <div className={styles.settings}>
        <form className={`${styles.panel} ${styles.form}`} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.wide}>New coupon</h2>
          <div className="field">
            <label htmlFor="coupon-code">Code</label>
            <input id="coupon-code" name="code" value={form.code} onChange={update} placeholder="WELCOME10" />
            {fieldError('code')}
          </div>
          <div className="field">
            <label htmlFor="coupon-kind">Discount</label>
            <select id="coupon-kind" name="kind" value={form.kind} onChange={update}>
              <option value="percent">Percentage off</option>
              <option value="flat">Fixed amount off</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="coupon-amount">{form.kind === 'percent' ? 'Percent off' : 'Amount off (₹)'}</label>
            <input
              id="coupon-amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={update}
            />
            {fieldError('value')}
          </div>
          <div className="field">
            <label htmlFor="coupon-min">Minimum order (₹, optional)</label>
            <input
              id="coupon-min"
              name="minSubtotal"
              type="number"
              min="0"
              value={form.minSubtotal}
              onChange={update}
            />
            {fieldError('minSubtotal')}
          </div>
          <div className="field">
            <label htmlFor="coupon-uses">Total uses (optional)</label>
            <input id="coupon-uses" name="maxUses" type="number" min="1" value={form.maxUses} onChange={update} />
            {fieldError('maxUses')}
          </div>
          <div className="field">
            <label htmlFor="coupon-expiry">Last day (optional)</label>
            <input id="coupon-expiry" name="expiresOn" type="date" value={form.expiresOn} onChange={update} />
            {fieldError('expiresOn')}
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="button" disabled={status.saving}>
              {status.saving ? 'Creating…' : 'Create coupon'}
            </button>
            <span className={styles.muted}>Applied after wholesale discounts. One code per order.</span>
          </div>
        </form>

        <section className={styles.panel}>
          {!coupons ? (
            <p className={styles.muted}>Loading…</p>
          ) : coupons.length === 0 ? (
            <p className={styles.muted}>No coupons yet.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Used</th>
                  <th>Last day</th>
                  <th>State</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const state = couponState(coupon);
                  return (
                    <tr key={coupon.code}>
                      <td className={styles.mono}>{coupon.code}</td>
                      <td>
                        {coupon.kind === 'percent' ? formatPercent(coupon.value) : formatMoney(coupon.value)} off
                        {coupon.minSubtotal > 0 && (
                          <span className={styles.sub}>on orders over {formatMoney(coupon.minSubtotal)}</span>
                        )}
                      </td>
                      <td>
                        {coupon.usedCount}
                        {coupon.maxUses !== null && ` of ${coupon.maxUses}`}
                      </td>
                      <td>{coupon.expiresAt ? istDate.format(new Date(coupon.expiresAt)) : '—'}</td>
                      <td>
                        <span className={styles.badge} data-status={state}>
                          {STATE_LABELS[state]}
                        </span>
                      </td>
                      <td className={styles.rowActions}>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            run(() =>
                              adminApi.updateCoupon(coupon.code, withChange(coupon, { isActive: !coupon.isActive })),
                            )
                          }
                        >
                          {coupon.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            window.confirm(`Delete ${coupon.code}? Orders that used it keep their discount.`) &&
                            run(() => adminApi.deleteCoupon(coupon.code))
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
