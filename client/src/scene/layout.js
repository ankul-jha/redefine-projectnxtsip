// Layout values shared by the WebGL scene and the page. Kept free of three.js so the page can import them.

// Phones, tablets and portrait windows: the bottle sits higher and the copy runs along the bottom. Phones held
// sideways are too short for that, so they keep the wide layout (bottle in the middle, copy beside it), tightened
// (SHORT_QUERY). Story.module.css uses the same media queries.
export const COMPACT_QUERY = '(max-width: 999px) and (min-height: 521px), (max-aspect-ratio: 1/1)';
export const SHORT_QUERY = '(orientation: landscape) and (max-height: 520px)';

// The most pieces a poster's word moves in: one per letter, or for longer words a few letters each.
export const MAX_LETTERS = 12;

// The product lineup: where the bottles stand (share of the frame height from the top), the room kept free above
// them for the header and the section title and below them for the size cards and the wholesale row (which short
// screens leave out), and the widest spacing between them (all CSS pixels).
export const LINEUP = {
  baseline: { wide: 0.6, compact: 0.54 },
  above: { wide: 250, short: 170 },
  below: { wide: 320, short: 150 },
  maxSpacing: 400,
};
