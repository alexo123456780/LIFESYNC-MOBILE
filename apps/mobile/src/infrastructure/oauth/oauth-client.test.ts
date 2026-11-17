import * as AuthSession from 'expo-auth-session';
import { signInWithBrowser } from './oauth-client';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session', () => {
  class TokenError extends Error {}
  return {
    TokenError,
    makeRedirectUri: jest.fn(() => 'lifesync://oauth/callback'),
    AuthRequest: jest.fn(),
    exchangeCodeAsync: jest.fn(),
    ResponseType: { Code: 'code' },
    CodeChallengeMethod: { S256: 'S256' },
  };
});
jest.mock('../config/env', () => ({ API_URL: 'https://api.test/api/v1' }));

const AuthRequest = AuthSession.AuthRequest as unknown as jest.Mock;
const exchangeCodeAsync = AuthSession.exchangeCodeAsync as jest.Mock;
const discovery = {
  authorizationEndpoint: 'https://api.test/api/v1/oauth/authorize',
  tokenEndpoint: 'https://api.test/api/v1/oauth/token',
};

/** Simula la AuthRequest de la librería: el estado y el verificador los genera ella. */
const mockRequest = (promptResult: unknown) => {
  const promptAsync = jest.fn().mockResolvedValue(promptResult);
  AuthRequest.mockImplementation(() => ({
    state: 'estado-esperado',
    codeVerifier: 'verificador',
    promptAsync,
  }));
  return promptAsync;
};
const success = (params: Record<string, string>) => ({ type: 'success', params });

describe('signInWithBrowser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('configura Authorization Code + PKCE S256 con el redirect_uri de la app', async () => {
    const promptAsync = mockRequest({ type: 'cancel' });
    await signInWithBrowser();

    expect(AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'lifesync-mobile',
        redirectUri: 'lifesync://oauth/callback',
        responseType: 'code',
        usePKCE: true,
        codeChallengeMethod: 'S256',
      }),
    );
    expect(AuthSession.makeRedirectUri).toHaveBeenCalledWith({
      scheme: 'lifesync',
      path: 'oauth/callback',
    });
    expect(promptAsync).toHaveBeenCalledWith(discovery);
  });

  it('con code y state coincidentes canjea el código con el code_verifier y devuelve los tokens', async () => {
    mockRequest(success({ code: 'codigo', state: 'estado-esperado' }));
    exchangeCodeAsync.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    await expect(signInWithBrowser()).resolves.toEqual({
      status: 'signed_in',
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    });
    expect(exchangeCodeAsync).toHaveBeenCalledWith(
      {
        clientId: 'lifesync-mobile',
        code: 'codigo',
        redirectUri: 'lifesync://oauth/callback',
        extraParams: { code_verifier: 'verificador' },
      },
      discovery,
    );
  });

  it('un state distinto descarta el resultado: no canjea el código ni crea sesión', async () => {
    mockRequest(success({ code: 'codigo', state: 'otro-estado' }));
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'state_mismatch' });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('el error state_mismatch de la librería también se informa como tal', async () => {
    mockRequest({ type: 'error', error: { code: 'state_mismatch' }, params: {} });
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'state_mismatch' });
  });

  it('un error del servidor de autorización es un rechazo', async () => {
    mockRequest({ type: 'error', error: { code: 'access_denied' }, params: {} });
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'rejected' });
  });

  it.each(['cancel', 'dismiss', 'locked'])('%s: el usuario cierra el navegador', async (type) => {
    mockRequest({ type });
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'cancelled' });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('sin code en la redirección no hay sesión', async () => {
    mockRequest(success({ state: 'estado-esperado' }));
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'state_mismatch' });
  });

  it('si el servidor rechaza el canje (TokenError) no hay sesión', async () => {
    mockRequest(success({ code: 'codigo', state: 'estado-esperado' }));
    exchangeCodeAsync.mockRejectedValue(new AuthSession.TokenError({ error: 'invalid_grant' }));
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'rejected' });
  });

  it('si falla la red durante el canje se informa como sin conexión', async () => {
    mockRequest(success({ code: 'codigo', state: 'estado-esperado' }));
    exchangeCodeAsync.mockRejectedValue(new TypeError('Network request failed'));
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'unreachable' });
  });

  it('una respuesta sin refresh token no crea sesión', async () => {
    mockRequest(success({ code: 'codigo', state: 'estado-esperado' }));
    exchangeCodeAsync.mockResolvedValue({ accessToken: 'access' });
    await expect(signInWithBrowser()).resolves.toEqual({ status: 'rejected' });
  });
});
