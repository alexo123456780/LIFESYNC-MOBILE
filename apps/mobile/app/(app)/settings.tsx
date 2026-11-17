import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, StatusBanner } from '@/presentation/components';
import { useSession } from '@/presentation/session/session-context';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

export default function Settings() {
  const session = useSession();
  const [closing, setClosing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const signOut = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const result = await session.signOut();
      if (!result.localCleared) {
        setWarning(
          'No pudimos borrar todos los datos de este teléfono. Reinicia la app e inténtalo de nuevo.',
        );
      }
    } finally {
      setClosing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Ajustes
      </Text>
      {warning ? <StatusBanner tone="warning" message={warning} /> : null}
      <Button
        label="Cerrar sesión"
        variant="danger"
        onPress={signOut}
        loading={closing}
        accessibilityLabel="Cerrar sesión"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
});
