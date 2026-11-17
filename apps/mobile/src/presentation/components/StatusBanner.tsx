import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MAX_FONT_SCALE,
  MIN_TOUCH_TARGET,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme';

type Tone = 'info' | 'error' | 'warning' | 'offline';

interface StatusBannerProps {
  tone: Tone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const palette = {
  info: { background: colors.infoSurface, text: colors.onInfoSurface },
  error: { background: colors.dangerSurface, text: colors.onDangerSurface },
  warning: { background: colors.warningSurface, text: colors.onWarningSurface },
  offline: { background: colors.warningSurface, text: colors.onWarningSurface },
} as const;

/** Mensaje de estado (error, sin conexión, aviso). Los errores se anuncian de inmediato. */
export function StatusBanner({ tone, message, actionLabel, onAction }: StatusBannerProps) {
  const { background, text } = palette[tone];
  return (
    <View
      // Un elemento accesible único; si contiene el botón de acción, sus hijos deben seguir enfocables.
      accessible={!actionLabel}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: background }]}
    >
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.message, { color: text }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={styles.action}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.actionLabel, { color: text }]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: spacing.md, gap: spacing.xs, borderRadius: radius.md },
  message: { fontSize: fontSize.body },
  action: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
