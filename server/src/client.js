import { join } from 'node:path';
import compression from 'compression';
import express, { Router } from 'express';

const DAY = 24 * 60 * 60;


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
