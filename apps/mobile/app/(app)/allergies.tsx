import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AllergyRecord } from '@/application/health-records-repository';
import { allergySchema } from '@/domain/health-schemas';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { DynamicForm, SEVERITY_OPTIONS, allergyFields } from '@/presentation/forms';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

const severityLabel = (value: string) =>
  SEVERITY_OPTIONS.find((o) => o.value === value)?.label ?? value;

export default function AllergiesScreen() {
  const [items, setItems] = useState<AllergyRecord[]>([]);
  const [editing, setEditing] = useState<AllergyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthRecordsRepository.listAllergies();
      setItems(res.data);
      setFromCache(res.fromCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus alergias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    setError(null);
    try {
      await healthRecordsRepository.deleteAllergy(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la alergia.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Alergias
      </Text>

      {fromCache ? (
        <StatusBanner
          tone="warning"
          message="Mostrando copia local cifrada. Los datos pueden estar desactualizados."
        />
      ) : null}

      {error ? <StatusBanner tone="error" message={error} /> : null}

      <Card>
        <DynamicForm
          key={editing ? editing.id : `new-${items.length}`}
          fields={allergyFields}
          schema={allergySchema}
          initialValues={{
            name: editing?.name ?? '',
            severity: editing?.severity ?? '',
          }}
          submitLabel={editing ? 'Actualizar alergia' : 'Agregar alergia'}
          onSubmit={async (value) => {
            setError(null);
            try {
              if (editing) {
                const updated = await healthRecordsRepository.updateAllergy(editing.id, value);
                setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
                setEditing(null);
              } else {
                const created = await healthRecordsRepository.createAllergy(value);
                setItems((prev) => [...prev, created]);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar la alergia.');
            }
          }}
        />
        {editing ? (
          <Button label="Cancelar edición" variant="secondary" onPress={() => setEditing(null)} />
        ) : null}
      </Card>

      {loading ? (
        <LoadingIndicator label="Cargando alergias" />
      ) : items.length === 0 ? (
        <StatusBanner
          tone="info"
          message="No tienes alergias registradas todavía. Agrega una usando el formulario."
        />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemTitle}>
              {item.name}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemSub}>
              Severidad: {severityLabel(item.severity)}
            </Text>
            <View style={styles.actions}>
              <Button label="Editar" variant="secondary" onPress={() => setEditing(item)} />
              <Button label="Eliminar" variant="danger" onPress={() => void remove(item.id)} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  itemTitle: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold, color: colors.text },
  itemSub: { fontSize: fontSize.body, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
