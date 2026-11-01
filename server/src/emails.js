import { config } from './config.js';
import { pool } from './db.js';
import { sendMail } from './mail.js';
import { loadSettings } from './settings.js';

const BRAND = 'Nxtsip';
const COLOR = { paper: '#d5e8f7', surface: '#e5f1fb', navy: '#0a2747', muted: '#3b5675', line: '#abc9e4' };
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  trailingZeroDisplay: 'stripIfInteger',
});
export const money = (paise) => rupees.format(paise / 100);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

const link = (path) => (config.siteUrl ? `${config.siteUrl}${path}` : null);

const button = (href, label) =>
  href
    ? `<a href="${escape(href)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${COLOR.navy};color:${COLOR.surface};font:700 13px ${FONT};letter-spacing:.12em;text-transform:uppercase;text-decoration:none">${escape(label)}</a>`
    : '';


function layout({ preheader, title, body, contact }) {
  const logo = link('/brand/nxtsip-logo.png');
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${COLOR.paper}">
<span style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.paper}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLOR.surface};border-radius:24px">
<tr><td style="padding:28px 32px 0">${logo ? `<img src="${escape(logo)}" alt="${BRAND}" width="120" style="display:block;width:120px;height:auto">` : `<p style="margin:0;font:800 24px ${FONT};color:${COLOR.navy}">${BRAND}</p>`}</td></tr>
<tr><td style="padding:24px 32px 0"><h1 style="margin:0;font:800 40px/1 ${FONT};letter-spacing:-.04em;color:${COLOR.navy}">${escape(title)}</h1></td></tr>
<tr><td style="padding:16px 32px 32px;font:400 15px/1.6 ${FONT};color:${COLOR.navy}">${body}</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid ${COLOR.line};font:400 12px/1.6 ${FONT};color:${COLOR.muted}">${contact}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function contactLine(settings) {
  const ways = [settings.contactPhone, settings.contactEmail].filter(Boolean).map(escape);
  return `${BRAND} · Your Water Your Sip${ways.length ? `<br>Questions? ${ways.join(' · ')}` : ''}`;
}

const row = (label, value, strong = false) =>
  `<tr><td style="padding:6px 0;color:${strong ? COLOR.navy : COLOR.muted};font-weight:${strong ? 800 : 400}">${escape(label)}</td><td align="right" style="padding:6px 0;font-weight:${strong ? 800 : 600}">${escape(value)}</td></tr>`;

function totalsTable(order) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:15px ${FONT};color:${COLOR.navy}">
${row(`Subtotal · ${order.cases} ${order.cases === 1 ? 'case' : 'cases'}`, money(order.subtotal))}
${order.discount > 0 ? row(`Wholesale discount (${order.discountBps / 100}%)`, `−${money(order.discount)}`) : ''}
${order.couponDiscount > 0 ? row(`Coupon ${order.couponCode}`, `−${money(order.couponDiscount)}`) : ''}
${row('Delivery', order.deliveryFee > 0 ? money(order.deliveryFee) : 'Free')}
${row('Total', money(order.total), true)}
</table>`;
}

function itemsTable(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;font:15px ${FONT};color:${COLOR.navy}">
${items
  .map(
    (item) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid ${COLOR.line}"><strong>${escape(item.name)}</strong><br><span style="color:${COLOR.muted}">${item.quantity} × ${money(item.casePrice)}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid ${COLOR.line};font-weight:700">${money(item.lineTotal)}</td></tr>`,
  )
  .join('\n')}
</table>`;
}

const paymentText = (order) =>
  order.paymentMethod === 'online' ? 'Paid online' : `Cash on delivery: ${money(order.total)} due when it arrives`;

// The thank-you for a placed order (cash on delivery) or a paid one (online).
export function orderConfirmation(order, settings) {
  const firstName = order.name.split(' ')[0];
  const orderLink = link(`/order/${order.reference}`);
  const body = `<p style="margin:0 0 6px">Thank you, ${escape(firstName)}. We've got your order <strong>${escape(order.reference)}</strong> and will call you to confirm the delivery slot.</p>
${itemsTable(order.items)}
${totalsTable(order)}
<p style="margin:20px 0 4px"><strong>Payment</strong><br>${escape(paymentText(order))}</p>
<p style="margin:12px 0 24px"><strong>Delivering to</strong><br>${escape(order.address)}, ${escape(order.city)} ${escape(order.pin)}${settings.deliveryNote ? `<br><span style="color:${COLOR.muted}">${escape(settings.deliveryNote)}</span>` : ''}</p>
${button(orderLink, 'Track your order')}`;
  const text = [
    `Thank you, ${firstName}. We've got your order ${order.reference} and will call you to confirm the delivery slot.`,
    '',
    ...order.items.map((item) => `${item.name}: ${item.quantity} × ${money(item.casePrice)} = ${money(item.lineTotal)}`),
    `Total: ${money(order.total)} (${paymentText(order)})`,
    `Delivering to: ${order.address}, ${order.city} ${order.pin}`,
    orderLink ? `Track your order: ${orderLink}` : '',
  ].join('\n');
  return {
    to: order.email,
    subject: `Thank you for your order ${order.reference}`,
    html: layout({ preheader: `Order ${order.reference}: ${money(order.total)}`, title: 'Thank you!', body, contact: contactLine(settings) }),
    text,
  };
}

export function newOrderAlert(order, settings) {
  const adminLink = link(`/admin/orders/${order.reference}`);
  const body = `<p style="margin:0 0 6px"><strong>${escape(order.name)}</strong>${order.company ? ` (${escape(order.company)})` : ''} · ${escape(order.phone)} · ${escape(order.email)}</p>
<p style="margin:0">${escape(order.address)}, ${escape(order.city)} ${escape(order.pin)}</p>
${itemsTable(order.items)}
${totalsTable(order)}
<p style="margin:20px 0 24px"><strong>${escape(paymentText(order))}</strong></p>
${button(adminLink, 'Open in admin')}`;
  return {
    to: settings.contactEmail,
    subject: `New order ${order.reference} · ${money(order.total)} · ${order.cases} ${order.cases === 1 ? 'case' : 'cases'}`,
    html: layout({ preheader: `${order.name}, ${order.city}`, title: 'New order', body, contact: contactLine(settings) }),
    text: `New order ${order.reference} from ${order.name} (${order.phone}, ${order.email}): ${money(order.total)}, ${paymentText(order)}.${adminLink ? `\n${adminLink}` : ''}`,
  };
}


export function waitlistThanks(email, settings) {
  const shopLink = link('/shop');
  const body = `<p style="margin:0 0 20px">You're on the list for ${BRAND} Soda: the same clean water, in a crisp, sparkling can. We'll email you the day it lands, and not before.</p>
<p style="margin:0 0 24px">Thirsty in the meantime? Our water is delivered by the case to homes, offices and stores.</p>
${button(shopLink, 'Shop water')}`;
  return {
    to: email,
    subject: `You're on the ${BRAND} Soda list`,
    html: layout({ preheader: "We'll email you the day it lands.", title: "You're on the list!", body, contact: contactLine(settings) }),
    text: `You're on the list for ${BRAND} Soda. We'll email you the day it lands.${shopLink ? `\nShop water: ${shopLink}` : ''}`,
  };
}

async function loadOrder(id) {
  const [[order]] = await pool.query(
    `SELECT o.reference, o.cases, o.subtotal, o.discount_bps AS discountBps, o.discount, o.coupon_code AS couponCode,
            o.coupon_discount AS couponDiscount, o.delivery_fee AS deliveryFee, o.total, o.payment_method AS paymentMethod,
            o.ship_address AS address, o.ship_city AS city, o.ship_pin AS pin,
            c.name, c.company, c.email, c.phone
       FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?`,
    [id],
  );
  const [items] = await pool.query(
    `SELECT p.name, i.quantity, i.case_price AS casePrice, i.line_total AS lineTotal
       FROM order_items i JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ?
      ORDER BY p.name`,
    [id],
  );
  return { ...order, items };
}

export function notifyOrderPlaced(id) {
  Promise.all([loadOrder(id), loadSettings(pool)])
    .then(([order, settings]) => {
      sendMail(orderConfirmation(order, settings));
      if (settings.contactEmail) sendMail(newOrderAlert(order, settings));
    })
    .catch((error) => console.error(`Order emails for order ${id} failed: ${error.message}`));
}

export function notifyWaitlistJoined(email) {
  loadSettings(pool)
    .then((settings) => sendMail(waitlistThanks(email, settings)))
    .catch((error) => console.error(`Waitlist email failed: ${error.message}`));
}
