import { challengeFromVerifier, verifyPkce } from './pkce.js';

// Vector de prueba del apéndice B de la RFC 7636.
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('PKCE S256', () => {
  it('deriva el code_challenge del vector de la RFC 7636', () => {
    expect(challengeFromVerifier(verifier)).toBe(challenge);
  });

  it('acepta el code_verifier correcto', () => {
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it('rechaza un code_verifier distinto', () => {
    expect(verifyPkce(`${verifier.slice(0, -1)}A`, challenge)).toBe(false);
  });

  it.each(['', 'corto', 'x'.repeat(129), `${verifier}!`])(
    'rechaza un code_verifier con formato inválido (%s)',
    (invalido) => {
      expect(verifyPkce(invalido, challenge)).toBe(false);
    },
  );

  it('rechaza un code_challenge de otra longitud', () => {
    expect(verifyPkce(verifier, challenge.slice(1))).toBe(false);
  });
});
