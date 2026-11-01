import { useEffect, useEffectEvent, useRef } from 'react';
import { useReducedMotion } from '../../lib/useMediaQuery.js';
import { StoryScene } from '../../scene/StoryScene.js';
import styles from './Story.module.css';

// The copy each poster keeps clear of: the boxes of the [data-clear="hero"] and [data-clear="cta"] elements, in CSS
// pixels from the top left of their section's frame. Layout boxes, so entrances moving the copy don't shift them.
function measureClearance(story) {
  const clear = { hero: [], cta: [] };
  for (const element of story.querySelectorAll('[data-clear]')) {
    if (!element.offsetWidth) continue;
    const frame = element.closest('[data-frame]');
    let x = 0;
    let y = 0;
    for (let node = element; node && node !== frame; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    clear[element.dataset.clear].push({ x, y, width: element.offsetWidth, height: element.offsetHeight });
  }
  return clear;
}

// The pinned WebGL canvas behind the story (lazy-loaded with three.js). It runs while the story is on screen.
// `words` are the words printed on the hero's ribbon and the closing poster's word.
export default function StoryCanvas({ story, words, onProgress, onReady }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const reportProgress = useEffectEvent((value) => onProgress(value));
  const reportReady = useEffectEvent((ok) => onReady(ok));
  const currentWords = useEffectEvent(() => words);

  useEffect(() => {
    const container = containerRef.current;
    let scene;
    try {
      scene = new StoryScene(container, { reducedMotion });
    } catch {
      reportReady(false);
      return undefined;
    }
    scene.setWords(currentWords());
    sceneRef.current = scene;
    scene.load(reportProgress).then(
      () => !scene.disposed && reportReady(true),
      () => !scene.disposed && reportReady(false),
    );

    const measure = () => scene.setClearance(measureClearance(story.current));
    const resizeObserver = new ResizeObserver((entries) => {
      const canvas = entries.find((entry) => entry.target === container);
      if (canvas) scene.resize(canvas.contentRect.width, canvas.contentRect.height);
      measure();
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting));
    const onPointerMove = (event) => scene.setPointer(event.clientX, event.clientY);
    resizeObserver.observe(container);
    for (const element of story.current.querySelectorAll('[data-clear]')) resizeObserver.observe(element);
    visibilityObserver.observe(story.current);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.fonts.ready.then(() => !scene.disposed && measure());

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion, story]);

  useEffect(() => {
    sceneRef.current?.setWords({ ribbon: words.ribbon, cta: words.cta });
  }, [words.ribbon, words.cta]);

  return <div ref={containerRef} className={styles.canvas} aria-hidden="true" />;
}
