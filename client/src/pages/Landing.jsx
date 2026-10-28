import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import CapOpen from '../components/story/CapOpen.jsx';
import Hero from '../components/story/Hero.jsx';
import Loader from '../components/story/Loader.jsx';
import OrderCta from '../components/story/OrderCta.jsx';
import Pour from '../components/story/Pour.jsx';
import Process from '../components/story/Process.jsx';
import Products from '../components/story/Products.jsx';
import Source from '../components/story/Source.jsx';
import styles from '../components/story/Story.module.css';
import { useScrollRefresh } from '../components/story/useStoryProgress.js';
import { useContent } from '../state/catalog.jsx';

const StoryCanvas = lazy(() => import('../components/story/StoryCanvas.jsx'));
// The loader never holds the page longer than this; the scene then appears whenever it is ready.
const LOADER_TIMEOUT = 12_000;

export default function Landing() {
  const storyRef = useRef(null);
  const { hero, cta } = useContent();
  const [load, setLoad] = useState({ progress: 0, status: 'loading' });
  useScrollRefresh(storyRef);

  useEffect(() => {
    const timer = setTimeout(() => setLoad((current) => ({ ...current, status: current.status === 'loading' ? 'slow' : current.status })), LOADER_TIMEOUT);
    return () => clearTimeout(timer);
  }, []);

  const ready = load.status !== 'loading';

  return (
    <div ref={storyRef} className={styles.story} data-webgl={load.status === 'ready' ? 'on' : 'off'}>
      <Suspense fallback={null}>
        <StoryCanvas
          story={storyRef}
          words={{ hero: hero.word, cta: cta.word }}
          onProgress={(progress) => setLoad((current) => ({ ...current, progress }))}
          onReady={(ok) => setLoad((current) => ({ ...current, status: ok ? 'ready' : 'failed' }))}
        />
      </Suspense>
      <Loader progress={load.progress} done={ready} />
      <Hero ready={ready} />
      <Source />
      <Pour />
      <CapOpen />
      <Process />
      <Products />
      <OrderCta />
    </div>
  );
}
