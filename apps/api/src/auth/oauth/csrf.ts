import { randomBytes, timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE = 'oauth_csrf';

export function newCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

/** Doble envío: el valor del campo del formulario debe coincidir con el de la cookie. */
export function csrfMatches(cookieValue: string | undefined, fieldValue: unknown): boolean {
  if (!cookieValue || typeof fieldValue !== 'string') return false;
  const cookie = Buffer.from(cookieValue);
  const field = Buffer.from(fieldValue);
  return cookie.length === field.length && timingSafeEqual(cookie, field);
}
