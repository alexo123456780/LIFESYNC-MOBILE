// Dominio puro: no importa Expo, React ni React Native.
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export type AuthGroup = '(auth)' | '(app)';

/** Ruta a la que hay que redirigir según la sesión y la pila actual; null si la pila es correcta. */
export function resolveGuardRedirect(status: SessionStatus, group: AuthGroup): string | null {
  if (status === 'loading') return null;
  if (status === 'unauthenticated' && group === '(app)') return '/welcome';
  if (status === 'authenticated' && group === '(auth)') return '/';
  return null;
}
