import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { HealthProfileRecord } from '@/application/health-records-repository';
import { healthProfileSchema } from '@/domain/health-schemas';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { DynamicForm, healthProfileFields } from '@/presentation/forms';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<HealthProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthRecordsRepository.getProfile();
      setProfile(res.data);
      setFromCache(res.fromCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tu perfil clínico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = profile && !profile.bloodType && !profile.notes;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Perfil clínico
      </Text>

      {fromCache ? (
        <StatusBanner
          tone="warning"
          message="Mostrando copia local cifrada. Los datos pueden estar desactualizados."
        />
      ) : null}

      {error ? (
        <Card>
          <StatusBanner tone="error" message={error} />
          <Button label="Reintentar" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : null}

      {savedNotice ? <StatusBanner tone="info" message={savedNotice} /> : null}

      {loading ? (
        <LoadingIndicator label="Cargando perfil clínico" />
      ) : (
        <Card>
          {isEmpty ? (
            <StatusBanner
              tone="info"
              message="Aún no completas tu perfil clínico. Agrega tu tipo de sangre y notas de emergencia."
            />
          ) : null}
          <DynamicForm
            key={`${profile?.bloodType ?? 'none'}-${profile?.notes ?? ''}`}
            fields={healthProfileFields}
            schema={healthProfileSchema}
            initialValues={{
              bloodType: profile?.bloodType ?? null,
              notes: profile?.notes ?? '',
            }}
            submitLabel="Guardar perfil"
            onSubmit={async (value) => {
              setError(null);
              setSavedNotice(null);
              try {
                const updated = await healthRecordsRepository.saveProfile(value);
                setProfile(updated);
                setFromCache(false);
                setSavedNotice('Perfil clínico guardado.');
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'No se pudo guardar el perfil. Intenta de nuevo.',
                );
              }
            }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
});
