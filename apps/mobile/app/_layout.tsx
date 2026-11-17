import { Slot } from 'expo-router';
import { clearLocalCache } from '@/infrastructure/cache/local-cache';
import { api } from '@/infrastructure/http/api';
import { secureTokenStorage } from '@/infrastructure/secure-store/token-storage';
import { SessionProvider } from '@/presentation/session/session-context';

// Raíz de composición: aquí se conectan las implementaciones de infraestructura con la sesión.
export default function RootLayout() {
  return (
    <SessionProvider storage={secureTokenStorage} api={api} clearCache={clearLocalCache}>
      <Slot />
    </SessionProvider>
  );
}
