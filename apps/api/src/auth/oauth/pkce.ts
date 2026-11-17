import { createHash, timingSafeEqual } from 'node:crypto';

/** SHA-256 en base64url sin relleno: siempre 43 caracteres. */
export const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** RFC 7636: entre 43 y 128 caracteres no reservados. */
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export function challengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Comprueba el code_verifier contra el code_challenge S256 en tiempo constante. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!CODE_VERIFIER_PATTERN.test(verifier)) return false;
  const expected = Buffer.from(challengeFromVerifier(verifier));
  const received = Buffer.from(challenge);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
