import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EmergencyContactRecord } from '@/application/health-records-repository';
import { emergencyContactSchema } from '@/domain/health-schemas';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';
import { Button, Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { DynamicForm, emergencyContactFields } from '@/presentation/forms';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';

export default function ContactsScreen() {
  const [items, setItems] = useState<EmergencyContactRecord[]>([]);
  const [editing, setEditing] = useState<EmergencyContactRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthRecordsRepository.listContacts();
      setItems(res.data);
      setFromCache(res.fromCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus contactos de emergencia.');
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
      await healthRecordsRepository.deleteContact(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el contacto.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Contactos de emergencia
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
          fields={emergencyContactFields}
          schema={emergencyContactSchema}
          initialValues={{
            name: editing?.name ?? '',
            phone: editing?.phone ?? '',
            relationship: editing?.relationship ?? '',
          }}
          submitLabel={editing ? 'Actualizar contacto' : 'Agregar contacto'}
          onSubmit={async (value) => {
            setError(null);
            try {
              if (editing) {
                const updated = await healthRecordsRepository.updateContact(editing.id, value);
                setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
                setEditing(null);
              } else {
                const created = await healthRecordsRepository.createContact(value);
                setItems((prev) => [...prev, created]);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar el contacto.');
            }
          }}
        />
        {editing ? (
          <Button label="Cancelar edición" variant="secondary" onPress={() => setEditing(null)} />
        ) : null}
      </Card>

      {loading ? (
        <LoadingIndicator label="Cargando contactos" />
      ) : items.length === 0 ? (
        <StatusBanner
          tone="info"
          message="No tienes contactos de emergencia registrados todavía."
        />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemTitle}>
              {item.name}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemSub}>
              {item.relationship} · {item.phone}
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
