import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MAX_FONT_SCALE, colors, fontSize, spacing } from '../theme';

interface LoadingIndicatorProps {
  /** Texto visible y anunciado por los lectores de pantalla. */
  label: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  label: { fontSize: fontSize.body, color: colors.textMuted },
});
