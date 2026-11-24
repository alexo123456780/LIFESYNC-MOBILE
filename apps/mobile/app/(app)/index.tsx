import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/presentation/components';
import {
  MAX_FONT_SCALE,
  MIN_TOUCH_TARGET,
  borderWidth,
  colors,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
} from '@/presentation/theme';

interface QuickTile {
  label: string;
  subtitle: string;
  badge: string;
  route: Href;
}

const CLINICAL_TILES: readonly QuickTile[] = [
  { label: 'Perfil clínico', subtitle: 'Tipo de sangre y notas', badge: '🩺', route: '/profile' },
  { label: 'Alergias', subtitle: 'Severidad y reacciones', badge: '⚠️', route: '/allergies' },
  { label: 'Medicamentos', subtitle: 'Dosis y horarios', badge: '💊', route: '/medications' },
  { label: 'Contactos', subtitle: 'Red de emergencia', badge: '📞', route: '/contacts' },
];

const TOOLS_TILES: readonly QuickTile[] = [
  { label: 'Recetas médicas', subtitle: 'Cámara o captura', badge: '📷', route: '/prescriptions' },
  { label: 'Ubicación', subtitle: 'Registrar incidente', badge: '📍', route: '/incident-location' },
  { label: 'Alertas', subtitle: 'Recordatorios activos', badge: '🔔', route: '/alerts' },
  { label: 'Detector caídas', subtitle: 'Acelerómetro 30 s', badge: '🛡️', route: '/fall-detector' },
];

function TileGrid({ items }: { items: readonly QuickTile[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.subtitle}`}
          onPress={() => router.push(item.route)}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={styles.tileIconBox}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileIcon}>
              {item.badge}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileLabel}>
            {item.label}
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileSubtitle}>
            {item.subtitle}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.brandPill}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.brandPillText}>
              LIFESYNC
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.title}
          >
            Inicio
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.subtitle}>
            Tu historial clínico listo con o sin conexión
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.tilePressed]}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.settingsBtnText}>
            Ajustes
          </Text>
        </Pressable>
      </View>

      <View style={styles.emergencyCard}>
        <View style={styles.emergencyBadge}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.emergencyBadgeText}>
            EMERGENCIA • MODO OFFLINE
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={styles.emergencyTitle}
        >
          Tarjeta de emergencia
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.emergencyDescription}>
          Consulta en un toque tu tipo de sangre, alergias críticas, medicación y contactos.
        </Text>
        <Button
          label="Abrir tarjeta de emergencia"
          variant="danger"
          onPress={() => router.push('/emergency-card')}
        />
      </View>

      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={styles.sectionTitle}
        >
          Expediente clínico
        </Text>
        <TileGrid items={CLINICAL_TILES} />
      </View>

      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={styles.sectionTitle}
        >
          Seguridad y herramientas
        </Text>
        <TileGrid items={TOOLS_TILES} />
      </View>

      <Button
        label="Exportar historial (JSON / CSV)"
        variant="secondary"
        onPress={() => router.push('/export')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  brandPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  brandPillText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.onInfoSurface,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: fontSize.headline,
    lineHeight: lineHeight.headline,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textMuted,
  },
  settingsBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  settingsBtnText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emergencyCard: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thick,
    borderColor: colors.danger,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emergencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  emergencyBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.onDanger,
  },
  emergencyTitle: {
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    fontWeight: fontWeight.bold,
    color: colors.onDangerSurface,
  },
  emergencyDescription: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.onDangerSurface,
    marginBottom: spacing.xs,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: MIN_TOUCH_TARGET * 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tilePressed: { opacity: 0.8 },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.infoSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: fontSize.bodyLarge },
  tileLabel: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tileSubtitle: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
});
