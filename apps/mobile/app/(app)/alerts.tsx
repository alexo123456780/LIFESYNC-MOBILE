import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card, StatusBanner } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';
import { alertLogObserver, type MedicalAlert } from '@/domain/alerts';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<readonly MedicalAlert[]>(alertLogObserver.getLogs());

  useEffect(() => {
    // Actualizar vista al montar
    setAlerts(alertLogObserver.getLogs());
  }, []);

  const renderItem = useCallback(({ item }: { item: MedicalAlert }) => {
    const isCritical = item.type === 'critical_dose' || item.type === 'possible_fall';
    const timeFormatted = item.timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card style={[styles.alertCard, isCritical ? styles.criticalBorder : null]}>
        <View style={styles.headerRow}>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.alertTitle, isCritical ? styles.criticalText : null]}
          >
            {item.title}
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timestamp}>
            {timeFormatted}
          </Text>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.alertMessage}>
          {item.message}
        </Text>
      </Card>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Historial de alertas
      </Text>

      {alerts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <StatusBanner
            tone="info"
            message="No tienes alertas pendientes ni anomalías registradas. Te notificaremos cuando haya novedades sobre tus medicamentos."
          />
        </Card>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          accessibilityRole="list"
          accessibilityLabel="Lista de alertas y recordatorios"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  emptyCard: { marginTop: spacing.md },
  listContent: { gap: spacing.md, paddingBottom: spacing.xl },
  alertCard: { gap: spacing.xs },
  criticalBorder: { borderColor: colors.danger, borderWidth: 1.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertTitle: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold, color: colors.text },
  criticalText: { color: colors.danger },
  timestamp: { fontSize: fontSize.caption, color: colors.textMuted },
  alertMessage: { fontSize: fontSize.body, color: colors.textMuted },
});
