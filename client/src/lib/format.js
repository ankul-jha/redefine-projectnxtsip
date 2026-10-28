import { BRAND } from '../brand.js';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  trailingZeroDisplay: 'stripIfInteger',
});

export const formatMoney = (paise) => currency.format(paise / 100);

// Links that dial a phone number or open a WhatsApp chat with it, however the number is written.
export const telLink = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const whatsappLink = (phone) => `https://wa.me/${phone.replace(/\D/g, '')}`;

export const formatPercent = (bps) => `${bps / 100}%`;

export const formatVolume = (ml) => (ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`);

// What one price buys: a case, or a single bottle, jar or can.
export const formatUnit = (product) => {
  if (product.unitsPerCase > 1) return 'case';
  if (product.category === 'soda') return 'can';
  return product.volumeMl >= 10000 ? 'jar' : 'bottle';
};

export const formatCase = (product) =>
  product.unitsPerCase > 1
    ? `Case of ${product.unitsPerCase} × ${formatVolume(product.volumeMl)}`
    : `Single ${formatVolume(product.volumeMl)} unit`;

// "Nxtsip Soda Lime Mint" -> "Lime Mint"
export const formatFlavour = (product) => product.name.replace(new RegExp(`^${BRAND.name}\\s+soda\\s+`, 'i'), '');
