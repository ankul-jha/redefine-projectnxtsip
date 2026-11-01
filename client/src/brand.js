// Paths start from the site's base, which is / except in the GitHub Pages preview.
const BASE = import.meta.env.BASE_URL;

export const BRAND = {
  name: 'Nxtsip',
  tagline: 'Your Water Your Sip',
  logo: {
    full: `${BASE}brand/nxtsip-logo.webp`,
    wordmark: `${BASE}brand/nxtsip-wordmark.webp`,
    wordmarkOnDark: `${BASE}brand/nxtsip-wordmark-white.png`,
    drop: `${BASE}brand/nxtsip-drop.png`,
  },
};

export const DEFAULT_CONTENT = {
  headline: 'Pure. From the Source.',
  intro: 'Filtered slowly, sealed fresh and delivered by the case, for homes, offices and stores.',
  hero: {
    ribbon: 'Nxtsip · Your Water Your Sip',
    title: 'From the source.',
    size: '500 ml',
    facts: ['Purified drinking water', 'pH 7.4, balanced minerals', 'Tamper-evident seal'],
  },
  source: {
    title: 'Every sip begins at the source.',
    text: 'Rain and snowmelt filter slowly through layers of rock before they reach the spring. We draw the water there and keep it the way it arrives: cold, clear and quiet.',
  },
  balance: {
    title: 'Light, balanced, clean.',
    text: 'Enough calcium and magnesium for a soft, rounded taste, and nothing that lingers after the sip.',
  },
  minerals: [
    { label: 'pH', value: '7.4', unit: '' },
    { label: 'TDS', value: '120', unit: 'mg/L' },
    { label: 'Calcium', value: '24', unit: 'mg/L' },
    { label: 'Magnesium', value: '8', unit: 'mg/L' },
  ],
  seal: {
    title: 'Sealed until it’s yours.',
    text: 'Every cap carries a tamper-evident ring that breaks on the first twist, so you always open a fresh bottle.',
  },
  // Four steps, shown with the filter, membrane, minerals and light icons in that order.
  process: {
    title: 'Four steps from spring to sip.',
    steps: [
      { title: 'Sand & carbon', text: 'Layers of sand and activated carbon hold back silt, odour and chlorine.' },
      { title: 'Reverse osmosis', text: 'A fine membrane removes dissolved impurities.' },
      { title: 'Mineral balance', text: 'Calcium and magnesium go back in for a soft, rounded taste.' },
      { title: 'UV & ozone', text: 'Ultraviolet light and ozone keep the water safe until the cap goes on.' },
    ],
  },
  cta: {
    word: 'Sip & Drink',
    text: 'Cases for homes, offices and stores, delivered fresh.',
  },
  marquee: ['Pure water', 'Sparkling soda', 'Sealed at the source', 'Delivered by the case', 'Wholesale from 20 cases'],
  soda: {
    title: 'Coming soon.',
    text: 'Nxtsip Soda brings the same clean water to a crisp, sparkling can. Leave your email and be first to sip it.',
  },
};
