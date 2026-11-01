import { BRAND } from '../brand.js';

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

function loadCheckout() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loading = null;
      reject(new Error('The payment window could not be loaded'));
    };
    document.head.append(script);
  });
  return loading;
}

// Razorpay's names for the tab its window opens on.
const METHODS = { card: 'card', upi: 'upi', netbanking: 'netbanking' };

// Opens the Razorpay checkout for an order's payment details (from the API), on the `preferred` method's tab if
// given. Resolves with the signed result to send back for verification, or with null if the customer closes the
// window without paying.
export async function payWithRazorpay(payment, { reference, customer, preferred }) {
  const Razorpay = await loadCheckout();
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-royal').trim();

  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: payment.keyId,
      order_id: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      name: BRAND.name,
      description: `Order ${reference}`,
      image: BRAND.logo.drop,
      prefill: { ...customer, method: METHODS[preferred] },
      theme: { color: accent },
      // Closes well before the API gives up on the order (30 minutes by default).
      timeout: 900,
      handler: (response) =>
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    checkout.open();
  });
}
