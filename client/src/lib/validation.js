const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(?:\+91|0)?[2-9]\d{9}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PIN = /^[1-9]\d{5}$/;

const length = (min, max) => (value) => value.length >= min && value.length <= max;

const RULES = {
  name: [length(2, 100), 'Enter your full name'],
  company: [length(0, 120), 'Company name is too long'],
  email: [(value) => value.length <= 254 && EMAIL.test(value), 'Enter a valid email address'],
  phone: [(value) => PHONE.test(value.replace(/[\s-]/g, '')), 'Enter a valid 10-digit phone number'],
  gstin: [(value) => value === '' || GSTIN.test(value.toUpperCase()), 'Enter a valid 15-character GSTIN'],
  address: [length(5, 255), 'Enter your full delivery address'],
  city: [length(2, 80), 'Enter your city'],
  pin: [(value) => PIN.test(value), 'Enter a valid 6-digit PIN code'],
};

export function validateField(name, value) {
  const [isValid, message] = RULES[name];
  return isValid(value.trim()) ? null : message;
}

export function validateCheckout(values) {
  return Object.fromEntries(
    Object.keys(RULES)
      .map((name) => [name, validateField(name, values[name])])
      .filter(([, message]) => message),
  );
}
