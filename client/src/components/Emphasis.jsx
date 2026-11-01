// Page copy marks the accent word of a title with asterisks, "Pure *water*", shown in the headline serif (base.css).
const ACCENT = /\*([^*]+)\*/;

export default function Emphasis({ text }) {
  return text.split(ACCENT).map((part, index) => (index % 2 ? <em key={index}>{part}</em> : part));
}

// The same text without the marks, for labels and the page title.
export const plain = (text) => text.replaceAll('*', '');
