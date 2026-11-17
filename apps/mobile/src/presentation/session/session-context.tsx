import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SessionStatus } from '@/domain/session';

interface SessionContextValue {
  status: SessionStatus;
  signIn: () => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Esqueleto: LM-45 y LM-48 conectan este estado con SecureStore y la restauración de sesión.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('unauthenticated');
  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      signIn: () => setStatus('authenticated'),
      signOut: () => setStatus('unauthenticated'),
    }),
    [status],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
