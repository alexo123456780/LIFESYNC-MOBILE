import { Redirect, Stack } from 'expo-router';
import { resolveGuardRedirect } from '@/domain/session';
import { useSession } from '@/presentation/session/session-context';

// Pila NO autenticada: con sesión activa se redirige a (app).
export default function AuthLayout() {
  const { status } = useSession();
  const redirect = resolveGuardRedirect(status, '(auth)');
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
