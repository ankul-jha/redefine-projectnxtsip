import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import CouponField from '../components/CouponField.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import ProductVisual from '../components/ProductVisual.jsx';
import { confirmPayment, createOrder } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { payWithRazorpay } from '../lib/razorpay.js';
import { useCartTotals } from '../lib/useQuote.js';
import { validateCheckout, validateField } from '../lib/validation.js';
import { useCart } from '../state/cart.jsx';
import { useCatalog } from '../state/catalog.jsx';
import styles from './Checkout.module.css';

const SECTIONS = [
  {
    title: 'Contact',
    fields: [
      { name: 'name', label: 'Full name', autoComplete: 'name' },
      { name: 'company', label: 'Company', optional: true, autoComplete: 'organization' },
      { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
      {
        name: 'gstin',
        label: 'GSTIN, for a GST invoice',
        optional: true,
        autoComplete: 'off',
        maxLength: 15,
        wide: true,
      },
    ],
  },
  {
    title: 'Delivery',
    fields: [
      { name: 'address', label: 'Delivery address', multiline: true, autoComplete: 'street-address', wide: true },
      { name: 'city', label: 'City', autoComplete: 'address-level2' },
      { name: 'pin', label: 'PIN code', inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' },
    ],
  },
];
const FIELDS = SECTIONS.flatMap((section) => section.fields);
const EMPTY_FORM = Object.fromEntries(FIELDS.map((field) => [field.name, '']));

// The ways to pay. The online ones are all Razorpay (`method` is what the API records); each opens Razorpay's
// window on its own tab. Card details are entered in that window, never on this site.
const PAYMENT_OPTIONS = [
  {
    id: 'card',
    method: 'online',
    title: 'Credit or debit card',
    text: 'Visa, Mastercard, RuPay, Amex and more.',
    marks: ['Visa', 'Mastercard', 'RuPay'],
  },
  { id: 'upi', method: 'online', title: 'UPI', text: 'Google Pay, PhonePe, Paytm or any UPI app.' },
  { id: 'netbanking', method: 'online', title: 'Netbanking or wallet', text: 'All major Indian banks and wallets.' },
  { id: 'cod', method: 'cod', title: 'Cash on delivery', text: 'Pay in cash or by UPI when your order arrives.' },
];

function Field({ field, value, error, onChange, onBlur }) {
  const { name, label, optional, multiline, wide, ...inputProps } = field;
  const id = `checkout-${name}`;
  const errorId = `${id}-error`;
  const Control = multiline ? 'textarea' : 'input';

  return (
    <div className={wide ? `field ${styles.wide}` : 'field'}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="muted"> (optional)</span>}
      </label>
      <Control
        id={id}
        name={name}
        value={value}
        required={!optional}
        rows={multiline ? 3 : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        onBlur={onBlur}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function submitErrorMessage(error) {
  if (error.status === 409) return 'Some items are no longer available in the quantity you selected.';
  if ([422, 429, 502].includes(error.status)) return error.details?.fields?.items ?? error.message;
  return 'We could not place your order. Please try again.';
}

export default function Checkout() {
  const navigate = useNavigate();
  const { status, reload, site } = useCatalog();
  const { lines, clear } = useCart();
  const { quote, totals } = useCartTotals();
  const options = PAYMENT_OPTIONS.filter((option) => site.payments[option.method]);
  const [values, setValues] = useState(EMPTY_FORM);
  const [paymentChoice, setPaymentChoice] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [step, setStep] = useState('form');
  const payment = options.find((option) => option.id === paymentChoice) ?? options[0];
  const method = payment?.method;

  if (status === 'loading') {
    return (
      <div className="container page">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (lines.length === 0 && step === 'form') return <Navigate to="/cart" replace />;

  function setFieldError(name, message) {
    setErrors((current) => {
      const next = { ...current };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setFieldError(name, validateField(name, value));
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    if (value.trim()) setFieldError(name, validateField(name, value));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const nextErrors = validateCheckout(values);
    setErrors(nextErrors);
    setSubmitError(null);

    const firstInvalid = FIELDS.find((field) => nextErrors[field.name]);
    if (firstInvalid) {
      form.elements[firstInvalid.name].focus();
      return;
    }

    setStep('placing');
    let order;
    try {
      order = await createOrder({
        ...values,
        paymentMethod: method,
        couponCode: quote?.couponCode ?? '',
        items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
      });
    } catch (error) {
      setStep('form');
      setErrors(error.details?.fields ?? {});
      setSubmitError({ message: submitErrorMessage(error), reviewCart: error.status === 409 });
      if (error.status === 409) reload();
      return;
    }

    clear();
    reload();
    // Online orders open the payment window. If it is closed or fails, the order page offers to pay again.
    if (order.payment) {
      setStep('paying');
      try {
        const customer = { name: values.name, email: values.email, contact: values.phone };
        const result = await payWithRazorpay(order.payment, {
          reference: order.reference,
          customer,
          preferred: payment.id,
        });
        if (result) await confirmPayment(order.reference, result);
      } catch {
        // The order page shows the payment's state, including one the webhook confirms later.
      }
    }
    navigate(`/order/${order.reference}`, { replace: true });
  }

  const busy = step !== 'form';
  const total = formatMoney(totals.total);
  const submitLabel = {
    form: method === 'online' ? `Pay ${total} securely` : `Place order · ${total}`,
    placing: 'Placing your order…',
    paying: 'Waiting for payment…',
  }[step];

  return (
    <div className="container page">
      <ol className={styles.steps} aria-label="Checkout steps">
        <li>
          <Link to="/cart">Cart</Link>
        </li>
        <li aria-current="step">Details & payment</li>
        <li>Confirmation</li>
      </ol>
      <h1 className={`shout ${styles.title}`}>Checkout</h1>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="alert alert--error" role="alert">
              {submitError.message} {submitError.reviewCart && <Link to="/cart">Review your cart</Link>}
            </div>
          )}

          {SECTIONS.map((section, index) => (
            <fieldset key={section.title} className={styles.card} disabled={busy}>
              <legend className={styles.cardTitle}>
                <span>{index + 1}</span> {section.title}
              </legend>
              <div className={styles.fields}>
                {section.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    error={errors[field.name]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                ))}
              </div>
              {section.title === 'Delivery' && site.delivery.note && (
                <p className={styles.note}>{site.delivery.note}</p>
              )}
            </fieldset>
          ))}

          <fieldset className={styles.card} disabled={busy}>
            <legend className={styles.cardTitle}>
              <span>{SECTIONS.length + 1}</span> Payment
            </legend>
            <div className={styles.methods} role="radiogroup" aria-label="How would you like to pay?">
              {options.map((option) => (
                <label key={option.id} className={styles.method}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    checked={payment.id === option.id}
                    onChange={() => setPaymentChoice(option.id)}
                  />
                  <span>
                    <strong>{option.title}</strong>
                    {option.text}
                  </span>
                  {option.marks && (
                    <span className={styles.marks} aria-hidden="true">
                      {option.marks.map((mark) => (
                        <b key={mark}>{mark}</b>
                      ))}
                    </span>
                  )}
                </label>
              ))}
            </div>
            {method === 'online' && (
              <p className={styles.note}>
                You'll pay in Razorpay's secure window. We never see or store your card details.
              </p>
            )}
            {import.meta.env.DEV && !site.payments.online && (
              <p className={styles.devNote}>
                Card, UPI and netbanking appear here once Razorpay keys are set in server/.env (see the README). This
                note only shows in development.
              </p>
            )}
            {errors.paymentMethod && <p className="field-error">{errors.paymentMethod}</p>}
          </fieldset>

          <button type="submit" className="button button--block button--large" disabled={busy || !method}>
            {submitLabel}
          </button>
          <p className={styles.note}>By placing the order you agree to pay the total shown, including delivery.</p>
        </form>

        <aside className={styles.summary} aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className={styles.summaryTitle}>
            Your order
          </h2>
          <ul className={styles.items}>
            {lines.map(({ product, quantity }) => (
              <li key={product.id}>
                <div className={styles.itemThumb}>
                  <ProductVisual product={product} />
                  <span>{quantity}</span>
                </div>
                <p>{product.name}</p>
                <p className={styles.itemTotal}>{formatMoney(product.casePrice * quantity)}</p>
              </li>
            ))}
          </ul>
          <CouponField quote={quote} />
          <OrderSummary totals={totals} />
        </aside>
      </div>
    </div>
  );
}
