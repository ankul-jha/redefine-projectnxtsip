const env = process.env;

// A hop count ("1": trust the first proxy) or Express's list of trusted addresses.
const trustProxy = (value) => (/^\d+$/.test(value) ? Number(value) : value);

export const config = {
  port: Number(env.PORT ?? 4000),
  trustProxy: trustProxy(env.TRUST_PROXY ?? 'loopback, uniquelocal'),
  // Set in the one-service image (the root Dockerfile): the API also serves the built website from this folder.
  clientDir: env.CLIENT_DIR ?? '',
  corsOrigins: (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'brand',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'brand',
    connectionLimit: Number(env.DB_POOL_SIZE ?? 10),
  },
  admin: {
    secret: env.ADMIN_SECRET ?? '',
    secureCookie: env.COOKIE_SECURE === 'true',
    sessionHours: Number(env.ADMIN_SESSION_HOURS ?? 8),
  },
  // Online payments are offered only when both keys are set. Keys come from the Razorpay dashboard.
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID ?? '',
    keySecret: env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
  // Emails (order confirmations, the soda waitlist thank-you, new-order alerts) go out over SMTP when a host and a
  // sender are set. The site's public address builds the links and the logo in them.
  mail: {
    host: env.SMTP_HOST ?? '',
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === 'true' || env.SMTP_PORT === '465',
    user: env.SMTP_USER ?? '',
    pass: env.SMTP_PASS ?? '',
    from: env.MAIL_FROM ?? '',
  },
  siteUrl: (env.SITE_URL ?? '').replace(/\/$/, ''),
  // Online orders that are still unpaid after this long are cancelled and their stock released.
  unpaidOrderMinutes: Number(env.UNPAID_ORDER_MINUTES ?? 30),
};
