export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.expose = true;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.expose ? error.status : 500;
  if (status >= 500) console.error(error);

  res.status(status).json({
    error: error.expose ? error.message : 'Internal server error',
    details: error.expose ? error.details : undefined,
  });
}
