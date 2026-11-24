import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { LoadingIndicator } from './LoadingIndicator';
import { StatusBanner } from './StatusBanner';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '../theme';

interface ServerWakingProps {
  checkHealth: () => Promise<boolean>;
  onReady: () => void;
  maxRetries?: number;
  retryIntervalMs?: number;
}

export function ServerWaking({
  checkHealth,
  onReady,
  maxRetries = 5,
  retryIntervalMs = 2000,
}: ServerWakingProps) {
  const [attempts, setAttempts] = useState(0);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(true);

  const attemptPing = useCallback(async () => {
    setChecking(true);
    setFailed(false);

    try {
      const ok = await checkHealth();
      if (ok) {
        setChecking(false);
        onReady();
        return;
      }
    } catch {
      // Ignorar error para seguir reintentando
    }

    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= maxRetries) {
        setFailed(true);
        setChecking(false);
      }
      return next;
    });
  }, [checkHealth, maxRetries, onReady]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (checking && !failed) {
      void attemptPing();
      timer = setInterval(() => {
        void attemptPing();
      }, retryIntervalMs);
    }
    return () => clearInterval(timer);
  }, [attemptPing, checking, failed, retryIntervalMs]);

  const handleManualRetry = () => {
    setAttempts(0);
    setFailed(false);
    setChecking(true);
  };

  if (!checking && !failed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={styles.title}
        >
          {failed ? 'Servidor no disponible' : 'Conectando con el servidor…'}
        </Text>

        {failed ? (
          <>
            <StatusBanner
              tone="error"
              message="El servidor en la nube no respondió tras varios reintentos. Puede que esté iniciando o temporalmente inactivo."
            />
            <Button
              label="Reintentar conexión"
              onPress={handleManualRetry}
              accessibilityLabel="Reintentar conectar con el servidor"
            />
          </>
        ) : (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.description}>
              El servicio gratuito de Render se encuentra despertando tras un período de inactividad
              (intento {attempts + 1} de {maxRetries}). Por favor espera unos momentos…
            </Text>
            <LoadingIndicator label="Despertando servidor en Render…" />
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { width: '100%', gap: spacing.md, padding: spacing.lg },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  description: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
});
