import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { resolveGuardRedirect } from '@/domain/session';
import { OfflineBanner, defaultNetworkMonitor } from '@/presentation/components/OfflineBanner';
import { SessionLoading } from '@/presentation/session/session-loading';
import { useSession } from '@/presentation/session/session-context';

// Pila autenticada: sin sesión se redirige a (auth) y mientras se restaura se muestra la carga.
export default function AppLayout() {
  const { status } = useSession();
  if (status === 'loading') return <SessionLoading />;
  const redirect = resolveGuardRedirect(status, '(app)');
  if (redirect) return <Redirect href={redirect} />;
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner monitor={defaultNetworkMonitor} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
