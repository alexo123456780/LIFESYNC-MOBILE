import { Pressable, Text, View } from 'react-native';
import { useSession } from '@/presentation/session/session-context';

// Pantalla de ejemplo: el historial y la tarjeta de emergencia llegan en el Sprint 2.
export default function Home() {
  const { signOut } = useSession();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text accessibilityRole="header">Inicio</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        onPress={signOut}
        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
      >
        <Text>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
