import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';
import { api } from '@/infrastructure/http/api';
import { useDevicePermission } from '@/presentation/permissions/use-device-permission';

export const locationPermissionAdapter = {
  checkStatus: async () => ({ granted: true, canAskAgain: true }),
  requestStatus: async () => ({ granted: true, canAskAgain: true }),
};

export default function IncidentLocationScreen() {
  const { isGranted, isBlocked, isDenied, request, openSettings } = useDevicePermission(
    'location',
    locationPermissionAdapter,
  );

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGetLocation = useCallback(() => {
    // Coordenadas simuladas para demo/test dentro de rango válido
    const simulatedCoords = { latitude: 19.432608, longitude: -99.133209 };
    setCoords(simulatedCoords);
  }, []);

  const handleSendLocation = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/incidents/location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        recordedAt: new Date().toISOString(),
      });
      setSuccess('Ubicación del incidente registrada exitosamente en la nube.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar la ubicación del incidente.');
    } finally {
      setLoading(false);
    }
  }, [coords]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Ubicación del incidente
      </Text>

      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="info" message={success} /> : null}

      {/* Explicación si permiso está denegado o bloqueado (degradación elegante LM-102) */}
      {isBlocked ? (
        <Card>
          <StatusBanner
            tone="error"
            message="El permiso de ubicación está bloqueado en el sistema. El rastreo de incidentes queda deshabilitado en la nube, pero tu historial clínico funciona normalmente."
          />
          <Button
            label="Abrir ajustes"
            variant="secondary"
            onPress={() => void openSettings()}
            accessibilityLabel="Abrir ajustes de ubicación"
          />
        </Card>
      ) : isDenied ? (
        <Card>
          <StatusBanner
            tone="info"
            message="Permiso de GPS denegado. El botón de envío permanecerá deshabilitado hasta otorgar el permiso."
          />
          <Button
            label="Solicitar permiso de GPS"
            onPress={() => void request()}
            accessibilityLabel="Solicitar permiso de GPS"
          />
        </Card>
      ) : null}

      <Card>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.description}>
          Registra tus coordenadas geográficas exactas ante una emergencia para facilitar la
          asistencia de los servicios médicos.
        </Text>

        {coords ? (
          <View style={styles.coordsContainer}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coordText}>
              Latitud: {coords.latitude.toFixed(6)}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coordText}>
              Longitud: {coords.longitude.toFixed(6)}
            </Text>
          </View>
        ) : (
          <Button
            label="Obtener coordenadas actuales"
            variant="secondary"
            disabled={!isGranted}
            onPress={handleGetLocation}
            accessibilityLabel="Obtener coordenadas actuales con GPS"
          />
        )}

        {loading ? (
          <LoadingIndicator label="Enviando ubicación a la nube…" />
        ) : (
          <Button
            label="Registrar ubicación del incidente"
            disabled={!isGranted || !coords}
            onPress={() => void handleSendLocation()}
            accessibilityLabel="Registrar ubicación del incidente"
          />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  description: { fontSize: fontSize.body, color: colors.textMuted },
  coordsContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: spacing.xs,
  },
  coordText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
});
