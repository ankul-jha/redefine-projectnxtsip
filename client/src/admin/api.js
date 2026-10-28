import { request } from '../lib/api.js';

export const adminApi = {
  me: () => request('/admin/me'),
  login: (credentials) => request('/admin/login', { method: 'POST', body: credentials }),
  logout: () => request('/admin/logout', { method: 'POST' }),
  summary: () => request('/admin/summary'),
  orders: ({ status = '', q = '' } = {}) => request(`/admin/orders?${new URLSearchParams({ status, q })}`),
  order: (reference) => request(`/admin/orders/${encodeURIComponent(reference)}`),
  setOrderStatus: (reference, status) =>
    request(`/admin/orders/${encodeURIComponent(reference)}`, { method: 'PATCH', body: { status } }),
  setPaymentStatus: (reference, paymentStatus) =>
    request(`/admin/orders/${encodeURIComponent(reference)}/payment`, {
      method: 'PATCH',
      body: { paymentStatus },
    }),
  products: () => request('/admin/products'),
  createProduct: (product) => request('/admin/products', { method: 'POST', body: product }),
  updateProduct: (id, product) => request(`/admin/products/${id}`, { method: 'PUT', body: product }),
  customers: () => request('/admin/customers'),
  waitlist: () => request('/admin/waitlist'),
  settings: () => request('/admin/settings'),
  saveSettings: (settings) => request('/admin/settings', { method: 'PUT', body: settings }),
  content: () => request('/admin/content'),
  saveContent: (content) => request('/admin/content', { method: 'PUT', body: content }),
  coupons: () => request('/admin/coupons'),
  createCoupon: (coupon) => request('/admin/coupons', { method: 'POST', body: coupon }),
  updateCoupon: (code, coupon) =>
    request(`/admin/coupons/${encodeURIComponent(code)}`, { method: 'PUT', body: coupon }),
  deleteCoupon: (code) => request(`/admin/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' }),
  uploadImage: (file) => request('/admin/images', { method: 'POST', file }),
};

// The statuses the team sets. New online orders start as 'awaiting_payment' until they are paid.
export const ORDER_STATUSES = ['placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];
export const statusLabel = (status) => status.replace('_', ' ');

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (value) => dateTime.format(new Date(value));
