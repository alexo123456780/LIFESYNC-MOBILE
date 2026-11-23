import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MedicationRecord } from '@/application/health-records-repository';
import { medicationSchema } from '@/domain/health-schemas';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { DynamicForm, medicationFields } from '@/presentation/forms';
import {
  MAX_FONT_SCALE,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '@/presentation/theme';

const toDateInput = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '');

export default function MedicationsScreen() {
  const [items, setItems] = useState<MedicationRecord[]>([]);
  const [editing, setEditing] = useState<MedicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthRecordsRepository.listMedications();
      setItems(res.data);
      setFromCache(res.fromCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus medicamentos.');
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
      await healthRecordsRepository.deleteMedication(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el medicamento.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Medicamentos
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
          fields={medicationFields}
          schema={medicationSchema}
          initialValues={{
            name: editing?.name ?? '',
            dose: editing?.dose ?? '',
            frequencyHours: editing ? String(editing.frequencyHours) : '8',
            controlled: editing?.controlled ?? false,
            startsAt: editing
              ? toDateInput(editing.startsAt)
              : new Date().toISOString().slice(0, 10),
            endsAt: editing ? toDateInput(editing.endsAt) : '',
          }}
          submitLabel={editing ? 'Actualizar medicamento' : 'Agregar medicamento'}
          onSubmit={async (value) => {
            setError(null);
            try {
              if (editing) {
                const updated = await healthRecordsRepository.updateMedication(editing.id, value);
                setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
                setEditing(null);
              } else {
                const created = await healthRecordsRepository.createMedication(value);
                setItems((prev) => [...prev, created]);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar el medicamento.');
            }
          }}
        />
        {editing ? (
          <Button label="Cancelar edición" variant="secondary" onPress={() => setEditing(null)} />
        ) : null}
      </Card>

      {loading ? (
        <LoadingIndicator label="Cargando medicamentos" />
      ) : items.length === 0 ? (
        <StatusBanner
          tone="info"
          message="No tienes medicamentos registrados todavía. Agrega tu tratamiento arriba."
        />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <View style={styles.headerRow}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemTitle}>
                {item.name}
              </Text>
              {item.controlled ? (
                <Text
                  accessibilityLabel="Medicamento controlado"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.controlledBadge}
                >
                  Controlado
                </Text>
              ) : null}
            </View>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemSub}>
              {item.dose} · Cada {item.frequencyHours} h
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  itemSub: { fontSize: fontSize.body, color: colors.textMuted },
  controlledBadge: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.onDanger,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
