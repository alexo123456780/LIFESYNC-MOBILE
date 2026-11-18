import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

// Pantalla de ejemplo: el historial y la tarjeta de emergencia llegan en el Sprint 2.
export default function Home() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Inicio
      </Text>
      <Button label="Ajustes" variant="secondary" onPress={() => router.push('/settings')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
});
