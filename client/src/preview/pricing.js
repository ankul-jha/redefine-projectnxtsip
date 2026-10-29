// The API's pricing rules (server/src/pricing.js and coupons.js), for the preview, which has no API to ask.

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  trailingZeroDisplay: 'stripIfInteger',
});

const couponAmount = (coupon, amount) =>
  coupon.kind === 'percent' ? Math.round((amount * coupon.value) / 10_000) : Math.min(coupon.value, amount);

// Prices an order in paise: the wholesale tier first, then the coupon on what is left, then delivery.
export function priceOrder(lines, { tiers, coupon = null, delivery = { fee: 0, freeFrom: 0 } }) {
  const cases = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.casePrice * line.quantity, 0);
  const discountBps = tiers.findLast((tier) => cases >= tier.minCases)?.discountBps ?? 0;
  const discount = Math.round((subtotal * discountBps) / 10_000);
  const couponDiscount = coupon ? couponAmount(coupon, subtotal - discount) : 0;
  const goods = subtotal - discount - couponDiscount;
  const deliveryFee = delivery.freeFrom > 0 && goods >= delivery.freeFrom ? 0 : delivery.fee;

  return {
    cases,
    subtotal,
    discountBps,
    discount,
    couponCode: coupon?.code ?? null,
    couponDiscount,
    deliveryFee,
    total: goods + deliveryFee,
  };
}

// Why an order of `goods` paise (after the wholesale discount) cannot use a coupon, or null if it can.
export function couponProblem(coupon, goods) {
  if (!coupon?.isActive) return 'This code is not valid';
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 'This code has expired';
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return 'This code has been fully used';
  if (goods < coupon.minSubtotal) return `Spend ${rupees.format(coupon.minSubtotal / 100)} to use this code`;
  return null;
}
