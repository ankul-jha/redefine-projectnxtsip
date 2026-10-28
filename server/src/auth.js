import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';
import { HttpError } from './errors.js';

const derive = promisify(scrypt);
const COOKIE = 'nxtsip_admin';
const COOKIE_PATH = '/api/admin';

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, 64);
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, key] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

const sign = (body) => createHmac('sha256', config.admin.secret).update(body).digest();

function createToken(admin) {
  const expires = Math.floor(Date.now() / 1000) + config.admin.sessionHours * 3600;
  const body = Buffer.from(JSON.stringify({ sub: admin.id, email: admin.email, name: admin.name, exp: expires })).toString('base64url');
  return `${body}.${sign(body).toString('base64url')}`;
}

function readToken(token) {
  const [body, signature] = token?.split('.') ?? [];
  if (!body || !signature) return null;
  const given = Buffer.from(signature, 'base64url');
  const expected = sign(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const pair = req.headers.cookie?.split(';').find((part) => part.trim().startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.trim().slice(name.length + 1)) : undefined;
}

export function startSession(res, admin) {
  res.cookie(COOKIE, createToken(admin), {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.admin.secureCookie,
    path: COOKIE_PATH,
    maxAge: config.admin.sessionHours * 3600 * 1000,
  });
}

export function endSession(res) {
  res.clearCookie(COOKIE, { path: COOKIE_PATH });
}

export function requireAdmin(req, res, next) {
  const session = readToken(readCookie(req, COOKIE));
  if (!session) throw new HttpError(401, 'Please sign in');
  req.admin = { id: session.sub, email: session.email, name: session.name };
  next();
}
