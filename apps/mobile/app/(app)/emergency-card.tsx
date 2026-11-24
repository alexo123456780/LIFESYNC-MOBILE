import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingIndicator, StatusBanner } from '@/presentation/components';
import { MAX_FONT_SCALE, colors, fontSize, fontWeight, spacing } from '@/presentation/theme';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';

interface EmergencyData {
  bloodType: string | null;
  notes: string | null;
  allergies: Array<{ id: string; name: string; severity: string }>;
  medications: Array<{ id: string; name: string; dose: string; controlled: boolean }>;
  contacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
}

export default function EmergencyCardScreen() {
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [profileRes, allergiesRes, medicationsRes, contactsRes] = await Promise.all([
          healthRecordsRepository.getProfile(),
          healthRecordsRepository.listAllergies(),
          healthRecordsRepository.listMedications(),
          healthRecordsRepository.listContacts(),
        ]);

        if (mounted) {
          setData({
            bloodType: profileRes.data.bloodType,
            notes: profileRes.data.notes,
            allergies: allergiesRes.data,
            medications: medicationsRes.data,
            contacts: contactsRes.data,
          });

          // Si el origen fue cache, marcar indicador offline
          if (
            profileRes.fromCache ||
            allergiesRes.fromCache ||
            medicationsRes.fromCache ||
            contactsRes.fromCache
          ) {
            setIsOffline(true);
          }
        }
      } catch {
        // En caso de modo avión o red caída, no causa crash
        setIsOffline(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingIndicator label="Cargando tarjeta de emergencia…" />
      </View>
    );
  }

  const isEmpty =
    !data?.bloodType &&
    (!data?.allergies || data.allergies.length === 0) &&
    (!data?.medications || data.medications.length === 0) &&
    (!data?.contacts || data.contacts.length === 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
        Tarjeta de emergencia médica
      </Text>

      {isOffline ? (
        <StatusBanner
          tone="info"
          message="Modo sin conexión: mostrando datos esenciales desde la caché local cifrada."
        />
      ) : null}

      {isEmpty ? (
        <Card style={styles.emptyCard}>
          <StatusBanner
            tone="info"
            message="No hay datos médicos de emergencia registrados. Completa tu perfil en la sección clínica para tener disponible tu tarjeta offline."
          />
        </Card>
      ) : (
        <>
          {/* Tipo de sangre */}
          <Card style={styles.highlightCard}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionHeader}>
              Tipo de sangre
            </Text>
            <Text
              accessibilityLabel={`Tipo de sangre: ${data?.bloodType ?? 'No registrado'}`}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.bloodType}
            >
              {data?.bloodType ? data.bloodType.replace('_', ' ') : 'No registrado'}
            </Text>
            {data?.notes ? (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.notes}>
                Nota médica: {data.notes}
              </Text>
            ) : null}
          </Card>

          {/* Alergias */}
          <Card>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionHeader}>
              Alergias críticas
            </Text>
            {data?.allergies && data.allergies.length > 0 ? (
              data.allergies.map((a) => (
                <View key={a.id} style={styles.itemRow}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemName}>
                    • {a.name}
                  </Text>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemBadge}>
                    {a.severity}
                  </Text>
                </View>
              ))
            ) : (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.mutedText}>
                Sin alergias conocidas.
              </Text>
            )}
          </Card>

          {/* Medicamentos */}
          <Card>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionHeader}>
              Medicamentos activos
            </Text>
            {data?.medications && data.medications.length > 0 ? (
              data.medications.map((m) => (
                <View key={m.id} style={styles.itemRow}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemName}>
                    • {m.name} ({m.dose})
                  </Text>
                  {m.controlled ? (
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.controlledBadge}>
                      CONTROLADO
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.mutedText}>
                Sin medicamentos activos.
              </Text>
            )}
          </Card>

          {/* Contactos */}
          <Card>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionHeader}>
              Contactos de emergencia
            </Text>
            {data?.contacts && data.contacts.length > 0 ? (
              data.contacts.map((c) => (
                <View key={c.id} style={styles.contactItem}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemName}>
                    {c.name} ({c.relationship})
                  </Text>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.phoneText}>
                    Tel: {c.phone}
                  </Text>
                </View>
              ))
            ) : (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.mutedText}>
                Sin contactos de emergencia registrados.
              </Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: colors.text },
  emptyCard: { marginTop: spacing.md },
  highlightCard: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2 },
  sectionHeader: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bloodType: { fontSize: 32, fontWeight: fontWeight.bold, color: colors.primary },
  notes: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  itemName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
  itemBadge: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.danger },
  controlledBadge: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.danger,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactItem: { paddingVertical: spacing.xs, gap: 2 },
  phoneText: { fontSize: fontSize.body, color: colors.primary, fontWeight: fontWeight.semibold },
  mutedText: { fontSize: fontSize.body, color: colors.textMuted },
});
