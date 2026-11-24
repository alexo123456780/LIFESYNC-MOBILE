import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { resolveGuardRedirect } from '@/domain/session';
import { OfflineBanner, defaultNetworkMonitor } from '@/presentation/components/OfflineBanner';
import { SessionLoading } from '@/presentation/session/session-loading';
import { useSession } from '@/presentation/session/session-context';
import { colors, fontWeight } from '@/presentation/theme';

const SCREEN_TITLES: Record<string, string> = {
  'emergency-card': 'Tarjeta de emergencia',
  profile: 'Perfil clínico',
  allergies: 'Alergias',
  medications: 'Medicamentos',
  contacts: 'Contactos de emergencia',
  export: 'Exportar historial',
  prescriptions: 'Recetas médicas',
  'incident-location': 'Ubicación del incidente',
  alerts: 'Alertas y recordatorios',
  'fall-detector': 'Detector de caídas',
  settings: 'Ajustes',
};

// Pila autenticada: sin sesión se redirige a (auth) y mientras se restaura se muestra la carga.
export default function AppLayout() {
  const { status } = useSession();
  if (status === 'loading') return <SessionLoading />;
  const redirect = resolveGuardRedirect(status, '(app)');
  if (redirect) return <Redirect href={redirect} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner monitor={defaultNetworkMonitor} />
      <Stack
        screenOptions={({ route }: { route: { name: string } }) => ({
          headerShown: route.name !== 'index',
          title: SCREEN_TITLES[route.name] ?? 'LifeSync',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: fontWeight.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        })}
      />
    </View>
  );
}
