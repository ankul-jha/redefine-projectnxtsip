import { ApiError } from '../lib/api.js';
import { PREVIEW_ADMIN } from './account.js';
import { startingData } from './data.js';
import { couponProblem, priceOrder } from './pricing.js';

// The store behind the GitHub Pages preview. It answers the same requests as the API (server/src/routes.js and
// admin.js), in the browser, and keeps what a visitor changes (orders, products, settings, copy) in that browser's
// storage, so each visitor has a store of their own. No money is taken and no emails are sent.

const STORAGE_KEY = 'nxtsip-preview-1';
const LOW_STOCK_CASES = 50;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ORDER_STATUSES = ['placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUPON_CODE = /^[A-Z0-9_-]{3,32}$/;
const DAY = 86_400_000;
const startedAt = Date.now();

let store = null;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // Storage blocked or unreadable: start afresh, and keep changes for this visit only.
  }
  return startingData();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    throw new ApiError(507, 'This browser has no room left to save the change');
  }
}

const fail = (status, message, fields) => {
  throw new ApiError(status, message, fields ? { fields } : undefined);
};
const lower = (value) => String(value ?? '').toLowerCase();
const createReference = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length]).join('');
const startOfDay = (daysAgo) => {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day.getTime() - daysAgo * DAY;
};
const dayKey = (time) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const counts = (order) => order.status !== 'cancelled' && order.status !== 'awaiting_payment';
const product = (id) => store.products.find((entry) => entry.id === id);
const customer = (id) => store.customers.find((entry) => entry.id === id);
const nextId = (list) => Math.max(0, ...list.map((entry) => entry.id)) + 1;

const paymentMethods = () => ({ cod: store.settings.codEnabled, online: store.settings.onlineEnabled });
const deliveryRules = () => ({ fee: store.settings.deliveryFee, freeFrom: store.settings.freeDeliveryFrom });

// The order row the admin lists show (ORDER_COLUMNS in admin.js).
function orderRow(order) {
  const { customerId, items, address, city, pin, paidAt, gatewayOrderId, gatewayPaymentId, ...row } = order;
  const { name, company, email } = customer(customerId);
  return { ...row, customer: name, company, email };
}

function linesFor(items) {
  const sellable = (id) => {
    const entry = product(id);
    return entry?.isActive && !entry.comingSoon ? entry : null;
  };
  return {
    lines: items.filter((item) => sellable(item.productId)).map((item) => ({ ...item, casePrice: product(item.productId).casePrice })),
    shortages: items
      .filter((item) => (sellable(item.productId)?.stock ?? 0) < item.quantity)
      .map((item) => ({ productId: item.productId, available: sellable(item.productId)?.stock ?? 0 })),
  };
}

function findCoupon(code, goods) {
  const coupon = store.coupons.find((entry) => entry.code === code);
  const problem = couponProblem(coupon, goods);
  if (problem) fail(422, problem, { couponCode: problem });
  return coupon;
}

function quote({ items = [], couponCode = '' }) {
  const { lines, shortages } = linesFor(items);
  const plain = priceOrder(lines, { tiers: store.tiers });
  const code = couponCode.trim().toUpperCase();
  let coupon = null;
  let couponError = null;
  if (code) {
    try {
      coupon = findCoupon(code, plain.subtotal - plain.discount);
    } catch (error) {
      couponError = error.message;
    }
  }
  return { ...priceOrder(lines, { tiers: store.tiers, coupon, delivery: deliveryRules() }), couponError, shortages };
}

// Places an order as the API does. An online order is marked paid at once: the preview opens no payment window.
function placeOrder(body) {
  const method = body.paymentMethod;
  if (!paymentMethods()[method]) fail(422, 'This way to pay is not available right now', { paymentMethod: 'Choose another way to pay' });
  if (!body.items?.length) fail(422, 'Your cart is empty');
  const { lines, shortages } = linesFor(body.items);
  if (shortages.length > 0) {
    throw new ApiError(409, 'Some items are no longer available in the requested quantity', { items: shortages });
  }

  const plain = priceOrder(lines, { tiers: store.tiers });
  const code = String(body.couponCode ?? '').trim().toUpperCase();
  const coupon = code ? findCoupon(code, plain.subtotal - plain.discount) : null;
  const totals = priceOrder(lines, { tiers: store.tiers, coupon, delivery: deliveryRules() });

  const email = lower(body.email).trim();
  const details = {
    name: String(body.name ?? '').trim(),
    company: String(body.company ?? '').trim(),
    phone: `+91${String(body.phone).replace(/[\s-]/g, '').slice(-10)}`,
    gstin: String(body.gstin ?? '').trim().toUpperCase(),
  };
  let buyer = store.customers.find((entry) => entry.email === email);
  if (buyer) Object.assign(buyer, details);
  else {
    buyer = { id: nextId(store.customers), email, ...details, createdAt: new Date().toISOString() };
    store.customers.push(buyer);
  }

  const now = new Date().toISOString();
  const online = method === 'online';
  const order = {
    reference: createReference(),
    status: 'placed',
    ...totals,
    paymentMethod: method,
    paymentStatus: online ? 'paid' : 'pending',
    createdAt: now,
    paidAt: online ? now : null,
    gatewayOrderId: null,
    gatewayPaymentId: null,
    customerId: buyer.id,
    address: String(body.address ?? '').trim(),
    city: String(body.city ?? '').trim(),
    pin: String(body.pin ?? '').trim(),
    items: lines.map((line) => ({ ...line, lineTotal: line.casePrice * line.quantity })),
  };
  store.orders.push(order);
  for (const line of lines) product(line.productId).stock -= line.quantity;
  if (coupon) coupon.usedCount += 1;
  return { reference: order.reference, status: order.status, paymentMethod: method, ...totals, payment: null };
}

function findOrder(reference) {
  const order = store.orders.find((entry) => entry.reference === reference);
  if (!order) fail(404, 'Order not found');
  return order;
}

// An order as its customer sees it (findOrder in orders.js).
function customerOrder(reference) {
  const order = findOrder(reference);
  const { customerId, address, city, pin, paidAt, gatewayOrderId, gatewayPaymentId, items, ...details } = order;
  return {
    ...details,
    items: items
      .map((item) => {
        const { name, category, volumeMl, unitsPerCase, imageUrl, color } = product(item.productId);
        return { ...item, name, category, volumeMl, unitsPerCase, imageUrl: imageUrl || null, color: color || null };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    payment: null,
  };
}

// Puts a cancelled order's cases back in stock and returns its coupon use.
function release(order) {
  for (const item of order.items) {
    const entry = product(item.productId);
    if (entry) entry.stock += item.quantity;
  }
  const coupon = store.coupons.find((entry) => entry.code === order.couponCode);
  if (coupon && coupon.usedCount > 0) coupon.usedCount -= 1;
  order.status = 'cancelled';
}

function summary() {
  const sold = store.orders.filter(counts);
  const since = (daysAgo) => sold.filter((order) => Date.parse(order.createdAt) >= startOfDay(daysAgo));
  const today = since(0);
  const month = since(29);
  const previous = since(59).filter((order) => Date.parse(order.createdAt) < startOfDay(29));
  const revenue = (orders) => orders.reduce((sum, order) => sum + order.total, 0);
  const newestFirst = [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const daily = Array.from({ length: 30 }, (_, index) => {
    const day = dayKey(startOfDay(29 - index));
    const orders = month.filter((order) => dayKey(Date.parse(order.createdAt)) === day);
    return { day, orders: orders.length, revenue: revenue(orders) };
  });
  const statuses = new Map();
  for (const order of store.orders) statuses.set(order.status, (statuses.get(order.status) ?? 0) + 1);
  const byStatus = [...statuses].map(([status, orders]) => ({ status, orders }));
  const cases = new Map();
  for (const item of month.flatMap((order) => order.items)) {
    cases.set(item.productId, (cases.get(item.productId) ?? 0) + item.quantity);
  }

  return {
    today: { orders: today.length, revenue: revenue(today) },
    month: { revenue: revenue(month), previous: revenue(previous) },
    daily,
    byStatus,
    topProducts: [...cases]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => ({ name: product(id)?.name ?? 'Removed product', cases: total })),
    system: { instance: 'the preview', uptime: Math.round((Date.now() - startedAt) / 1000), payments: true, email: false },
    pending: store.orders.filter((order) => order.status === 'placed').length,
    customers: store.customers.length,
    waitlist: store.waitlist.length,
    lowStock: store.products
      .filter((entry) => entry.isActive && !entry.comingSoon && entry.stock < LOW_STOCK_CASES)
      .sort((a, b) => a.stock - b.stock)
      .map(({ id, name, stock }) => ({ id, name, stock })),
    recent: newestFirst.slice(0, 8).map(orderRow),
    refunds: newestFirst.filter((order) => order.status === 'cancelled' && order.paymentStatus === 'paid').map(orderRow),
  };
}

// The API's order: by category as the schema's ENUM lists them (water, then soda), then size and name.
const CATEGORY_ORDER = ['water', 'soda'];
const sortProducts = (list) =>
  [...list].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.volumeMl - b.volumeMl ||
      a.name.localeCompare(b.name),
  );

function checkProduct(body, id) {
  const sku = String(body.sku ?? '').trim().toUpperCase();
  const fields = {};
  if (sku.length < 2 || sku.length > 32) fields.sku = 'Enter a SKU of up to 32 characters';
  else if (store.products.some((entry) => entry.sku === sku && entry.id !== id)) fields.sku = 'SKU already exists';
  if (String(body.name ?? '').trim().length < 2) fields.name = 'Enter a product name';
  for (const [field, message] of [
    ['volumeMl', 'Enter the volume in ml'],
    ['unitsPerCase', 'Enter units per case'],
    ['casePrice', 'Enter a case price'],
  ]) {
    if (!Number.isInteger(body[field]) || body[field] < 1) fields[field] = message;
  }
  if (!Number.isInteger(body.stock) || body.stock < 0) fields.stock = 'Enter a whole number';
  if (Object.keys(fields).length > 0) fail(fields.sku === 'SKU already exists' ? 409 : 422, 'Please correct the highlighted fields', fields);
  return {
    sku,
    name: body.name.trim(),
    category: body.category === 'soda' ? 'soda' : 'water',
    volumeMl: body.volumeMl,
    unitsPerCase: body.unitsPerCase,
    casePrice: body.casePrice,
    stock: body.stock,
    imageUrl: String(body.imageUrl ?? '').trim(),
    color: String(body.color ?? '').trim(),
    isActive: Boolean(body.isActive),
    comingSoon: Boolean(body.comingSoon),
    updatedAt: new Date().toISOString(),
  };
}

function checkCoupon(body) {
  const code = String(body.code ?? '').trim().toUpperCase();
  const fields = {};
  if (!COUPON_CODE.test(code)) fields.code = 'Use 3–32 letters, numbers, - or _';
  if (!Number.isInteger(body.value) || body.value < 1) fields.value = 'Enter the discount';
  else if (body.kind === 'percent' && body.value > 10_000) fields.value = 'A percentage can be at most 100%';
  if (Object.keys(fields).length > 0) fail(422, 'Please correct the highlighted fields', fields);
  return {
    code,
    kind: body.kind === 'flat' ? 'flat' : 'percent',
    value: body.value,
    minSubtotal: body.minSubtotal ?? 0,
    maxUses: body.maxUses ?? null,
    // As in the API, a coupon lasts until the end of its last day in India.
    expiresAt: body.expiresOn ? new Date(`${body.expiresOn}T23:59:59+05:30`).toISOString() : null,
    isActive: Boolean(body.isActive),
  };
}

const settingsResponse = () => ({
  ...store.settings,
  tiers: store.tiers,
  razorpay: { configured: true, webhook: true },
  email: { configured: false, from: '' },
});

function saveSettings(body) {
  const { tiers = [], ...settings } = body;
  if (!EMAIL.test(settings.contactEmail ?? '')) fail(422, 'Please correct the highlighted fields', { contactEmail: 'Enter a valid email address' });
  if (!settings.codEnabled && !settings.onlineEnabled) fail(422, 'Keep at least one way to pay', { codEnabled: 'Keep at least one way to pay' });
  if (new Set(tiers.map((tier) => tier.minCases)).size !== tiers.length) fail(422, 'Each tier needs a different case count');
  store.settings = Object.fromEntries(Object.keys(store.settings).map((key) => [key, settings[key] ?? store.settings[key]]));
  store.tiers = [...tiers].sort((a, b) => a.minCases - b.minCases);
  return settingsResponse();
}

const readImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PUBLIC = {
  'GET /health': () => ({ status: 'ok', instance: 'the preview' }),
  'GET /products': () => ({
    currency: 'INR',
    tiers: store.tiers,
    products: sortProducts(store.products.filter((entry) => entry.isActive)).map(({ isActive, updatedAt, ...entry }) => ({
      ...entry,
      imageUrl: entry.imageUrl || null,
      color: entry.color || null,
    })),
  }),
  'GET /site': () => {
    const { deliveryFee, freeDeliveryFrom, deliveryNote, codEnabled, onlineEnabled, ...contact } = store.settings;
    return {
      ...contact,
      delivery: { fee: deliveryFee, freeFrom: freeDeliveryFrom, note: deliveryNote },
      payments: paymentMethods(),
      content: store.content,
    };
  },
  'POST /quote': ({ body }) => quote(body),
  'POST /orders': ({ body }) => placeOrder(body),
  'GET /orders/:reference': ({ params }) => customerOrder(params.reference),
  'POST /orders/:reference/payment': () => fail(400, 'This payment could not be verified'),
  'POST /waitlist': ({ body }) => {
    const email = lower(body.email).trim();
    if (!EMAIL.test(email)) fail(422, 'Please correct the highlighted fields', { email: 'Enter a valid email address' });
    if (!store.waitlist.some((entry) => entry.email === email)) store.waitlist.unshift({ email, createdAt: new Date().toISOString() });
    return { ok: true };
  },
  'POST /admin/login': ({ body }) => {
    if (lower(body.email).trim() !== PREVIEW_ADMIN.email || body.password !== PREVIEW_ADMIN.password) {
      fail(401, 'Email or password is incorrect');
    }
    store.signedIn = true;
    return { email: PREVIEW_ADMIN.email, name: PREVIEW_ADMIN.name };
  },
  'POST /admin/logout': () => {
    store.signedIn = false;
    return null;
  },
};

const ADMIN = {
  'GET /admin/me': () => ({ email: PREVIEW_ADMIN.email, name: PREVIEW_ADMIN.name }),
  'GET /admin/summary': summary,
  'GET /admin/orders': ({ query }) => {
    const status = query.get('status');
    const search = lower(query.get('q')).trim();
    return [...store.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(orderRow)
      .filter((order) => !status || order.status === status)
      .filter((order) => !search || [order.reference, order.customer, order.email, order.company].some((value) => lower(value).includes(search)))
      .slice(0, 200);
  },
  'GET /admin/orders/:reference': ({ params }) => {
    const order = findOrder(params.reference);
    const { phone, gstin } = customer(order.customerId);
    return {
      ...orderRow(order),
      phone,
      gstin,
      address: order.address,
      city: order.city,
      pin: order.pin,
      gatewayOrderId: order.gatewayOrderId,
      gatewayPaymentId: order.gatewayPaymentId,
      paidAt: order.paidAt,
      items: order.items
        .map((item) => ({ ...item, name: product(item.productId)?.name ?? 'Removed product', sku: product(item.productId)?.sku ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
  'PATCH /admin/orders/:reference': ({ params, body }) => {
    const order = findOrder(params.reference);
    if (!ORDER_STATUSES.includes(body.status)) fail(422, 'Choose a valid status', { status: 'Choose a valid status' });
    if (order.status !== body.status) {
      if (order.status === 'cancelled') fail(409, 'A cancelled order cannot be reopened');
      if (body.status === 'cancelled') release(order);
      else order.status = body.status;
    }
    return { reference: order.reference, status: order.status };
  },
  'PATCH /admin/orders/:reference/payment': ({ params, body }) => {
    const order = findOrder(params.reference);
    order.paymentStatus = body.paymentStatus;
    if (body.paymentStatus === 'paid') order.paidAt ??= new Date().toISOString();
    return { reference: order.reference, paymentStatus: order.paymentStatus };
  },
  'GET /admin/products': () => sortProducts(store.products),
  'POST /admin/products': ({ body }) => {
    const created = { id: nextId(store.products), ...checkProduct(body, null) };
    store.products.push(created);
    return created;
  },
  'PUT /admin/products/:id': ({ params, body }) => {
    const entry = product(Number(params.id));
    if (!entry) fail(404, 'Product not found');
    return Object.assign(entry, checkProduct(body, entry.id));
  },
  'GET /admin/customers': () =>
    [...store.customers]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((entry) => {
        const orders = store.orders.filter((order) => order.customerId === entry.id);
        return {
          ...entry,
          orders: orders.length,
          spent: orders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.total, 0),
        };
      }),
  'GET /admin/waitlist': () => store.waitlist,
  'GET /admin/settings': settingsResponse,
  'PUT /admin/settings': ({ body }) => saveSettings(body),
  'GET /admin/content': () => ({ content: store.content }),
  'PUT /admin/content': ({ body }) => {
    store.content = body;
    return { content: body };
  },
  'GET /admin/coupons': () => [...store.coupons].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  'POST /admin/coupons': ({ body }) => {
    const coupon = checkCoupon(body);
    if (store.coupons.some((entry) => entry.code === coupon.code)) fail(409, 'This code already exists', { code: 'Code already exists' });
    store.coupons.push({ ...coupon, usedCount: 0, createdAt: new Date().toISOString() });
    return { code: coupon.code };
  },
  'PUT /admin/coupons/:code': ({ params, body }) => {
    const entry = store.coupons.find((coupon) => coupon.code === params.code);
    if (!entry) fail(404, 'Coupon not found');
    Object.assign(entry, checkCoupon({ ...body, code: params.code }));
    return { code: entry.code };
  },
  'DELETE /admin/coupons/:code': ({ params }) => {
    store.coupons = store.coupons.filter((coupon) => coupon.code !== params.code);
    return null;
  },
  // Uploaded images are kept in the browser as data URLs.
  'POST /admin/images': async ({ file }) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file?.type ?? '') || file.size > MAX_IMAGE_BYTES) {
      fail(422, 'Upload a PNG, JPEG or WebP image of up to 2 MB');
    }
    return { url: await readImage(file) };
  },
};

function route(routes, method, pathname) {
  const parts = pathname.split('/');
  for (const [key, handler] of Object.entries(routes)) {
    const [verb, pattern] = key.split(' ');
    const expected = pattern.split('/');
    if (verb !== method || expected.length !== parts.length) continue;
    const params = {};
    const matches = expected.every((part, index) => {
      if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(parts[index]);
      return part.startsWith(':') || part === parts[index];
    });
    if (matches) return { handler, params };
  }
  return null;
}

// Answers a request to the API, as `request` in lib/api.js would get it from the server.
export async function answer(path, { method, body, file }) {
  store ??= load();
  const url = new URL(path, 'https://preview.invalid');
  const open = route(PUBLIC, method, url.pathname);
  const found = open ?? route(ADMIN, method, url.pathname);
  // A moment's delay, as over the network, so loading states show as they would on the live site.
  await new Promise((resolve) => setTimeout(resolve, 120));
  if (!found) fail(404, 'Not found');
  if (!open && !store.signedIn) fail(401, 'Please sign in');

  try {
    const result = await found.handler({ params: found.params, query: url.searchParams, body: body ?? {}, file });
    if (method !== 'GET') save();
    return result === null ? null : structuredClone(result);
  } catch (error) {
    // Drop any half-made change: the next request starts again from what was last saved.
    store = null;
    throw error instanceof ApiError ? error : new ApiError(500, 'Something went wrong');
  }
}
