import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'folio_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || '';
}

function signature(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function sameValue(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || '')
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        return index < 0
          ? [part, '']
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export function authConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

export function passwordMatches(candidate) {
  return authConfigured() && sameValue(candidate || '', process.env.ADMIN_PASSWORD);
}

export function createSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString('base64url');
  const token = `${payload}.${signature(payload)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(request) {
  if (!authConfigured()) return false;
  const token = cookies(request)[COOKIE_NAME];
  if (!token) return false;
  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature || !sameValue(signature(payload), providedSignature)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(session.expiresAt) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requireAdmin(request, response) {
  if (isAdmin(request)) return true;
  response.statusCode = 401;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify({ error: 'Session expirée. Reconnectez-vous.' }));
  return false;
}
