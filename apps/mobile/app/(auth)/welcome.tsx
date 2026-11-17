import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { type SignInPhase, type SignInResult, signIn } from '@/application/sign-in';
import { api } from '@/infrastructure/http/api';
import { signInWithBrowser } from '@/infrastructure/oauth/oauth-client';
import { Button, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { useSession } from '@/presentation/session/session-context';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

type Feedback = { tone: 'error' | 'offline' | 'info'; message: string; retry?: boolean };

const FEEDBACK: Record<Exclude<SignInResult['status'], 'signed_in'>, Feedback> = {
  cancelled: { tone: 'info', message: 'No se completó el inicio de sesión.' },
  state_mismatch: {
    tone: 'error',
    message: 'No pudimos verificar el inicio de sesión. Inténtalo de nuevo.',
  },
  rejected: {
    tone: 'error',
    message: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
    retry: true,
  },
  unreachable: {
    tone: 'offline',
    message:
      'Sin conexión con el servidor. Revisa tu internet; si estaba inactivo puede tardar hasta un minuto en despertar.',
    retry: true,
  },
};

export default function Welcome() {
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const session = useSession();
  const [phase, setPhase] = useState<SignInPhase | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const busy = phase !== null;

  const start = async () => {
    if (busy) return;
    setFeedback(null);
    try {
      const result = await signIn(
        { checkServer: () => api.get('/healthz'), openBrowser: signInWithBrowser },
        setPhase,
      );
      if (result.status === 'signed_in') session.signIn(result.tokens);
      else setFeedback(FEEDBACK[result.status]);
    } finally {
      setPhase(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        LifeSync
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lead}>
        Tu historial médico de emergencia, siempre contigo.
      </Text>
      {registered === '1' && !feedback ? (
        <StatusBanner tone="info" message="Cuenta creada. Ahora inicia sesión." />
      ) : null}
      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          message={feedback.message}
          actionLabel={feedback.retry ? 'Reintentar' : undefined}
          onAction={feedback.retry ? start : undefined}
        />
      ) : null}
      {phase === 'connecting' ? <LoadingIndicator label="Conectando con el servidor…" /> : null}
      <Button
        label={phase === 'opening' ? 'Abriendo el navegador…' : 'Iniciar sesión'}
        accessibilityLabel="Iniciar sesión"
        onPress={start}
        loading={busy}
      />
      <Button
        label="Crear cuenta"
        variant="secondary"
        disabled={busy}
        onPress={() => router.push('/register')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  lead: { fontSize: fontSize.bodyLarge, color: colors.textMuted },
});
