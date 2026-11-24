import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, StatusBanner } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';
import { alertSubject } from '@/domain/alerts';

export default function FallDetectorScreen() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [alertEmitted, setAlertEmitted] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      // Tiempo agotado: emitir alerta de caída a través del Observer
      alertSubject.notify({
        id: `fall-${Date.now()}`,
        type: 'possible_fall',
        title: '¡Posible caída detectada!',
        message:
          'El teléfono registró un impacto y el usuario no canceló la cuenta regresiva de 30 s. Se emitió la notificación de emergencia.',
        timestamp: new Date(),
      });
      setAlertEmitted(true);
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSimulateFall = useCallback(() => {
    setAlertEmitted(false);
    setCountdown(30);
  }, []);

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Detector de caídas
      </Text>

      {/* Aclaración obligatoria PRD 9.3 / LM-109 */}
      <StatusBanner
        tone="info"
        message="Aviso importante: Esta función es heurística y NO constituye un dispositivo médico certificado. Solo opera con la aplicación abierta en primer plano."
      />

      {alertEmitted ? (
        <StatusBanner
          tone="error"
          message="¡Alerta de posible caída emitida a los observadores! Se activaron los avisos de emergencia."
        />
      ) : null}

      {countdown !== null ? (
        <Card style={styles.countdownCard}>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.countdownTitle}
          >
            ¿Te encuentras bien?
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.countdownSubtitle}>
            Detectamos un posible impacto. Se enviará una alerta en:
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.countdownDigits}>
            {countdown} s
          </Text>

          <Button
            label="Estoy bien (Cancelar)"
            onPress={handleCancelCountdown}
            accessibilityLabel="Cancelar alerta de caída, me encuentro bien"
          />
        </Card>
      ) : (
        <Card>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.description}>
            El detector analiza el acelerómetro en busca de un pico de impacto seguido de
            inmovilidad. En caso de detectarlo, iniciará una cuenta regresiva de 30 segundos antes
            de alertar a tus contactos.
          </Text>

          <Button
            label="Simular impacto de caída (Demo)"
            variant="secondary"
            onPress={handleSimulateFall}
            accessibilityLabel="Simular detección de caída para demostración"
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
  countdownCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  countdownTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.danger },
  countdownSubtitle: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
  countdownDigits: { fontSize: 48, fontWeight: fontWeight.bold, color: colors.danger },
});
