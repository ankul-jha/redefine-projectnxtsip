import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../brand.js';
import { CanScene } from './canScene.js';
import styles from './Soda.module.css';

export default function CanCanvas({ color, flavour, reducedMotion }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const initial = useRef({ color, flavour });

  useEffect(() => {
    const container = containerRef.current;
    let scene;
    try {
      scene = new CanScene(container, {
        brand: BRAND,
        ...initial.current,
        font: getComputedStyle(document.documentElement).getPropertyValue('--font-sans'),
        reducedMotion,
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    sceneRef.current = scene;

    const resizeObserver = new ResizeObserver(([entry]) => {
      scene.resize(entry.contentRect.width, entry.contentRect.height);
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      scene.setActive(entry.isIntersecting);
    });
    resizeObserver.observe(container);
    visibilityObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    sceneRef.current?.setFlavour(color, flavour);
  }, [color, flavour]);

  if (failed) return null;
  return <div ref={containerRef} className={styles.canvas} aria-hidden="true" />;
}
