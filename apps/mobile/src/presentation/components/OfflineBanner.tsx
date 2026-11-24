import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  MAX_FONT_SCALE,
  borderWidth,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme';

export interface NetworkStateProvider {
  isOnline: boolean;
  subscribe: (callback: (isOnline: boolean) => void) => () => void;
}

// Emisor de estado de red configurable (permite suscripción de NetInfo o simulación)
class SimpleNetworkMonitor implements NetworkStateProvider {
  isOnline = true;
  private readonly listeners = new Set<(online: boolean) => void>();

  setOnline(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.listeners.forEach((cb) => cb(online));
    }
  }

  subscribe(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => this.listeners.delete(callback);
  }
}

export const defaultNetworkMonitor = new SimpleNetworkMonitor();

export function OfflineBanner({
  monitor = defaultNetworkMonitor,
}: {
  monitor?: NetworkStateProvider;
}) {
  const [online, setOnline] = useState(monitor.isOnline);

  useEffect(() => {
    return monitor.subscribe((isOnline) => {
      setOnline(isOnline);
    });
  }, [monitor]);

  if (online) {
    return null;
  }

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel="Sin conexión a internet. Mostrando datos locales."
    >
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>
        ⚠️ Sin conexión. Mostrando datos desde la memoria local.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.border,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  text: {
    color: colors.onWarningSurface,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
