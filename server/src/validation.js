import { z } from 'zod';
import { HttpError } from './errors.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(?:\+91|0)?[2-9]\d{9}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PIN = /^[1-9]\d{5}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const COUPON_CODE = /^[A-Z0-9_-]{3,32}$/;
const WHATSAPP = /^\+?\d{10,15}$/;

const text = (min, max, message) => z.string(message).trim().min(min, message).max(max, message);
const email = z
  .string('Enter a valid email address')
  .trim()
  .toLowerCase()
  .max(254, 'Enter a valid email address')
  .regex(EMAIL, 'Enter a valid email address');
const count = (max) => z.number('Enter a whole number').int('Enter a whole number').min(0).max(max);
const copy = (max) => text(1, max, `Fill this in, in at most ${max} characters`);
const couponCode = z.string().trim().toUpperCase().max(32, 'This code is not valid').default('');

const items = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(9999),
    }),
  )
  .min(1, 'Your cart is empty')
  .max(50, 'Too many products in one order')
  .refine(
    (lines) => new Set(lines.map((line) => line.productId)).size === lines.length,
    'Each product may appear only once',
  );

export const quoteSchema = z.object({ items, couponCode });

export const orderSchema = z.object({
  name: text(2, 100, 'Enter your full name'),
  company: z.string().trim().max(120, 'Company name is too long').default(''),
  email,
  phone: z
    .string('Enter a valid 10-digit phone number')
    .transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => PHONE.test(value), 'Enter a valid 10-digit phone number')
    .transform((value) => `+91${value.slice(-10)}`),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === '' || GSTIN.test(value), 'Enter a valid 15-character GSTIN')
    .default(''),
  address: text(5, 255, 'Enter your full delivery address'),
  city: text(2, 80, 'Enter your city'),
  pin: z.string('Enter a valid 6-digit PIN code').trim().regex(PIN, 'Enter a valid 6-digit PIN code'),
  paymentMethod: z.enum(['cod', 'online'], 'Choose how you would like to pay'),
  couponCode,
  items,
});

// What the Razorpay checkout hands back after a successful payment.
export const paymentSchema = z.object({
  razorpayOrderId: z.string().max(64),
  razorpayPaymentId: z.string().max(64),
  razorpaySignature: z.string().regex(/^[0-9a-f]{64}$/i),
});

export const waitlistSchema = z.object({ email });

export const loginSchema = z.object({
  email,
  password: z.string('Enter your password').min(1, 'Enter your password').max(200),
});

export const productSchema = z.object({
  sku: text(2, 32, 'Enter a SKU of up to 32 characters').toUpperCase(),
  name: text(2, 100, 'Enter a product name'),
  category: z.enum(['water', 'soda'], 'Choose water or soda'),
  volumeMl: count(100_000).min(1, 'Enter the volume in ml'),
  unitsPerCase: count(1000).min(1, 'Enter units per case'),
  casePrice: count(100_000_000).min(1, 'Enter a case price'),
  stock: count(10_000_000),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || /^(https:\/\/|\/)/.test(value), 'Use an https:// or site-relative URL')
    .default(''),
  color: z
    .string()
    .trim()
    .refine((value) => value === '' || HEX_COLOR.test(value), 'Use a hex colour like #16b8f3')
    .default(''),
  isActive: z.boolean(),
  comingSoon: z.boolean(),
});

export const statusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'], 'Choose a valid status'),
});

export const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'refunded'], 'Choose a valid payment status'),
});

export const couponSchema = z
  .object({
    code: z.string('Enter a code').trim().toUpperCase().regex(COUPON_CODE, 'Use 3–32 letters, numbers, - or _'),
    kind: z.enum(['percent', 'flat'], 'Choose a percentage or a fixed amount'),
    value: z.number('Enter the discount').int().min(1, 'Enter the discount').max(100_000_000),
    minSubtotal: count(1_000_000_000),
    maxUses: z.number().int().min(1, 'Allow at least one use').max(1_000_000).nullable(),
    expiresOn: z.iso.date('Enter a valid date').nullable(),
    isActive: z.boolean(),
  })
  .refine((coupon) => coupon.kind === 'flat' || coupon.value <= 10_000, {
    message: 'A percentage can be at most 100%',
    path: ['value'],
  });

// The landing page copy. The process always has four steps, one for each of its icons.
export const contentSchema = z.object({
  headline: copy(80),
  intro: copy(200),
  hero: z.object({
    ribbon: copy(40),
    title: copy(60),
    size: copy(20),
    facts: z.array(copy(60)).min(1).max(4),
  }),
  source: z.object({ title: copy(80), text: copy(400) }),
  balance: z.object({ title: copy(80), text: copy(400) }),
  minerals: z
    .array(z.object({ label: copy(20), value: copy(10), unit: z.string().trim().max(10).default('') }))
    .min(1)
    .max(6),
  seal: z.object({ title: copy(80), text: copy(400) }),
  process: z.object({
    title: copy(80),
    steps: z.array(z.object({ title: copy(40), text: copy(200) })).length(4),
  }),
  cta: z.object({ word: copy(16), text: copy(200) }),
  marquee: z.array(copy(30)).min(2).max(8),
  soda: z.object({ title: copy(40), text: copy(300) }),
});

export const settingsSchema = z
  .object({
    contactEmail: email,
    contactPhone: text(5, 30, 'Enter a contact phone number'),
    whatsapp: z
      .string()
      .transform((value) => value.replace(/[\s-]/g, ''))
      .refine(
        (value) => value === '' || WHATSAPP.test(value),
        'Enter the number with its country code, like +919876543210',
      )
      .default(''),
    announcement: z.string().trim().max(200, 'Keep the announcement under 200 characters'),
    deliveryFee: count(10_000_000),
    freeDeliveryFrom: count(1_000_000_000),
    deliveryNote: z.string().trim().max(160, 'Keep the delivery note under 160 characters'),
    codEnabled: z.boolean(),
    onlineEnabled: z.boolean(),
    tiers: z
      .array(
        z.object({
          minCases: z.number().int().min(1).max(10_000),
          discountBps: z.number().int().min(1).max(9000),
        }),
      )
      .max(10, 'Use at most 10 tiers')
      .refine(
        (tiers) => new Set(tiers.map((tier) => tier.minCases)).size === tiers.length,
        'Each tier needs a different case count',
      ),
  })
  .refine((settings) => settings.codEnabled || settings.onlineEnabled, {
    message: 'Keep at least one way to pay',
    path: ['codEnabled'],
  });

export function parse(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const { formErrors, fieldErrors } = z.flattenError(result.error);
  const fields = Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [field, messages[0]]),
  );
  throw new HttpError(422, formErrors[0] ?? 'Please correct the highlighted fields', { fields });
}
