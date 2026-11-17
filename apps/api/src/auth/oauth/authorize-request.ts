import { CODE_CHALLENGE_PATTERN } from './pkce.js';

export const OAUTH_CLIENT_ID = 'lifesync-mobile';
const MAX_STATE_LENGTH = 512;

export interface AuthorizeParams {
  redirectUri: string;
  codeChallenge: string;
  state: string;
}

export type AuthorizeRequestResult =
  { ok: true; params: AuthorizeParams } | { ok: false; description: string };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Valida una petición de autorización PKCE. El redirect_uri se compara de forma exacta. */
export function parseAuthorizeRequest(
  input: Record<string, unknown>,
  allowedRedirectUris: readonly string[],
): AuthorizeRequestResult {
  const fail = (description: string): AuthorizeRequestResult => ({ ok: false, description });

  if (text(input.response_type) !== 'code') return fail('response_type debe ser "code"');
  if (text(input.client_id) !== OAUTH_CLIENT_ID) return fail('client_id desconocido');

  const redirectUri = text(input.redirect_uri);
  if (!allowedRedirectUris.includes(redirectUri)) return fail('redirect_uri no registrado');

  if (text(input.code_challenge_method) !== 'S256') {
    return fail('code_challenge_method debe ser "S256"');
  }
  const codeChallenge = text(input.code_challenge);
  if (!CODE_CHALLENGE_PATTERN.test(codeChallenge)) return fail('code_challenge inválido');

  const state = text(input.state);
  if (state === '' || state.length > MAX_STATE_LENGTH)
    return fail('state ausente o demasiado largo');

  return { ok: true, params: { redirectUri, codeChallenge, state } };
}
