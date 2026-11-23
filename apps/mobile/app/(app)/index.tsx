import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Inicio
      </Text>
      <Card>
        <Button label="Perfil clínico" onPress={() => router.push('/profile')} />
        <Button label="Alergias" variant="secondary" onPress={() => router.push('/allergies')} />
        <Button
          label="Medicamentos"
          variant="secondary"
          onPress={() => router.push('/medications')}
        />
        <Button
          label="Contactos de emergencia"
          variant="secondary"
          onPress={() => router.push('/contacts')}
        />
      </Card>
      <Button label="Ajustes" variant="secondary" onPress={() => router.push('/settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
});
