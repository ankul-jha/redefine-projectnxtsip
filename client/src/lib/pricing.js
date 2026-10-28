export const MAX_CASES_PER_LINE = 9999;
const LOW_STOCK_CASES = 50;

export function stockStatus(stock) {
  if (stock <= 0) return 'out';
  return stock < LOW_STOCK_CASES ? 'low' : 'in';
}

// An estimate for display while the cart changes; the API's quote (with any coupon) is what the order is charged.
// Mirrors priceOrder in the API: wholesale tier first, then delivery, free from `delivery.freeFrom`.
export function priceCart(lines, tiers, delivery) {
  const cases = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.casePrice * line.quantity, 0);
  const discountBps = tiers.findLast((tier) => cases >= tier.minCases)?.discountBps ?? 0;
  const discount = Math.round((subtotal * discountBps) / 10_000);
  const goods = subtotal - discount;
  const freeDelivery = delivery.freeFrom > 0 && goods >= delivery.freeFrom;
  const deliveryFee = cases === 0 || freeDelivery ? 0 : delivery.fee;
  const nextTier = tiers.find((tier) => tier.minCases > cases);

  return {
    cases,
    subtotal,
    discountBps,
    discount,
    couponCode: null,
    couponDiscount: 0,
    deliveryFee,
    total: goods + deliveryFee,
    nextTier,
    // How much more, in paise, unlocks free delivery (0 once it applies or if the store never offers it).
    toFreeDelivery: delivery.freeFrom > 0 && !freeDelivery ? delivery.freeFrom - goods : 0,
  };
}
