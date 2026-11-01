import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { BRAND } from '../brand.js';
import CapOpen from '../components/story/CapOpen.jsx';
import Hero from '../components/story/Hero.jsx';
import Loader from '../components/story/Loader.jsx';
import Minerals from '../components/story/Minerals.jsx';
import OrderCta from '../components/story/OrderCta.jsx';
import Process from '../components/story/Process.jsx';
import Products from '../components/story/Products.jsx';
import Source from '../components/story/Source.jsx';
import styles from '../components/story/Story.module.css';
import StructuredData from '../components/StructuredData.jsx';
import { usePageMeta } from '../lib/usePageMeta.js';
import { ASSETS, CORE_ASSETS } from '../scene/files.js';
import { useCatalog, useContent } from '../state/catalog.jsx';

const StoryCanvas = lazy(() => import('../components/story/StoryCanvas.jsx'));
// The loader never holds the page longer than this; the scene then appears whenever it is ready.
const LOADER_TIMEOUT = 12_000;

// Who sells here, for search engines.
function organization({ contactEmail, contactPhone }) {
  const absolute = (path) => new URL(path, window.location.origin).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    slogan: BRAND.tagline,
    url: absolute(import.meta.env.BASE_URL),
    logo: absolute(BRAND.logo.full),
    ...(contactEmail && { email: contactEmail }),
    ...(contactPhone && { telephone: contactPhone }),
  };
}

export default function Landing() {
  // The first frame's files start downloading now, alongside the scene's code, not once it has arrived. The loaders
  // fetch them the same way (CORS, same-origin credentials), so they reuse these responses.
  for (const key of CORE_ASSETS) preload(ASSETS[key], { as: 'fetch', crossOrigin: 'anonymous' });
  const storyRef = useRef(null);
  const { hero, cta } = useContent();
  const { site } = useCatalog();
  usePageMeta({});
  const [load, setLoad] = useState({ progress: 0, status: 'loading' });

  useEffect(() => {
    const timer = setTimeout(() => setLoad((current) => ({ ...current, status: current.status === 'loading' ? 'slow' : current.status })), LOADER_TIMEOUT);
    return () => clearTimeout(timer);
  }, []);

  const ready = load.status !== 'loading';

  return (
    <div ref={storyRef} className={styles.story} data-webgl={load.status === 'ready' ? 'on' : 'off'}>
      <StructuredData data={organization(site)} />
      <Suspense fallback={null}>
        <StoryCanvas
          story={storyRef}
          words={{ ribbon: hero.ribbon, cta: cta.word }}
          onProgress={(progress) => setLoad((current) => ({ ...current, progress }))}
          onReady={(ok) => setLoad((current) => ({ ...current, status: ok ? 'ready' : 'failed' }))}
        />
      </Suspense>
      <Loader progress={load.progress} done={ready} />
      <Hero ready={ready} />
      <Source />
      <Minerals />
      <CapOpen />
      <Process />
      <Products />
      <OrderCta />
    </div>
  );
}
