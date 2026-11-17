import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface CardProps {
  children: ReactNode;
  /** Etiqueta para lectores de pantalla cuando la tarjeta agrupa información. */
  accessibilityLabel?: string;
}

export function Card({ children, accessibilityLabel }: CardProps) {
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
});
