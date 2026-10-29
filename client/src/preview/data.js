import { priceOrder } from './pricing.js';

// The preview's starting store: the products, tiers and settings from server/db/02-seed.sql, a sample coupon, and six
// weeks of sample orders so the admin dashboard has something to show.

const DAY = 86_400_000;
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

const PRODUCTS = [
  ['NXT-W250', 'Nxtsip Water 250 ml', 'water', 250, 48, 28800, 1200, 'products/water-250ml.webp', '', false],
  ['NXT-W500', 'Nxtsip Water 500 ml', 'water', 500, 24, 24000, 2000, 'products/water-500ml.webp', '', false],
  ['NXT-W1000', 'Nxtsip Water 1 L', 'water', 1000, 12, 24000, 1500, 'products/water-1l.webp', '', false],
  ['NXT-W2000', 'Nxtsip Water 2 L', 'water', 2000, 6, 18000, 40, 'products/water-2l.webp', '', false],
  ['NXT-JAR20', 'Nxtsip Water 20 L Jar', 'water', 20000, 1, 9000, 300, 'products/water-20l.webp', '', false],
  ['NXT-GL750', 'Nxtsip Glass Bottle 750 ml', 'water', 750, 1, 5000, 0, '', '', true],
  ['NXT-S-LIME', 'Nxtsip Soda Lime Mint', 'soda', 330, 24, 72000, 0, '', '#16b8f3', true],
  ['NXT-S-COLA', 'Nxtsip Soda Cola', 'soda', 330, 24, 72000, 0, '', '#0b3fae', true],
  ['NXT-S-ORNG', 'Nxtsip Soda Orange', 'soda', 330, 24, 72000, 0, '', '#ff8a1f', true],
];

const TIERS = [
  { minCases: 20, discountBps: 600 },
  { minCases: 50, discountBps: 1200 },
  { minCases: 100, discountBps: 2000 },
];

const SETTINGS = {
  contactEmail: 'orders@nxtsip.example',
  contactPhone: '+91 00000 00000',
  whatsapp: '',
  announcement: 'Free delivery on orders over ₹1,500 · Wholesale discounts from 20 cases',
  deliveryFee: 9900,
  freeDeliveryFrom: 150000,
  deliveryNote: 'Delivered in 1–3 working days.',
  codEnabled: true,
  onlineEnabled: true,
};

const CUSTOMERS = [
  ['Rohan Mehta', 'Sunrise Mart', 'rohan@sunrisemart.example', '+919810000001', '', 'Shop 4, Saket Market', 'New Delhi', '110017'],
  ['Priya Nair', 'Green Leaf Café', 'priya@greenleaf.example', '+919820000002', '', '12 Hill Road, Bandra West', 'Mumbai', '400050'],
  ['Arjun Rao', 'Brightpath School', 'office@brightpath.example', '+919845000003', '', '80 Feet Road, Indiranagar', 'Bengaluru', '560038'],
  ['Sneha Kapoor', '', 'sneha.kapoor@example.com', '+919811000004', '', 'Tower B, DLF Phase 4', 'Gurugram', '122002'],
  ['Vikram Singh', 'Urban Desk Offices', 'admin@urbandesk.example', '+919899000005', '', 'Plot 7, Sector 62', 'Noida', '201301'],
  ['Ananya Iyer', '', 'ananya.iyer@example.com', '+919840000006', '', '22 Usman Road, T. Nagar', 'Chennai', '600017'],
  ['Kabir Malhotra', 'Kaveri Hotels', 'purchase@kaverihotels.example', '+919876000007', '07AAACK1234F1Z5', '5 Janpath', 'New Delhi', '110001'],
];

const WAITLIST = ['meera.joshi@example.com', 'aditya.verma@example.com', 'hello@chaiandco.example', 'nisha.patel@example.com'];

// A seeded random number generator (mulberry32), so every visitor starts with the same sample orders.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleOrders({ products, customers, now, random }) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const sellable = products.filter((product) => !product.comingSoon);
  const delivery = { fee: SETTINGS.deliveryFee, freeFrom: SETTINGS.freeDeliveryFrom };
  const orders = [];

  for (let daysAgo = 44; daysAgo >= 0; daysAgo -= 1) {
    const count = Math.floor(random() * 3) + (random() < 0.3 ? 1 : 0);
    for (let n = 0; n < count; n += 1) {
      const customer = pick(customers);
      const wholesale = customer.company !== '' && random() < 0.6;
      const chosen = [...new Set([pick(sellable), pick(sellable)].slice(0, random() < 0.5 ? 1 : 2))];
      const lines = chosen.map((product) => ({
        productId: product.id,
        quantity: wholesale ? 12 + Math.floor(random() * 30) : 1 + Math.floor(random() * 4),
        casePrice: product.casePrice,
      }));
      const totals = priceOrder(lines, { tiers: TIERS, delivery });
      const createdAt = daysAgo === 0 ? now - random() * 5 * 3_600_000 : now - daysAgo * DAY - random() * 8 * 3_600_000;
      const status =
        daysAgo > 6
          ? random() < 0.08
            ? 'cancelled'
            : 'delivered'
          : daysAgo > 2
            ? pick(['confirmed', 'dispatched', 'delivered'])
            : pick(['placed', 'placed', 'confirmed']);
      const paymentMethod = status !== 'cancelled' && random() < 0.55 ? 'online' : 'cod';
      const paid = paymentMethod === 'online' || status === 'delivered';
      orders.push({
        reference: Array.from({ length: 10 }, () => pick(REFERENCE_ALPHABET)).join(''),
        status,
        ...totals,
        paymentMethod,
        paymentStatus: paid ? 'paid' : 'pending',
        createdAt: new Date(createdAt).toISOString(),
        paidAt: paid ? new Date(createdAt).toISOString() : null,
        gatewayOrderId: null,
        gatewayPaymentId: null,
        customerId: customer.id,
        address: customer.address,
        city: customer.city,
        pin: customer.pin,
        items: lines.map((line) => ({ ...line, lineTotal: line.casePrice * line.quantity })),
      });
    }
  }
  return orders;
}

export function startingData() {
  const now = Date.now();
  const random = seeded(918);
  const products = PRODUCTS.map(
    ([sku, name, category, volumeMl, unitsPerCase, casePrice, stock, image, color, comingSoon], index) => ({
      id: index + 1,
      sku,
      name,
      category,
      volumeMl,
      unitsPerCase,
      casePrice,
      stock,
      imageUrl: image && asset(image),
      color,
      isActive: true,
      comingSoon,
      updatedAt: new Date(now).toISOString(),
    }),
  );
  const customers = CUSTOMERS.map(([name, company, email, phone, gstin, address, city, pin], index) => ({
    id: index + 1,
    name,
    company,
    email,
    phone,
    gstin,
    address,
    city,
    pin,
    createdAt: new Date(now - (60 - index * 2) * DAY).toISOString(),
  }));
  const orders = sampleOrders({ products, customers, now, random });

  return {
    products,
    tiers: TIERS,
    settings: SETTINGS,
    content: null,
    coupons: [
      {
        code: 'WELCOME10',
        kind: 'percent',
        value: 1000,
        minSubtotal: 50000,
        maxUses: null,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(now).toISOString(),
      },
    ],
    customers: customers.map(({ address, city, pin, ...customer }) => customer),
    orders,
    waitlist: WAITLIST.map((email, index) => ({ email, createdAt: new Date(now - (index * 5 + 1) * DAY).toISOString() })),
    signedIn: false,
  };
}
