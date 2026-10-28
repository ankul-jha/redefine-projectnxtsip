const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Sends JSON `body`, or a `file` as it is (for image uploads).
export async function request(path, { method = 'GET', body, file } = {}) {
  const type = body ? 'application/json' : file?.type;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: type ? { 'Content-Type': type } : undefined,
    body: body ? JSON.stringify(body) : file,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'Something went wrong', data?.details);
  }
  return data;
}

export const getCatalog = () => request('/products');
export const getSite = () => request('/site');
export const getQuote = (cart) => request('/quote', { method: 'POST', body: cart });
export const createOrder = (order) => request('/orders', { method: 'POST', body: order });
export const getOrder = (reference) => request(`/orders/${encodeURIComponent(reference)}`);
export const confirmPayment = (reference, payment) =>
  request(`/orders/${encodeURIComponent(reference)}/payment`, { method: 'POST', body: payment });
export const joinWaitlist = (email) => request('/waitlist', { method: 'POST', body: { email } });
