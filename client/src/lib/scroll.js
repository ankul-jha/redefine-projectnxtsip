import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import { gsap, ScrollTrigger } from './motion.js';

// Wheel and trackpad scrolling glides (Lenis), on GSAP's clock so ScrollTrigger reads the same position. Touch
// scrolling stays native, Lenis steps aside under prefers-reduced-motion, and it pauses whenever the page is locked
// with overflow: hidden (the cart drawer, the menu, the loader). Scrollable panels inside keep their own scroll.
export function useSmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    const lenis = new Lenis({ lerp: 0.11, autoToggle: true, allowNestedScroll: true, anchors: true, stopInertiaOnNavigate: true });
    const tick = (time) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
}

// Content changes the page's height (a catalog arriving, fonts, another page opening), so every scroll trigger
// measures its position again when the element `ref` holds resizes.
export function useScrollRefresh(ref) {
  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
}
