// Layout values shared by the WebGL scene and the page. Kept free of three.js so the page can import them.

// Phones, tablets and portrait windows: the bottle sits higher and the copy runs along the bottom.
// Story.module.css uses the same media query.
export const COMPACT_QUERY = '(max-width: 999px), (max-aspect-ratio: 1/1)';

// The product lineup: where the bottles stand (share of the frame height from the top), the room kept free above
// them for the header and the section title and below them for the size cards and the wholesale row, and the widest
// spacing between them (all CSS pixels).
export const LINEUP = { baseline: { wide: 0.6, compact: 0.54 }, above: 250, below: 320, maxSpacing: 400 };
