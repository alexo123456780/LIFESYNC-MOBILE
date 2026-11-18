import { StyleSheet, View } from 'react-native';
import { LoadingIndicator } from '@/presentation/components';

/** Pantalla mostrada mientras se restaura la sesión: evita el parpadeo entre las pilas. */
export function SessionLoading() {
  return (
    <View style={styles.container}>
      <LoadingIndicator label="Cargando…" />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center' } });
