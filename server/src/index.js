import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { expireUnpaidOrders } from './orders.js';

if (config.admin.secret.length < 32) {
  console.error('ADMIN_SECRET must be set to a random value of at least 32 characters');
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

const expiry = setInterval(() => expireUnpaidOrders().catch((error) => console.error(error)), 5 * 60_000);
expiry.unref();

// Outlive nginx's upstream keepalive so it never reuses a socket Node has closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal) {
  console.log(`${signal} received, draining connections`);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(() => pool.end().finally(() => process.exit(0)));
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
