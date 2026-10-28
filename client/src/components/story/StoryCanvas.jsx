import { useEffect, useEffectEvent, useRef } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion.js';
import { StoryScene } from '../../scene/StoryScene.js';
import styles from './Story.module.css';

// The pinned WebGL canvas behind the story (lazy-loaded with three.js). It runs while the story is on screen.
// `words` are the opening and closing posters' words.
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
    scene.setPosterWords(currentWords());
    sceneRef.current = scene;
    scene.load(reportProgress).then(
      () => !scene.disposed && reportReady(true),
      () => !scene.disposed && reportReady(false),
    );

    const resizeObserver = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height));
    const visibilityObserver = new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting));
    const onPointerMove = (event) => scene.setPointer(event.clientX, event.clientY);
    resizeObserver.observe(container);
    visibilityObserver.observe(story.current);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion, story]);

  useEffect(() => {
    sceneRef.current?.setPosterWords({ hero: words.hero, cta: words.cta });
  }, [words.hero, words.cta]);

  return <div ref={containerRef} className={styles.canvas} aria-hidden="true" />;
}
