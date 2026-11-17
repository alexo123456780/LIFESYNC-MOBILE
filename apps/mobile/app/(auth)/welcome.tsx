import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/presentation/components';
import { spacing } from '@/presentation/theme';
import { useSession } from '@/presentation/session/session-context';

// Pantalla de ejemplo: LM-43 construye la bienvenida real con sus estados.
export default function Welcome() {
  const { signIn } = useSession();
  return (
    <View style={styles.container}>
      <Button label="Iniciar sesión" onPress={signIn} />
      <Button label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
});
