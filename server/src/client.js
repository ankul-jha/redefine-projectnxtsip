import { join } from 'node:path';
import compression from 'compression';
import express, { Router } from 'express';

const DAY = 24 * 60 * 60;

// Serves the built website when the API runs as the whole site (the root Dockerfile, for one-service hosting),
// with the caching nginx applies in the Docker Compose setup: hashed bundles for a year, models, textures and
// photos for a day, and the page itself revalidated on every visit. Unknown paths outside /api get the page, for
// client-side routing. Everything that shrinks is compressed, including the studio lighting (.hdr) and models (.glb),
// which aren't text types.
export function clientRouter(dir) {
  const router = Router();
  router.use(compression({ filter: (req, res) => compression.filter(req, res) || /\.(hdr|glb)$/.test(req.path) }));
  router.use(
    express.static(dir, {
      index: false,
      setHeaders(res, path) {
        const cache = path.startsWith(join(dir, 'assets'))
          ? `public, max-age=${365 * DAY}, immutable`
          : `public, max-age=${DAY}`;
        res.set('Cache-Control', cache);
      },
    }),
  );
  router.get(/^(?!\/api\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache').sendFile(join(dir, 'index.html'));
  });
  return router;
}
