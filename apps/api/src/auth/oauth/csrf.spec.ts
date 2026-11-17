import { csrfMatches, newCsrfToken, readCookie } from './csrf.js';

describe('CSRF de doble envío', () => {
  it('genera tokens distintos y no triviales', () => {
    const a = newCsrfToken();
    expect(a).toHaveLength(43);
    expect(a).not.toBe(newCsrfToken());
  });

  it('lee la cookie por nombre entre varias', () => {
    expect(readCookie('a=1; oauth_csrf=abc=def; b=2', 'oauth_csrf')).toBe('abc=def');
    expect(readCookie(undefined, 'oauth_csrf')).toBeUndefined();
    expect(readCookie('a=1', 'oauth_csrf')).toBeUndefined();
  });

  it('acepta solo cuando cookie y campo coinciden', () => {
    expect(csrfMatches('token', 'token')).toBe(true);
    expect(csrfMatches('token', 'otro')).toBe(false);
    expect(csrfMatches('token', 'token-largo')).toBe(false);
  });

  it('rechaza cookie ausente o campo que no es texto', () => {
    expect(csrfMatches(undefined, 'token')).toBe(false);
    expect(csrfMatches('token', undefined)).toBe(false);
    expect(csrfMatches('token', ['token'])).toBe(false);
  });
});
