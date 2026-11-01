import { useEffect } from 'react';
import { BRAND } from '../brand.js';

const SITE_TITLE = `${BRAND.name} | ${BRAND.tagline}`;

// Gives each page its own title and description. index.html holds the site's defaults, which link previews read (they
// do not run scripts); this updates them in place rather than adding a second copy. Pages that belong to one shopper,
// such as the cart or an order, pass `listed: false` so search engines leave them out.
export function usePageMeta({ title, description, listed = true }) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND.name}` : SITE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    const original = meta?.content;
    if (meta && description) meta.content = description;
    const robots = listed ? null : Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    if (robots) document.head.append(robots);
    return () => {
      if (meta) meta.content = original;
      robots?.remove();
    };
  }, [title, description, listed]);
}
