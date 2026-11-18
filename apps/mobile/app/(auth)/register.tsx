import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { registerUser } from '@/application/register-user';
import { type RegisterInput, validateRegister } from '@/application/register-schema';
import { api } from '@/infrastructure/http/api';
import { Button, StatusBanner, TextField } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

type Feedback =
  { tone: 'error'; message: string } | { tone: 'offline'; message: string; retry: true } | null;

export default function Register() {
  const [form, setForm] = useState<RegisterInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFeedback(null);
    const validation = validateRegister(form);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await registerUser(api, validation.value);
      if (result.status === 'created') {
        router.replace({ pathname: '/welcome', params: { registered: '1' } });
      } else if (result.status === 'email_taken') {
        setFeedback({ tone: 'error', message: 'Ese correo ya está registrado. Inicia sesión.' });
      } else if (result.status === 'invalid') {
        setFeedback({ tone: 'error', message: result.message });
      } else {
        setFeedback({
          tone: 'offline',
          message:
            result.status === 'unreachable'
              ? 'No pudimos conectar con el servidor. Si estaba inactivo puede tardar hasta un minuto en despertar.'
              : 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.',
          retry: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Crear cuenta
      </Text>
      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          message={feedback.message}
          actionLabel={'retry' in feedback ? 'Reintentar' : undefined}
          onAction={'retry' in feedback ? submit : undefined}
        />
      ) : null}
      <TextField
        label="Correo electrónico"
        value={form.email}
        onChangeText={(email) => setForm((current) => ({ ...current, email }))}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!submitting}
      />
      <TextField
        label="Contraseña"
        value={form.password}
        onChangeText={(password) => setForm((current) => ({ ...current, password }))}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!submitting}
      />
      <Button
        label={submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        accessibilityLabel="Crear cuenta"
        onPress={submit}
        loading={submitting}
      />
      <Button
        label="Ya tengo cuenta"
        variant="secondary"
        onPress={() => router.replace('/welcome')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
});
