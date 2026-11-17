import { Redirect, Stack } from 'expo-router';
import { resolveGuardRedirect } from '@/domain/session';
import { SessionLoading } from '@/presentation/session/session-loading';
import { useSession } from '@/presentation/session/session-context';

// Pila autenticada: sin sesión se redirige a (auth) y mientras se restaura se muestra la carga.
export default function AppLayout() {
  const { status } = useSession();
  if (status === 'loading') return <SessionLoading />;
  const redirect = resolveGuardRedirect(status, '(app)');
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
