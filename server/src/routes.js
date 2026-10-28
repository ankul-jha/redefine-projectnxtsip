import { hostname } from 'node:os';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';
import { notifyWaitlistJoined } from './emails.js';
import { HttpError } from './errors.js';
import { findOrder, markPaid, paymentMethods, placeOrder, quoteOrder, startPayment } from './orders.js';
import { loadTiers } from './pricing.js';
import { paymentSignatureValid } from './razorpay.js';
import { loadContent, loadSettings } from './settings.js';
import { orderSchema, parse, paymentSchema, quoteSchema, waitlistSchema } from './validation.js';

const instance = hostname();

const strictLimit = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
  });

export const router = Router();

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', instance });
  } catch {
    res.status(503).json({ status: 'unavailable', instance });
  }
});

router.get('/products', async (req, res) => {
  const [products] = await pool.query(
    `SELECT id, sku, name, category,
            volume_ml AS volumeMl,
            units_per_case AS unitsPerCase,
            case_price AS casePrice,
            stock_cases AS stock,
            image_url AS imageUrl,
            color,
            coming_soon = 1 AS comingSoon
       FROM products
      WHERE is_active = 1
      ORDER BY category, volume_ml, name`,
  );
  res.json({
    currency: 'INR',
    tiers: await loadTiers(pool),
    products: products.map((product) => ({ ...product, comingSoon: Boolean(product.comingSoon) })),
  });
});

// Store details, delivery terms, the ways to pay and the landing copy (null until edited in the admin panel).
router.get('/site', async (req, res) => {
  const [settings, content] = await Promise.all([loadSettings(pool), loadContent(pool)]);
  const { deliveryFee, freeDeliveryFrom, deliveryNote, codEnabled, onlineEnabled, ...contact } = settings;
  res.json({
    ...contact,
    delivery: { fee: deliveryFee, freeFrom: freeDeliveryFrom, note: deliveryNote },
    payments: paymentMethods(settings),
    content,
  });
});

router.post('/quote', strictLimit(300, 'Too many requests, please slow down'), async (req, res) => {
  res.json(await quoteOrder(parse(quoteSchema, req.body)));
});

router.post('/orders', strictLimit(20, 'Too many orders from this address, please try again later'), async (req, res) => {
  const order = await placeOrder(parse(orderSchema, req.body));
  const payment = order.paymentMethod === 'online' ? await startPayment(order) : null;
  const { id, ...details } = order;
  res.status(201).json({ ...details, payment });
});

router.get('/orders/:reference', strictLimit(120, 'Too many requests, please slow down'), async (req, res) => {
  res.json(await findOrder(req.params.reference));
});

// The Razorpay checkout's success callback. The webhook (webhooks.js) confirms the same payment independently.
router.post('/orders/:reference/payment', strictLimit(30, 'Too many requests, please slow down'), async (req, res) => {
  const payment = parse(paymentSchema, req.body);
  const [[order]] = await pool.query('SELECT gateway_order_id AS gatewayOrderId FROM orders WHERE reference = ?', [
    req.params.reference,
  ]);
  const valid =
    order?.gatewayOrderId === payment.razorpayOrderId &&
    paymentSignatureValid({
      gatewayOrderId: payment.razorpayOrderId,
      paymentId: payment.razorpayPaymentId,
      signature: payment.razorpaySignature,
    });
  if (!valid) throw new HttpError(400, 'This payment could not be verified');
  await markPaid({ gatewayOrderId: payment.razorpayOrderId, paymentId: payment.razorpayPaymentId });
  res.json(await findOrder(req.params.reference));
});

router.get('/images/:id', async (req, res) => {
  const [[image]] = await pool.query('SELECT mime_type, data FROM images WHERE id = ?', [Number(req.params.id) || 0]);
  if (!image) throw new HttpError(404, 'Image not found');
  res.set('Cache-Control', 'public, max-age=31536000, immutable').type(image.mime_type).send(image.data);
});

router.post('/waitlist', strictLimit(10, 'Too many sign-ups from this address, please try again later'), async (req, res) => {
  const { email } = parse(waitlistSchema, req.body);
  const [added] = await pool.query('INSERT IGNORE INTO waitlist (email) VALUES (?)', [email]);
  // Only a new sign-up gets the thank-you, so the form can't be used to send one address repeated emails.
  if (added.affectedRows === 1) notifyWaitlistJoined(email);
  res.status(201).json({ ok: true });
});
