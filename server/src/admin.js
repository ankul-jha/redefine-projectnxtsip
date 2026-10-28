import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { endSession, requireAdmin, startSession, verifyPassword } from './auth.js';
import { config } from './config.js';
import { endOfDay } from './coupons.js';
import { pool, transaction } from './db.js';
import { HttpError } from './errors.js';
import { imageType, MAX_IMAGE_BYTES } from './images.js';
import { updateOrderStatus } from './orders.js';
import { loadTiers } from './pricing.js';
import { mailConfigured } from './mail.js';
import { razorpayConfigured } from './razorpay.js';
import { loadContent, loadSettings, saveContent, saveSettings } from './settings.js';
import {
  contentSchema,
  couponSchema,
  loginSchema,
  parse,
  paymentStatusSchema,
  productSchema,
  settingsSchema,
  statusSchema,
} from './validation.js';

const LOW_STOCK_CASES = 50;
const ORDER_FILTERS = new Set(['awaiting_payment', 'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled']);

const PRODUCT_COLUMNS = `
  id, sku, name, category,
  volume_ml AS volumeMl,
  units_per_case AS unitsPerCase,
  case_price AS casePrice,
  stock_cases AS stock,
  COALESCE(image_url, '') AS imageUrl,
  COALESCE(color, '') AS color,
  is_active = 1 AS isActive,
  coming_soon = 1 AS comingSoon,
  updated_at AS updatedAt`;

const ORDER_COLUMNS = `
  o.reference, o.status, o.cases, o.subtotal, o.discount_bps AS discountBps, o.discount,
  o.coupon_code AS couponCode, o.coupon_discount AS couponDiscount, o.delivery_fee AS deliveryFee, o.total,
  o.payment_method AS paymentMethod, o.payment_status AS paymentStatus,
  o.created_at AS createdAt, c.name AS customer, c.company, c.email`;

const COUPON_COLUMNS = `
  code, kind, value, min_subtotal AS minSubtotal, max_uses AS maxUses, used_count AS usedCount,
  expires_at AS expiresAt, is_active = 1 AS isActive`;

const couponValues = (coupon) => [
  coupon.kind,
  coupon.value,
  coupon.minSubtotal,
  coupon.maxUses,
  coupon.expiresOn ? endOfDay(coupon.expiresOn) : null,
  coupon.isActive,
];

const toBooleans = (row) => ({ ...row, isActive: Boolean(row.isActive), comingSoon: Boolean(row.comingSoon) });

const productValues = (product) => [
  product.sku,
  product.name,
  product.category,
  product.volumeMl,
  product.unitsPerCase,
  product.casePrice,
  product.stock,
  product.imageUrl || null,
  product.color || null,
  product.isActive,
  product.comingSoon,
];

async function findProduct(id) {
  const [[product]] = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
  if (!product) throw new HttpError(404, 'Product not found');
  return toBooleans(product);
}

function rethrowDuplicateSku(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new HttpError(409, 'Another product already uses this SKU', { fields: { sku: 'SKU already exists' } });
  }
  throw error;
}

export const adminRouter = Router();

adminRouter.post(
  '/login',
  rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts, try again later' } }),
  async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const [[admin]] = await pool.query('SELECT id, email, name, password_hash FROM admin_users WHERE email = ?', [email]);
    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      throw new HttpError(401, 'Email or password is incorrect');
    }
    startSession(res, admin);
    res.json({ email: admin.email, name: admin.name });
  },
);

adminRouter.post('/logout', (req, res) => {
  endSession(res);
  res.status(204).end();
});

adminRouter.use(requireAdmin);

adminRouter.get('/me', (req, res) => {
  res.json(req.admin);
});

adminRouter.get('/summary', async (req, res) => {
  const [[today]] = await pool.query(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
       FROM orders WHERE created_at >= CURRENT_DATE AND status NOT IN ('cancelled', 'awaiting_payment')`,
  );
  // Online payments that arrived after their order had expired and its stock was gone.
  const [refunds] = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.status = 'cancelled' AND o.payment_status = 'paid' ORDER BY o.created_at DESC`,
  );
  const [[counts]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM orders WHERE status = 'placed') AS pending,
            (SELECT COUNT(*) FROM customers) AS customers,
            (SELECT COUNT(*) FROM waitlist) AS waitlist`,
  );
  const [lowStock] = await pool.query(
    `SELECT id, name, stock_cases AS stock FROM products
      WHERE is_active = 1 AND coming_soon = 0 AND stock_cases < ? ORDER BY stock_cases`,
    [LOW_STOCK_CASES],
  );
  const [recent] = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC, o.id DESC LIMIT 8`,
  );
  res.json({
    today: { orders: Number(today.orders), revenue: Number(today.revenue) },
    pending: counts.pending,
    customers: counts.customers,
    waitlist: counts.waitlist,
    lowStock,
    recent,
    refunds,
  });
});

adminRouter.get('/products', async (req, res) => {
  const [products] = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY category, volume_ml, name`);
  res.json(products.map(toBooleans));
});

adminRouter.post('/products', async (req, res) => {
  const product = parse(productSchema, req.body);
  const [created] = await pool
    .query(
      `INSERT INTO products
         (sku, name, category, volume_ml, units_per_case, case_price, stock_cases, image_url, color, is_active, coming_soon)
       VALUES (?)`,
      [productValues(product)],
    )
    .catch(rethrowDuplicateSku);
  res.status(201).json(await findProduct(created.insertId));
});

adminRouter.put('/products/:id', async (req, res) => {
  const product = parse(productSchema, req.body);
  const [updated] = await pool
    .query(
      `UPDATE products
          SET sku = ?, name = ?, category = ?, volume_ml = ?, units_per_case = ?, case_price = ?,
              stock_cases = ?, image_url = ?, color = ?, is_active = ?, coming_soon = ?
        WHERE id = ?`,
      [...productValues(product), req.params.id],
    )
    .catch(rethrowDuplicateSku);
  if (updated.affectedRows === 0) throw new HttpError(404, 'Product not found');
  res.json(await findProduct(req.params.id));
});

adminRouter.get('/orders', async (req, res) => {
  const status = ORDER_FILTERS.has(req.query.status) ? req.query.status : null;
  const search = String(req.query.q ?? '').trim();
  const filters = [];
  const params = [];
  if (status) {
    filters.push('o.status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('(o.reference LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)');
    params.push(...Array(4).fill(`%${search}%`));
  }
  const [orders] = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN customers c ON c.id = o.customer_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY o.created_at DESC, o.id DESC LIMIT 200`,
    params,
  );
  res.json(orders);
});

adminRouter.get('/orders/:reference', async (req, res) => {
  const [[order]] = await pool.query(
    `SELECT ${ORDER_COLUMNS}, o.id, c.phone, c.gstin, o.ship_address AS address, o.ship_city AS city, o.ship_pin AS pin,
            o.gateway_order_id AS gatewayOrderId, o.gateway_payment_id AS gatewayPaymentId, o.paid_at AS paidAt
       FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.reference = ?`,
    [req.params.reference],
  );
  if (!order) throw new HttpError(404, 'Order not found');
  const [items] = await pool.query(
    `SELECT p.name, p.sku, i.quantity, i.case_price AS casePrice, i.line_total AS lineTotal
       FROM order_items i JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ? ORDER BY p.name`,
    [order.id],
  );
  const { id, ...details } = order;
  res.json({ ...details, items });
});

adminRouter.patch('/orders/:reference', async (req, res) => {
  const { status } = parse(statusSchema, req.body);
  res.json(await updateOrderStatus(req.params.reference, status));
});

// For cash on delivery, and for refunds made in the Razorpay dashboard.
adminRouter.patch('/orders/:reference/payment', async (req, res) => {
  const { paymentStatus } = parse(paymentStatusSchema, req.body);
  const [updated] = await pool.query(
    `UPDATE orders SET payment_status = ?, paid_at = IF(? = 'paid', COALESCE(paid_at, NOW()), paid_at)
      WHERE reference = ?`,
    [paymentStatus, paymentStatus, req.params.reference],
  );
  if (updated.affectedRows === 0) throw new HttpError(404, 'Order not found');
  res.json({ reference: req.params.reference, paymentStatus });
});

adminRouter.get('/customers', async (req, res) => {
  const [customers] = await pool.query(
    `SELECT c.id, c.name, c.company, c.email, c.phone, c.gstin, c.created_at AS createdAt,
            COUNT(o.id) AS orders,
            COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total END), 0) AS spent
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,
  );
  res.json(customers.map((customer) => ({ ...customer, spent: Number(customer.spent) })));
});

adminRouter.get('/waitlist', async (req, res) => {
  const [entries] = await pool.query('SELECT email, created_at AS createdAt FROM waitlist ORDER BY created_at DESC');
  res.json(entries);
});

const settingsResponse = async () => ({
  ...(await loadSettings(pool)),
  tiers: await loadTiers(pool),
  razorpay: { configured: razorpayConfigured, webhook: Boolean(config.razorpay.webhookSecret) },
  email: { configured: mailConfigured, from: config.mail.from },
});

adminRouter.get('/settings', async (req, res) => {
  res.json(await settingsResponse());
});

adminRouter.put('/settings', async (req, res) => {
  const settings = parse(settingsSchema, req.body);
  await transaction(async (db) => {
    await saveSettings(db, settings);
    await db.query('DELETE FROM price_tiers');
    if (settings.tiers.length > 0) {
      await db.query('INSERT INTO price_tiers (min_cases, discount_bps) VALUES ?', [
        settings.tiers.map((tier) => [tier.minCases, tier.discountBps]),
      ]);
    }
  });
  res.json(await settingsResponse());
});

adminRouter.get('/content', async (req, res) => {
  res.json({ content: await loadContent(pool) });
});

adminRouter.put('/content', async (req, res) => {
  const content = parse(contentSchema, req.body);
  await saveContent(pool, content);
  res.json({ content });
});

adminRouter.get('/coupons', async (req, res) => {
  const [coupons] = await pool.query(`SELECT ${COUPON_COLUMNS} FROM coupons ORDER BY created_at DESC`);
  res.json(coupons.map((coupon) => ({ ...coupon, isActive: Boolean(coupon.isActive) })));
});

adminRouter.post('/coupons', async (req, res) => {
  const coupon = parse(couponSchema, req.body);
  await pool
    .query(
      'INSERT INTO coupons (code, kind, value, min_subtotal, max_uses, expires_at, is_active) VALUES (?)',
      [[coupon.code, ...couponValues(coupon)]],
    )
    .catch((error) => {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'This code already exists', { fields: { code: 'Code already exists' } });
      }
      throw error;
    });
  res.status(201).json({ code: coupon.code });
});

adminRouter.put('/coupons/:code', async (req, res) => {
  const coupon = parse(couponSchema, { ...req.body, code: req.params.code });
  const [updated] = await pool.query(
    `UPDATE coupons SET kind = ?, value = ?, min_subtotal = ?, max_uses = ?, expires_at = ?, is_active = ?
      WHERE code = ?`,
    [...couponValues(coupon), coupon.code],
  );
  if (updated.affectedRows === 0) throw new HttpError(404, 'Coupon not found');
  res.json({ code: coupon.code });
});

adminRouter.delete('/coupons/:code', async (req, res) => {
  await pool.query('DELETE FROM coupons WHERE code = ?', [req.params.code]);
  res.status(204).end();
});

adminRouter.post('/images', express.raw({ type: 'image/*', limit: MAX_IMAGE_BYTES }), async (req, res) => {
  const type = Buffer.isBuffer(req.body) ? imageType(req.body) : null;
  if (!type) throw new HttpError(422, 'Upload a PNG, JPEG or WebP image of up to 2 MB');
  const [created] = await pool.query('INSERT INTO images (mime_type, data) VALUES (?, ?)', [type, req.body]);
  res.status(201).json({ url: `/api/images/${created.insertId}` });
});
