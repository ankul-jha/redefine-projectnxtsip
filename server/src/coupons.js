import { HttpError } from './errors.js';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  trailingZeroDisplay: 'stripIfInteger',
});

// The store's dates are Indian: a coupon set to expire on a day lasts until the end of that day in IST.
export const endOfDay = (date) => new Date(`${date}T23:59:59+05:30`);

function problemWith(coupon, goods) {
  if (!coupon?.isActive) return 'This code is not valid';
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return 'This code has expired';
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return 'This code has been fully used';
  if (goods < coupon.minSubtotal) return `Spend ${rupees.format(coupon.minSubtotal / 100)} to use this code`;
  return null;
}

// Finds a coupon that an order of `goods` paise (after the wholesale discount) can use, or explains why not.
// Placing an order locks the coupon, since it counts a use.
export async function findCoupon(db, code, goods, { lock = false } = {}) {
  const [[coupon]] = await db.query(
    `SELECT code, kind, value, min_subtotal AS minSubtotal, max_uses AS maxUses, used_count AS usedCount,
            expires_at AS expiresAt, is_active = 1 AS isActive
       FROM coupons
      WHERE code = ? ${lock ? 'FOR UPDATE' : ''}`,
    [code],
  );
  const problem = problemWith(coupon, goods);
  if (problem) throw new HttpError(422, problem, { fields: { couponCode: problem } });
  return coupon;
}
