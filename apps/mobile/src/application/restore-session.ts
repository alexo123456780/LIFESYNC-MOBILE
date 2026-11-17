import type { SessionTokens } from '../domain/session';
import type { TokenStorage } from './token-storage';

/** Lee los tokens guardados. Si el almacén falla, se trata como sin sesión (nunca bloquea el arranque). */
export async function restoreSession(storage: TokenStorage): Promise<SessionTokens | null> {
  try {
    return await storage.load();
  } catch {
    return null;
  }
}
