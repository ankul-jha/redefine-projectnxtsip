export async function loadTiers(db) {
  const [tiers] = await db.query(
    'SELECT min_cases AS minCases, discount_bps AS discountBps FROM price_tiers ORDER BY min_cases',
  );
  return tiers;
}

const couponAmount = (coupon, amount) =>
  coupon.kind === 'percent' ? Math.round((amount * coupon.value) / 10_000) : Math.min(coupon.value, amount);

// Prices an order in paise. The wholesale tier comes first, then the coupon on what is left; delivery is free once
// the goods reach `delivery.freeFrom` (0 means it is always charged).
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
