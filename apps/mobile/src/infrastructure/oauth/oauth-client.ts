import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { SignInResult } from '../../application/sign-in';
import { API_URL } from '../config/env';

// Cierra la ventana del navegador cuando la redirección vuelve a la app (necesario en la web y en iOS).
WebBrowser.maybeCompleteAuthSession();

export const OAUTH_CLIENT_ID = 'lifesync-mobile';

const discovery = {
  authorizationEndpoint: `${API_URL}/oauth/authorize`,
  tokenEndpoint: `${API_URL}/oauth/token`,
};

/**
 * Authorization Code + PKCE (S256) en el navegador del sistema: la app genera el `code_verifier`,
 * el `code_challenge` y el `state`, y nunca ve la contraseña del paciente.
 */
export async function signInWithBrowser(): Promise<SignInResult> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'lifesync', path: 'oauth/callback' });
  const request = new AuthSession.AuthRequest({
    clientId: OAUTH_CLIENT_ID,
    redirectUri,
    scopes: [],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    return { status: 'cancelled' };
  }
  if (result.type === 'error') {
    return { status: result.error?.code === 'state_mismatch' ? 'state_mismatch' : 'rejected' };
  }
  if (result.type !== 'success') return { status: 'rejected' };

  // Doble verificación del `state`: se descarta cualquier resultado que no coincida.
  if (result.params.state !== request.state || !result.params.code) {
    return { status: 'state_mismatch' };
  }

  try {
    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId: OAUTH_CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      discovery,
    );
    if (!token.accessToken || !token.refreshToken) return { status: 'rejected' };
    return {
      status: 'signed_in',
      tokens: { accessToken: token.accessToken, refreshToken: token.refreshToken },
    };
  } catch (error) {
    return { status: error instanceof AuthSession.TokenError ? 'rejected' : 'unreachable' };
  }
}
