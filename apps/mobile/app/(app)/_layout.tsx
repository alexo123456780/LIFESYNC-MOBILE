import { Redirect, Stack } from 'expo-router';
import { resolveGuardRedirect } from '@/domain/session';
import { useSession } from '@/presentation/session/session-context';

// Pila autenticada: sin sesión se redirige a (auth). JOS completa la restauración en LM-48.
export default function AppLayout() {
  const { status } = useSession();
  const redirect = resolveGuardRedirect(status, '(app)');
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
