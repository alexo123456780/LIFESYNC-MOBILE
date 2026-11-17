import type { SessionTokens } from '../domain/session';

/** Puerto del almacén de tokens: la implementación vive en infraestructura (SecureStore). */
export interface TokenStorage {
  save(tokens: SessionTokens): Promise<void>;
  load(): Promise<SessionTokens | null>;
  clear(): Promise<void>;
}
