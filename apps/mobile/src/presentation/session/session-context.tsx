import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ApiPort } from '@/application/errors';
import { restoreSession } from '@/application/restore-session';
import { type SignOutResult, signOut as signOutUseCase } from '@/application/sign-out';
import type { TokenStorage } from '@/application/token-storage';
import type { SessionStatus, SessionTokens } from '@/domain/session';

interface SessionContextValue {
  status: SessionStatus;
  tokens: SessionTokens | null;
  /** Guarda los tokens en el almacén seguro y abre la sesión. */
  signIn: (tokens: SessionTokens) => Promise<void>;
  /** Revoca el refresh token, borra SecureStore y la caché, y cierra la sesión aunque no haya red. */
  signOut: () => Promise<SignOutResult>;
}

interface SessionProviderProps {
  storage: TokenStorage;
  api: ApiPort;
  clearCache: () => Promise<void>;
  children: ReactNode;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ storage, api, clearCache, children }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [tokens, setTokens] = useState<SessionTokens | null>(null);

  // Al abrir la app se restaura la sesión guardada; sin tokens se abre la pila (auth).
  useEffect(() => {
    let active = true;
    void restoreSession(storage).then((restored) => {
      if (!active) return;
      setTokens(restored);
      setStatus(restored ? 'authenticated' : 'unauthenticated');
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const signIn = useCallback(
    async (next: SessionTokens) => {
      await storage.save(next);
      setTokens(next);
      setStatus('authenticated');
    },
    [storage],
  );

  const signOut = useCallback(async () => {
    const result = await signOutUseCase({ api, storage, clearCache }, tokens);
    setTokens(null);
    setStatus('unauthenticated');
    return result;
  }, [api, clearCache, storage, tokens]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, tokens, signIn, signOut }),
    [status, tokens, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
