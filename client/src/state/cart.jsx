import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { priceCart } from '../lib/pricing.js';
import { useCatalog } from './catalog.jsx';

const STORAGE_KEY = 'nxtsip:cart';
const COUPON_KEY = 'nxtsip:coupon';
const CartContext = createContext(null);

function loadCoupon() {
  try {
    return localStorage.getItem(COUPON_KEY) ?? '';
  } catch {
    return '';
  }
}

const isValidItem = (item) =>
  Number.isInteger(item?.productId) && Number.isInteger(item?.quantity) && item.quantity > 0;

function loadCart() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(items) ? items.filter(isValidItem) : [];
  } catch {
    return [];
  }
}

function cartReducer(items, action) {
  switch (action.type) {
    case 'add':
      return items.some((item) => item.productId === action.productId)
        ? items.map((item) =>
            item.productId === action.productId
              ? { ...item, quantity: item.quantity + action.quantity }
              : item,
          )
        : [...items, { productId: action.productId, quantity: action.quantity }];
    case 'set':
      return items.map((item) =>
        item.productId === action.productId ? { ...item, quantity: action.quantity } : item,
      );
    case 'remove':
      return items.filter((item) => item.productId !== action.productId);
    case 'replace':
      return action.items;
    case 'clear':
      return [];
    default:
      return items;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [couponCode, setCouponCode] = useState(loadCoupon);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Counts additions, so the header can acknowledge each one.
  const [added, setAdded] = useState(0);
  const { productById, tiers, site } = useCatalog();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(COUPON_KEY, couponCode);
    } catch {
      // Storage can be unavailable (private mode, quota); the cart still works in memory.
    }
  }, [items, couponCode]);

  useEffect(() => {
    const syncFromOtherTab = (event) => {
      if (event.key === STORAGE_KEY) dispatch({ type: 'replace', items: loadCart() });
    };
    window.addEventListener('storage', syncFromOtherTab);
    return () => window.removeEventListener('storage', syncFromOtherTab);
  }, []);

  const value = useMemo(() => {
    const lines = items.flatMap((item) => {
      const product = productById.get(item.productId);
      return product ? [{ ...item, product }] : [];
    });

    return {
      items,
      lines,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      totals: priceCart(lines, tiers, site.delivery),
      couponCode,
      setCouponCode,
      added,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      quantityOf: (productId) => items.find((item) => item.productId === productId)?.quantity ?? 0,
      add: (productId, quantity) => {
        dispatch({ type: 'add', productId, quantity });
        setAdded((count) => count + 1);
        setDrawerOpen(true);
      },
      setQuantity: (productId, quantity) => dispatch({ type: 'set', productId, quantity }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      clear: () => {
        dispatch({ type: 'clear' });
        setCouponCode('');
      },
    };
  }, [items, couponCode, added, productById, tiers, site.delivery, drawerOpen]);

  return <CartContext value={value}>{children}</CartContext>;
}

export const useCart = () => useContext(CartContext);
