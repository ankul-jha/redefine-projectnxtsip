import { HttpError } from './errors.js';
import { markPaid } from './orders.js';
import { webhookSignatureValid } from './razorpay.js';

const PAID_EVENTS = new Set(['order.paid', 'payment.captured']);

// Razorpay webhook (Dashboard → Webhooks, events order.paid and payment.captured). It confirms a payment even when
// the customer closes the page before the checkout reports back. Needs the raw body to check the signature.
export async function razorpayWebhook(req, res) {
  if (!webhookSignatureValid(req.body, req.get('x-razorpay-signature'))) {
    throw new HttpError(400, 'Invalid signature');
  }
  const event = JSON.parse(req.body);
  const payment = event.payload?.payment?.entity;
  if (PAID_EVENTS.has(event.event) && payment?.order_id) {
    // Orders paid on another site sharing the Razorpay account are not ours; acknowledge them all the same.
    await markPaid({ gatewayOrderId: payment.order_id, paymentId: payment.id }).catch((error) => {
      if (error.status !== 404) throw error;
    });
  }
  res.json({ ok: true });
}
