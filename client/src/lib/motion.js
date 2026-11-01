import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// The site's two curves, matching --ease-out and --ease-in-out in theme.css.
export const EASE = { out: 'expo.out', inOut: 'power3.inOut' };

// Splits a heading into lines, each behind its own mask, or into the words or letters within them (`unit` is
// 'lines', 'words' or 'chars'), so they can move into view from behind the masks. Returns the SplitText;
// `animate(pieces)` builds the tween (it is called again whenever the text re-wraps, on resize or font load).
export function splitText(element, unit, animate) {
  return SplitText.create(element, {
    type: unit === 'lines' ? 'lines' : `lines,${unit}`,
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit: (self) => animate(self[unit]),
  });
}

export { gsap, ScrollTrigger };
