import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const API = 'https://api.razorpay.com/v1';
const { keyId, keySecret, webhookSecret } = config.razorpay;

export const razorpayConfigured = Boolean(keyId && keySecret);

// Creates the Razorpay order that the checkout pays against, for `amount` paise. Returns its id.
export async function createGatewayOrder({ reference, amount }) {
  const response = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt: reference, notes: { reference } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Razorpay order failed (${response.status}): ${await response.text()}`);
  return (await response.json()).id;
}

// What the browser needs to open the Razorpay checkout. The key id is public; the secret never leaves the server.
export const checkoutOptions = ({ gatewayOrderId, total }) => ({
  provider: 'razorpay',
  keyId,
  orderId: gatewayOrderId,
  amount: total,
  currency: 'INR',
});

function signatureMatches(secret, body, signature) {
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(String(signature ?? ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// The checkout's success callback is signed with the key secret over "<order id>|<payment id>".
export const paymentSignatureValid = ({ gatewayOrderId, paymentId, signature }) =>
  razorpayConfigured && signatureMatches(keySecret, `${gatewayOrderId}|${paymentId}`, signature);

// Webhooks are signed with the webhook secret over the raw request body.
export const webhookSignatureValid = (rawBody, signature) =>
  Boolean(webhookSecret) && signatureMatches(webhookSecret, rawBody, signature);
