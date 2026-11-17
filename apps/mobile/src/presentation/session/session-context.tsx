import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SessionStatus, SessionTokens } from '@/domain/session';

interface SessionContextValue {
  status: SessionStatus;
  /** Tokens de la sesión activa; LM-45 los guarda en SecureStore. */
  tokens: SessionTokens | null;
  signIn: (tokens: SessionTokens) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Esqueleto: LM-45 y LM-48 conectan este estado con SecureStore y la restauración de sesión.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('unauthenticated');
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      tokens,
      signIn: (next) => {
        setTokens(next);
        setStatus('authenticated');
      },
      signOut: () => {
        setTokens(null);
        setStatus('unauthenticated');
      },
    }),
    [status, tokens],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
