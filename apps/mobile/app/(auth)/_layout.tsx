import { Redirect, Stack } from 'expo-router';
import { resolveGuardRedirect } from '@/domain/session';
import { SessionLoading } from '@/presentation/session/session-loading';
import { useSession } from '@/presentation/session/session-context';

// Pila NO autenticada: con sesión activa se redirige a (app) y mientras se restaura se muestra la carga.
export default function AuthLayout() {
  const { status } = useSession();
  if (status === 'loading') return <SessionLoading />;
  const redirect = resolveGuardRedirect(status, '(auth)');
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
