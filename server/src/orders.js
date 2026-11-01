import { randomInt } from 'node:crypto';
import { config } from './config.js';
import { findCoupon } from './coupons.js';
import { pool, transaction } from './db.js';
import { notifyOrderPlaced } from './emails.js';
import { HttpError } from './errors.js';
import { loadTiers, priceOrder } from './pricing.js';
import { checkoutOptions, createGatewayOrder, razorpayConfigured } from './razorpay.js';
import { loadSettings } from './settings.js';

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function createReference(length = 10) {
  return Array.from(
    { length },
    () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)],
  ).join('');
}

export const paymentMethods = (settings) => ({
  cod: settings.codEnabled,
  online: settings.onlineEnabled && razorpayConfigured,
});

const deliveryRules = (settings) => ({ fee: settings.deliveryFee, freeFrom: settings.freeDeliveryFrom });


async function loadLines(db, items, { lock = false } = {}) {
  const [rows] = await db.query(
    `SELECT id, case_price, stock_cases
       FROM products
      WHERE id IN (?) AND is_active = 1 AND coming_soon = 0
      ORDER BY id
      ${lock ? 'FOR UPDATE' : ''}`,
    [items.map((item) => item.productId)],
  );
  const products = new Map(rows.map((row) => [row.id, row]));
  const available = (productId) => products.get(productId)?.stock_cases ?? 0;

  return {
    lines: items
      .filter((item) => products.has(item.productId))
      .map((item) => ({ ...item, casePrice: products.get(item.productId).case_price })),
    shortages: items
      .filter((item) => available(item.productId) < item.quantity)
      .map((item) => ({ productId: item.productId, available: available(item.productId) })),
  };
}

// Totals for the cart and checkout pages, including whether a coupon applies. Nothing is reserved.
export async function quoteOrder({ items, couponCode }) {
  const [{ lines, shortages }, tiers, settings] = await Promise.all([
    loadLines(pool, items),
    loadTiers(pool),
    loadSettings(pool),
  ]);
  const plain = priceOrder(lines, { tiers });
  let coupon = null;
  let couponError = null;
  if (couponCode) {
    try {
      coupon = await findCoupon(pool, couponCode, plain.subtotal - plain.discount);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      couponError = error.message;
    }
  }
  return { ...priceOrder(lines, { tiers, coupon, delivery: deliveryRules(settings) }), couponError, shortages };
}

// Places an order and reserves its stock. Cash orders are placed at once (and confirmed by email); online orders
// wait for their payment.
export async function placeOrder(order) {
  const settings = await loadSettings(pool);
  if (!paymentMethods(settings)[order.paymentMethod]) {
    throw new HttpError(422, 'This way to pay is not available right now', {
      fields: { paymentMethod: 'Choose another way to pay' },
    });
  }

  const placed = await transaction(async (db) => {
    const { lines, shortages } = await loadLines(db, order.items, { lock: true });
    if (shortages.length > 0) {
      throw new HttpError(409, 'Some items are no longer available in the requested quantity', {
        items: shortages,
      });
    }

    const tiers = await loadTiers(db);
    const plain = priceOrder(lines, { tiers });
    const coupon = order.couponCode
      ? await findCoupon(db, order.couponCode, plain.subtotal - plain.discount, { lock: true })
      : null;
    const totals = priceOrder(lines, { tiers, coupon, delivery: deliveryRules(settings) });

    const [customer] = await db.query(
      `INSERT INTO customers (email, name, company, phone, gstin)
       VALUES (?, ?, ?, ?, ?) AS new
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(customers.id),
         name = new.name,
         company = new.company,
         phone = new.phone,
         gstin = new.gstin`,
      [order.email, order.name, order.company || null, order.phone, order.gstin || null],
    );

    const reference = createReference();
    const status = order.paymentMethod === 'online' ? 'awaiting_payment' : 'placed';
    const [created] = await db.query(
      `INSERT INTO orders
         (reference, customer_id, status, cases, subtotal, discount_bps, discount, coupon_code, coupon_discount,
          delivery_fee, total, payment_method, ship_address, ship_city, ship_pin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        customer.insertId,
        status,
        totals.cases,
        totals.subtotal,
        totals.discountBps,
        totals.discount,
        totals.couponCode,
        totals.couponDiscount,
        totals.deliveryFee,
        totals.total,
        order.paymentMethod,
        order.address,
        order.city,
        order.pin,
      ],
    );

    await db.query(
      'INSERT INTO order_items (order_id, product_id, quantity, case_price, line_total) VALUES ?',
      [
        lines.map((line) => [
          created.insertId,
          line.productId,
          line.quantity,
          line.casePrice,
          line.casePrice * line.quantity,
        ]),
      ],
    );

    for (const line of lines) {
      await db.query('UPDATE products SET stock_cases = stock_cases - ? WHERE id = ?', [
        line.quantity,
        line.productId,
      ]);
    }
    if (coupon) await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [coupon.code]);

    return { id: created.insertId, reference, status, paymentMethod: order.paymentMethod, ...totals };
  });
  if (placed.status === 'placed') notifyOrderPlaced(placed.id);
  return placed;
}

// Opens the Razorpay order an online order is paid against. If Razorpay cannot be reached, the order is cancelled
// again so its stock is not held.
export async function startPayment({ id, reference, total }) {
  let gatewayOrderId;
  try {
    gatewayOrderId = await createGatewayOrder({ reference, amount: total });
  } catch (error) {
    console.error(error);
    await transaction(async (db) => {
      const [[order]] = await db.query('SELECT id, coupon_code FROM orders WHERE id = ? FOR UPDATE', [id]);
      await releaseOrder(db, order);
    });
    throw new HttpError(502, 'Online payment is unavailable right now. Please try again, or pay on delivery.');
  }
  await pool.query('UPDATE orders SET gateway_order_id = ? WHERE id = ?', [gatewayOrderId, id]);
  return checkoutOptions({ gatewayOrderId, total });
}

// Cancels a locked order: its cases go back to stock and its coupon use is returned.
async function releaseOrder(db, order) {
  await db.query(
    `UPDATE products p
       JOIN order_items i ON i.product_id = p.id
        SET p.stock_cases = p.stock_cases + i.quantity
      WHERE i.order_id = ?`,
    [order.id],
  );
  if (order.coupon_code) {
    await db.query('UPDATE coupons SET used_count = used_count - 1 WHERE code = ? AND used_count > 0', [
      order.coupon_code,
    ]);
  }
  await db.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.id]);
}

// Takes a cancelled order's cases out of stock again, if they are all still there.
async function reserveAgain(db, order) {
  const [items] = await db.query(
    `SELECT i.product_id AS productId, i.quantity, p.stock_cases AS stock
       FROM order_items i JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ?
      ORDER BY p.id
        FOR UPDATE`,
    [order.id],
  );
  if (items.some((item) => item.stock < item.quantity)) return false;
  for (const item of items) {
    await db.query('UPDATE products SET stock_cases = stock_cases - ? WHERE id = ?', [item.quantity, item.productId]);
  }
  if (order.coupon_code) {
    await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [order.coupon_code]);
  }
  return true;
}

// Records a captured payment, from the checkout callback or the webhook, whichever arrives first. An order that
// expired before its payment arrived is reopened if its stock is still there; otherwise it stays cancelled and
// marked paid, so the team can see it needs a refund. A placed order is confirmed by email.
export async function markPaid({ gatewayOrderId, paymentId }) {
  const placedId = await transaction(async (db) => {
    const [[order]] = await db.query(
      'SELECT id, status, payment_status, coupon_code FROM orders WHERE gateway_order_id = ? FOR UPDATE',
      [gatewayOrderId],
    );
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.payment_status === 'paid') return null;

    const reopen =
      order.status === 'awaiting_payment' || (order.status === 'cancelled' && (await reserveAgain(db, order)));
    await db.query(
      "UPDATE orders SET status = ?, payment_status = 'paid', gateway_payment_id = ?, paid_at = NOW() WHERE id = ?",
      [reopen ? 'placed' : order.status, paymentId, order.id],
    );
    return reopen ? order.id : null;
  });
  if (placedId) notifyOrderPlaced(placedId);
}

// Cancels online orders whose payment never arrived. Safe to run on every API replica at once.
export async function expireUnpaidOrders() {
  const [orders] = await pool.query(
    "SELECT id FROM orders WHERE status = 'awaiting_payment' AND created_at < NOW() - INTERVAL ? MINUTE",
    [config.unpaidOrderMinutes],
  );
  for (const { id } of orders) {
    await transaction(async (db) => {
      const [[order]] = await db.query(
        "SELECT id, coupon_code FROM orders WHERE id = ? AND status = 'awaiting_payment' FOR UPDATE SKIP LOCKED",
        [id],
      );
      if (order) await releaseOrder(db, order);
    });
  }
}

// An order as its customer sees it, by its reference (long and random, so it works as the order's link). Includes
// what the checkout needs if the order is still waiting for payment.
export async function findOrder(reference) {
  const [[order]] = await pool.query(
    `SELECT id, reference, status, payment_method AS paymentMethod, payment_status AS paymentStatus,
            gateway_order_id AS gatewayOrderId, cases, subtotal, discount_bps AS discountBps, discount,
            coupon_code AS couponCode, coupon_discount AS couponDiscount, delivery_fee AS deliveryFee, total,
            created_at AS createdAt
       FROM orders
      WHERE reference = ?`,
    [reference],
  );
  if (!order) throw new HttpError(404, 'Order not found');
  const [items] = await pool.query(
    `SELECT p.id AS productId, p.name, p.category, p.volume_ml AS volumeMl, p.units_per_case AS unitsPerCase,
            p.image_url AS imageUrl, p.color, i.quantity, i.case_price AS casePrice, i.line_total AS lineTotal
       FROM order_items i JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ?
      ORDER BY p.name`,
    [order.id],
  );
  const { id, gatewayOrderId, ...details } = order;
  const payable = order.status === 'awaiting_payment' && gatewayOrderId && razorpayConfigured;
  return { ...details, items, payment: payable ? checkoutOptions({ gatewayOrderId, total: order.total }) : null };
}

// Admin status changes. Cancelling returns the cases to stock; a cancelled order cannot be reopened by hand.
export function updateOrderStatus(reference, status) {
  return transaction(async (db) => {
    const [[order]] = await db.query('SELECT id, status, coupon_code FROM orders WHERE reference = ? FOR UPDATE', [
      reference,
    ]);
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.status === status) return { reference, status };
    if (order.status === 'cancelled') throw new HttpError(409, 'A cancelled order cannot be reopened');

    if (status === 'cancelled') await releaseOrder(db, order);
    else await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
    return { reference, status };
  });
}
