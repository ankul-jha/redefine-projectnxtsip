import { telLink } from '../lib/format.js';
import { useCatalog } from '../state/catalog.jsx';

// Dials the store's orders phone (Admin → Settings). Renders nothing until a number is set.
export default function CallButton({ className = 'button', children = 'Call now' }) {
  const { contactPhone } = useCatalog().site;
  if (!contactPhone) return null;
  return (
    <a className={className} href={telLink(contactPhone)} aria-label={`${children}: ${contactPhone}`}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M5 3.5h3.5l1.8 4.6-2.3 1.5a11 11 0 0 0 6.4 6.4l1.5-2.3 4.6 1.8V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2Z"
        />
      </svg>
      {children}
    </a>
  );
}
