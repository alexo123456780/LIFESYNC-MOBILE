import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import {
  MAX_FONT_SCALE,
  MIN_TOUCH_TARGET,
  borderWidth,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Mientras es true muestra el indicador y no admite pulsaciones (evita el doble toque). */
  loading?: boolean;
  accessibilityLabel?: string;
}

const palette = {
  primary: { background: colors.primary, text: colors.onPrimary, border: colors.primary },
  secondary: { background: colors.background, text: colors.primary, border: colors.primary },
  danger: { background: colors.danger, text: colors.onDanger, border: colors.danger },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  const colorsOf = inactive
    ? {
        background: colors.disabledSurface,
        text: colors.onDisabled,
        border: colors.disabledSurface,
      }
    : palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[styles.base, { backgroundColor: colorsOf.background, borderColor: colorsOf.border }]}
    >
      {loading ? <ActivityIndicator color={colorsOf.text} /> : null}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.label, { color: colorsOf.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
