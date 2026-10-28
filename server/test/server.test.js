import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../src/auth.js';
import { orderConfirmation } from '../src/emails.js';
import { imageType } from '../src/images.js';
import { priceOrder } from '../src/pricing.js';
import { couponSchema, orderSchema, parse, productSchema } from '../src/validation.js';

const TIERS = [
  { minCases: 20, discountBps: 600 },
  { minCases: 50, discountBps: 1200 },
  { minCases: 100, discountBps: 2000 },
];

test('no discount below the first tier', () => {
  const totals = priceOrder([{ casePrice: 24000, quantity: 19 }], { tiers: TIERS });
  assert.deepEqual(totals, {
    cases: 19,
    subtotal: 456000,
    discountBps: 0,
    discount: 0,
    couponCode: null,
    couponDiscount: 0,
    deliveryFee: 0,
    total: 456000,
  });
});

test('tier is chosen by total cases across all lines', () => {
  const totals = priceOrder(
    [
      { casePrice: 24000, quantity: 30 },
      { casePrice: 9000, quantity: 20 },
    ],
    { tiers: TIERS },
  );
  assert.equal(totals.cases, 50);
  assert.equal(totals.discountBps, 1200);
  assert.equal(totals.discount, Math.round(900000 * 0.12));
  assert.equal(totals.total, totals.subtotal - totals.discount);
});

test('highest tier applies at 100+ cases', () => {
  assert.equal(priceOrder([{ casePrice: 100, quantity: 150 }], { tiers: TIERS }).discountBps, 2000);
});

test('no tiers means no discount', () => {
  assert.equal(priceOrder([{ casePrice: 100, quantity: 500 }], { tiers: [] }).discount, 0);
});

test('a coupon applies after the wholesale discount', () => {
  const lines = [{ casePrice: 10000, quantity: 20 }];
  const percent = priceOrder(lines, { tiers: TIERS, coupon: { code: 'TEN', kind: 'percent', value: 1000 } });
  assert.equal(percent.discount, 12000);
  assert.equal(percent.couponDiscount, 18800);
  assert.equal(percent.total, 200000 - 12000 - 18800);

  const big = { code: 'BIG', kind: 'flat', value: 90000 };
  const flat = priceOrder([{ casePrice: 500, quantity: 1 }], { tiers: [], coupon: big });
  assert.equal(flat.couponDiscount, 500, 'a flat coupon never takes the total below zero');
  assert.equal(flat.total, 0);
});

test('delivery is free from the threshold, measured after discounts', () => {
  const delivery = { fee: 9900, freeFrom: 150000 };
  assert.equal(priceOrder([{ casePrice: 24000, quantity: 6 }], { tiers: [], delivery }).deliveryFee, 9900);
  assert.equal(priceOrder([{ casePrice: 25000, quantity: 6 }], { tiers: [], delivery }).deliveryFee, 0);
  const coupon = { code: 'LESS', kind: 'flat', value: 1000 };
  assert.equal(priceOrder([{ casePrice: 25000, quantity: 6 }], { tiers: [], coupon, delivery }).deliveryFee, 9900);
  const always = { fee: 5000, freeFrom: 0 };
  assert.equal(priceOrder([{ casePrice: 1, quantity: 1 }], { tiers: [], delivery: always }).total, 5001);
});

const validOrder = {
  name: 'Asha Rao',
  company: '',
  email: ' Asha@Example.com ',
  phone: '98765 43210',
  gstin: '27aapfu0939f1zv',
  address: '12 Market Road',
  city: 'Pune',
  pin: '411001',
  paymentMethod: 'online',
  items: [{ productId: 1, quantity: 3 }],
};

test('normalises a valid order', () => {
  const order = parse(orderSchema, validOrder);
  assert.equal(order.email, 'asha@example.com');
  assert.equal(order.phone, '+919876543210');
  assert.equal(order.gstin, '27AAPFU0939F1ZV');
  assert.equal(order.couponCode, '');
});

test('orders need a known way to pay', () => {
  assert.throws(
    () => parse(orderSchema, { ...validOrder, paymentMethod: 'cheque' }),
    (error) => 'paymentMethod' in error.details.fields,
  );
});

test('coupons cap percentages at 100%', () => {
  const coupon = {
    code: 'save10',
    kind: 'percent',
    value: 1000,
    minSubtotal: 0,
    maxUses: null,
    expiresOn: null,
    isActive: true,
  };
  assert.equal(parse(couponSchema, coupon).code, 'SAVE10');
  assert.throws(() => parse(couponSchema, { ...coupon, value: 10_001 }), (error) => 'value' in error.details.fields);
  assert.equal(parse(couponSchema, { ...coupon, kind: 'flat', value: 50_000 }).value, 50_000);
});

test('uploaded images are recognised by their bytes, not their name', () => {
  assert.equal(imageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.equal(imageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(imageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
});

test('rejects invalid fields with per-field messages', () => {
  assert.throws(
    () => parse(orderSchema, { ...validOrder, pin: '012345', items: [] }),
    (error) => error.status === 422 && 'pin' in error.details.fields && 'items' in error.details.fields,
  );
});

test('rejects duplicate products', () => {
  assert.throws(
    () => parse(orderSchema, { ...validOrder, items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] }),
    (error) => error.status === 422,
  );
});

test('product colours must be hex', () => {
  const product = {
    sku: 'nxt-s-lime',
    name: 'Lime',
    category: 'soda',
    volumeMl: 330,
    unitsPerCase: 24,
    casePrice: 72000,
    stock: 0,
    imageUrl: '',
    color: '#16b8f3',
    isActive: true,
    comingSoon: true,
  };
  assert.equal(parse(productSchema, product).sku, 'NXT-S-LIME');
  assert.throws(() => parse(productSchema, { ...product, color: 'blue' }), (error) => 'color' in error.details.fields);
});

test('passwords verify only with the right secret', async () => {
  const stored = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', stored), true);
  assert.equal(await verifyPassword('wrong password', stored), false);
});

test('order emails escape what customers typed', () => {
  const order = {
    reference: 'K3BP3447QW',
    name: 'Asha <script>alert(1)</script> Rao',
    email: 'asha@example.com',
    address: '12 Market Road & "Shop 4"',
    city: 'Pune',
    pin: '411001',
    cases: 3,
    subtotal: 72000,
    discountBps: 0,
    discount: 0,
    couponCode: null,
    couponDiscount: 0,
    deliveryFee: 9900,
    total: 81900,
    paymentMethod: 'cod',
    items: [{ name: 'Nxtsip Water 500 ml', quantity: 3, casePrice: 24000, lineTotal: 72000 }],
  };
  const { to, subject, html, text } = orderConfirmation(order, { contactPhone: '', contactEmail: '', deliveryNote: '' });
  assert.equal(to, 'asha@example.com');
  assert.match(subject, /K3BP3447QW/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /12 Market Road &amp; &quot;Shop 4&quot;/);
  assert.match(html, /₹819/);
  assert.match(text, /Total: ₹819/);
});
