import { Pressable, Text, View } from 'react-native';
import { useSession } from '@/presentation/session/session-context';

// Pantalla de ejemplo: LM-43 construye la bienvenida real con sus estados.
export default function Welcome() {
  const { signIn } = useSession();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text accessibilityRole="header">LifeSync</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
        onPress={signIn}
        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
      >
        <Text>Iniciar sesión</Text>
      </Pressable>
    </View>
  );
}
