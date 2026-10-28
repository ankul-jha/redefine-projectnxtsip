import { useEffect, useState } from 'react';
import { useCart } from '../state/cart.jsx';
import { useCatalog } from '../state/catalog.jsx';
import { getQuote } from './api.js';

// The API's prices for the cart, with the coupon checked. Refreshes a moment after the cart or code changes; until
// it arrives (or if it fails) callers fall back to the local estimate.
function useQuote(lines, couponCode) {
  const [quote, setQuote] = useState(null);
  const key = JSON.stringify([lines.map((line) => [line.productId, line.quantity]), couponCode]);

  useEffect(() => {
    const [items, code] = JSON.parse(key);
    if (items.length === 0) return undefined;
    let current = true;
    const timer = setTimeout(() => {
      getQuote({ items: items.map(([productId, quantity]) => ({ productId, quantity })), couponCode: code }).then(
        (result) => current && setQuote({ key, ...result }),
        () => current && setQuote(null),
      );
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [key]);

  return quote?.key === key ? quote : null;
}

// The cart's totals for the cart and checkout pages: the API's quote when it has arrived, with the estimate's hints
// (the next wholesale tier, and how far the cart is from free delivery).
export function useCartTotals() {
  const { lines, totals, couponCode } = useCart();
  const { delivery } = useCatalog().site;
  const quote = useQuote(lines, couponCode);
  if (!quote) return { quote, totals };

  const goods = quote.subtotal - quote.discount - quote.couponDiscount;
  return {
    quote,
    totals: {
      ...quote,
      nextTier: totals.nextTier,
      toFreeDelivery: delivery.freeFrom > 0 && quote.deliveryFee > 0 ? delivery.freeFrom - goods : 0,
    },
  };
}
