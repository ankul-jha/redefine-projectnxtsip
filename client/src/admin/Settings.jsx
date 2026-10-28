import { useEffect, useState } from 'react';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import { useAdminData, useSession } from './session.jsx';

const toRupees = (paise) => String(paise / 100);
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const toForm = (settings) => ({
  ...settings,
  deliveryFee: toRupees(settings.deliveryFee),
  freeDeliveryFrom: toRupees(settings.freeDeliveryFrom),
  tiers: settings.tiers.map((tier) => ({ minCases: String(tier.minCases), percent: String(tier.discountBps / 100) })),
});

const toSettings = (form) => ({
  contactEmail: form.contactEmail,
  contactPhone: form.contactPhone,
  whatsapp: form.whatsapp,
  announcement: form.announcement,
  deliveryFee: toPaise(form.deliveryFee),
  freeDeliveryFrom: toPaise(form.freeDeliveryFrom),
  deliveryNote: form.deliveryNote,
  codEnabled: form.codEnabled,
  onlineEnabled: form.onlineEnabled,
  tiers: form.tiers
    .map((tier) => ({ minCases: Number(tier.minCases), discountBps: Math.round(Number(tier.percent) * 100) }))
    .sort((a, b) => a.minCases - b.minCases),
});

export default function Settings() {
  const { data, error, setData } = useAdminData(adminApi.settings);
  const { expire } = useSession();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ errors: {}, message: null, saved: false, saving: false });

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const update = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };
  const fieldError = (name) => status.errors[name] && <p className="field-error">{status.errors[name]}</p>;
  const updateTier = (index, key, value) =>
    setForm((current) => ({
      ...current,
      tiers: current.tiers.map((tier, position) => (position === index ? { ...tier, [key]: value } : tier)),
    }));

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ errors: {}, message: null, saved: false, saving: true });
    try {
      setData(await adminApi.saveSettings(toSettings(form)));
      setStatus({ errors: {}, message: null, saved: true, saving: false });
    } catch (failure) {
      if (failure.status === 401) return expire();
      setStatus({ errors: failure.details?.fields ?? {}, message: failure.message, saved: false, saving: false });
    }
  }

  return (
    <>
      <header className={styles.pageHead}>
        <h1>Settings</h1>
      </header>
      {(error || status.message) && <p className="alert alert--error">{error || status.message}</p>}
      {form && (
        <form className={styles.settings} onSubmit={handleSubmit} noValidate>
          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Store details</h2>
            <div className="field">
              <label htmlFor="settings-email">Orders email</label>
              <input id="settings-email" name="contactEmail" type="email" value={form.contactEmail} onChange={update} />
              {status.errors.contactEmail && <p className="field-error">{status.errors.contactEmail}</p>}
            </div>
            <div className="field">
              <label htmlFor="settings-phone">Orders phone</label>
              <input id="settings-phone" name="contactPhone" value={form.contactPhone} onChange={update} />
              {status.errors.contactPhone && <p className="field-error">{status.errors.contactPhone}</p>}
            </div>
            <div className="field">
              <label htmlFor="settings-whatsapp">WhatsApp number (optional)</label>
              <input
                id="settings-whatsapp"
                name="whatsapp"
                value={form.whatsapp}
                onChange={update}
                placeholder="+919876543210"
              />
              {fieldError('whatsapp')}
            </div>
            <div className={`field ${styles.wide}`}>
              <label htmlFor="settings-announcement">Announcement bar (leave empty to hide)</label>
              <input id="settings-announcement" name="announcement" value={form.announcement} onChange={update} />
              {status.errors.announcement && <p className="field-error">{status.errors.announcement}</p>}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Delivery</h2>
            <div className="field">
              <label htmlFor="settings-fee">Delivery fee (₹)</label>
              <input
                id="settings-fee"
                name="deliveryFee"
                type="number"
                min="0"
                step="1"
                value={form.deliveryFee}
                onChange={update}
              />
              {fieldError('deliveryFee')}
            </div>
            <div className="field">
              <label htmlFor="settings-free">Free delivery from (₹, 0 for never)</label>
              <input
                id="settings-free"
                name="freeDeliveryFrom"
                type="number"
                min="0"
                step="1"
                value={form.freeDeliveryFrom}
                onChange={update}
              />
              {fieldError('freeDeliveryFrom')}
            </div>
            <div className={`field ${styles.wide}`}>
              <label htmlFor="settings-note">Delivery note, shown at checkout</label>
              <input id="settings-note" name="deliveryNote" value={form.deliveryNote} onChange={update} />
              {fieldError('deliveryNote')}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Payments</h2>
            <label className={`${styles.check} ${styles.wide}`}>
              <input type="checkbox" name="onlineEnabled" checked={form.onlineEnabled} onChange={update} />
              Online payment with Razorpay (UPI, cards, netbanking, wallets)
            </label>
            {!form.razorpay.configured && (
              <p className={`${styles.muted} ${styles.wide}`}>
                Razorpay is not connected yet, so the store hides online payment. Add RAZORPAY_KEY_ID and
                RAZORPAY_KEY_SECRET to the server's environment (see the README).
              </p>
            )}
            {form.razorpay.configured && !form.razorpay.webhook && (
              <p className={`${styles.warn} ${styles.wide}`}>
                Add RAZORPAY_WEBHOOK_SECRET too, so payments are confirmed even if a customer closes the page early.
              </p>
            )}
            <label className={`${styles.check} ${styles.wide}`}>
              <input type="checkbox" name="codEnabled" checked={form.codEnabled} onChange={update} />
              Cash on delivery
            </label>
            {fieldError('codEnabled')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Emails</h2>
            {form.email.configured ? (
              <p className={styles.wide}>
                Customers get a thank-you with their order (once it is paid, for online orders) and a thank-you for
                joining the soda waitlist, from {form.email.from}. New orders are also sent to the orders email above.
              </p>
            ) : (
              <p className={`${styles.muted} ${styles.wide}`}>
                Emails are not set up yet, so none are sent. Add SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM and
                SITE_URL to the server's environment (see the README).
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Wholesale discounts</h2>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setForm((current) => ({ ...current, tiers: [...current.tiers, { minCases: '', percent: '' }] }))}
              >
                Add tier
              </button>
            </div>
            <p className={styles.muted}>Applied automatically to the whole order, based on its total number of cases.</p>
            {form.tiers.length === 0 && <p className={styles.muted}>No discounts.</p>}
            {form.tiers.map((tier, index) => (
              <div key={index} className={styles.tier}>
                <label>
                  From
                  <input
                    type="number"
                    min="1"
                    value={tier.minCases}
                    onChange={(event) => updateTier(index, 'minCases', event.target.value)}
                    aria-label={`Tier ${index + 1} minimum cases`}
                  />
                  cases
                </label>
                <label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={tier.percent}
                    onChange={(event) => updateTier(index, 'percent', event.target.value)}
                    aria-label={`Tier ${index + 1} discount percent`}
                  />
                  % off
                </label>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setForm((current) => ({ ...current, tiers: current.tiers.filter((_, position) => position !== index) }))}
                >
                  Remove
                </button>
              </div>
            ))}
            {status.errors.tiers && <p className="field-error">{status.errors.tiers}</p>}
          </section>

          <div className={styles.formActions}>
            <button type="submit" className="button" disabled={status.saving}>
              {status.saving ? 'Saving…' : 'Save settings'}
            </button>
            {status.saved && <span className={styles.saved}>Saved. The store shows the changes on its next load.</span>}
          </div>
        </form>
      )}
    </>
  );
}
