import { parseAuthorizeRequest } from './authorize-request.js';

const allowed = ['lifesync://oauth/callback'];
const valid = {
  response_type: 'code',
  client_id: 'lifesync-mobile',
  redirect_uri: 'lifesync://oauth/callback',
  code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  code_challenge_method: 'S256',
  state: 'estado-aleatorio',
};

describe('parseAuthorizeRequest', () => {
  it('acepta una petición válida', () => {
    expect(parseAuthorizeRequest(valid, allowed)).toEqual({
      ok: true,
      params: {
        redirectUri: valid.redirect_uri,
        codeChallenge: valid.code_challenge,
        state: valid.state,
      },
    });
  });

  it.each([
    ['redirect_uri no registrado', { redirect_uri: 'https://evil.test/cb' }],
    [
      'redirect_uri con otra ruta (comparación exacta)',
      { redirect_uri: 'lifesync://oauth/callback/' },
    ],
    ['sin code_challenge', { code_challenge: undefined }],
    ['code_challenge con formato inválido', { code_challenge: 'corto' }],
    ['code_challenge_method plain', { code_challenge_method: 'plain' }],
    ['sin code_challenge_method', { code_challenge_method: undefined }],
    ['response_type distinto de code', { response_type: 'token' }],
    ['client_id desconocido', { client_id: 'otro' }],
    ['sin state', { state: undefined }],
    ['state vacío', { state: '' }],
    ['state demasiado largo', { state: 'x'.repeat(513) }],
    ['parámetro repetido (arreglo)', { state: ['a', 'b'] }],
  ])('rechaza: %s', (_nombre, cambio) => {
    expect(parseAuthorizeRequest({ ...valid, ...cambio }, allowed)).toMatchObject({ ok: false });
  });
});
