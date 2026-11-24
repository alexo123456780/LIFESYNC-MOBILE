import { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text } from 'react-native';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';
import { api } from '@/infrastructure/http/api';

type ExportFormat = 'json' | 'csv';

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const exportData = useCallback(async (format: ExportFormat) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Petición al backend con JWT usando HttpClient (LM-94)
      const data = await api.get<unknown>(`/export?format=${format}`);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `historial-${dateStr}.${format}`;
      const mimeType = format === 'json' ? 'application/json' : 'text/csv';

      // Compartir con el sistema operativo
      await Share.share({
        title: filename,
        message: content,
      });

      setSuccess(`Historial exportado con éxito (${mimeType})`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo exportar el historial desde el servidor.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Exportar historial
      </Text>

      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="info" message={success} /> : null}

      {loading ? (
        <LoadingIndicator label="Descargando exportación del servidor…" />
      ) : (
        <Card>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.description}>
            Descarga una copia oficial de tu historial médico (perfil, alergias, medicamentos y
            contactos de emergencia) en formato JSON para sistemas médicos o CSV para aseguradoras.
          </Text>

          <Button
            label="Exportar como JSON"
            onPress={() => void exportData('json')}
            accessibilityLabel="Exportar historial en formato JSON"
          />

          <Button
            label="Exportar como CSV"
            variant="secondary"
            onPress={() => void exportData('csv')}
            accessibilityLabel="Exportar historial en formato CSV"
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  description: { fontSize: fontSize.body, color: colors.textMuted },
});
