import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { adminRouter } from './admin.js';
import { clientRouter } from './client.js';
import { config } from './config.js';
import { errorHandler, notFound } from './errors.js';
import { router } from './routes.js';
import { razorpayWebhook } from './webhooks.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  // The same policy nginx sets in the Docker Compose setup (nginx/security-headers.conf), so the website works when
  // the API serves it: the 3D decoders need WebAssembly and blob workers (and the KTX2 texture transcoder, an
  // Emscripten build, creates functions from strings, hence 'unsafe-eval'), and Razorpay's checkout its script,
  // frames and popups.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", "'wasm-unsafe-eval'", "'unsafe-eval'", 'https://checkout.razorpay.com'],
          'worker-src': ["'self'", 'blob:'],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'connect-src': ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          'frame-src': ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
          'form-action': ["'self'"],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(cors({ origin: config.corsOrigins }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      message: { error: 'Too many requests, please slow down' },
    }),
  );
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '256kb' }), razorpayWebhook);
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/admin', adminRouter);
  app.use('/api', router);
  if (config.clientDir) app.use(clientRouter(config.clientDir));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
