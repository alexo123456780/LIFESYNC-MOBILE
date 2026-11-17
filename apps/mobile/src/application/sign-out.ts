import type { SessionTokens } from '../domain/session';
import type { ApiPort } from './errors';
import type { TokenStorage } from './token-storage';

export interface SignOutDeps {
  api: ApiPort;
  storage: TokenStorage;
  /** Borra la caché local (datos médicos descargados). */
  clearCache: () => Promise<void>;
}

export interface SignOutResult {
  /** El servidor confirmó la revocación del refresh token. */
  serverRevoked: boolean;
  /** SecureStore y la caché quedaron vacíos. */
  localCleared: boolean;
}

/**
 * Cierra la sesión de verdad: revoca el refresh token en el servidor y borra los datos locales.
 * Sin red el borrado local se completa igual: el teléfono nunca conserva la sesión por un fallo de red.
 */
export async function signOut(
  deps: SignOutDeps,
  tokens: SessionTokens | null,
): Promise<SignOutResult> {
  let serverRevoked = false;
  if (tokens) {
    try {
      await deps.api.post(
        '/auth/logout',
        { refresh_token: tokens.refreshToken },
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
      );
      serverRevoked = true;
    } catch {
      // Sin red, servidor dormido o token vencido: se sigue con el borrado local.
    }
  }

  const cleared = await Promise.allSettled([deps.storage.clear(), deps.clearCache()]);
  return {
    serverRevoked,
    localCleared: cleared.every((outcome) => outcome.status === 'fulfilled'),
  };
}
