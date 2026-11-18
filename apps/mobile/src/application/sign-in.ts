import type { SessionTokens } from '../domain/session';
import { NetworkError } from './errors';

export type SignInResult =
  | { status: 'signed_in'; tokens: SessionTokens }
  | { status: 'cancelled' }
  | { status: 'state_mismatch' }
  | { status: 'rejected' }
  | { status: 'unreachable' };

export type SignInPhase = 'connecting' | 'opening';

export interface SignInDeps {
  /** Despierta y comprueba el servidor (en Render gratuito puede tardar hasta un minuto). */
  checkServer: () => Promise<unknown>;
  /** Abre el navegador del sistema y completa el flujo Authorization Code + PKCE. */
  openBrowser: () => Promise<SignInResult>;
}

/**
 * Inicia sesión: primero comprueba que el servidor responda (sin red se avisa sin abrir el
 * navegador) y después delega el flujo OAuth, para que la app nunca maneje la contraseña.
 */
export async function signIn(
  deps: SignInDeps,
  onPhase: (phase: SignInPhase) => void = () => {},
): Promise<SignInResult> {
  onPhase('connecting');
  try {
    await deps.checkServer();
  } catch (error) {
    if (error instanceof NetworkError) return { status: 'unreachable' };
    // Una respuesta HTTP de error significa que el servidor está vivo: se continúa con el login.
  }

  onPhase('opening');
  try {
    return await deps.openBrowser();
  } catch {
    return { status: 'rejected' };
  }
}
