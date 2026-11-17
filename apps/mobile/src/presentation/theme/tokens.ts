/**
 * Tokens de diseño de LifeSync (RF-M06). Única fuente de colores, tipografía y tamaños:
 * los componentes no escriben valores a mano. Documentación en docs/design/sistema-visual.md.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#475569',
  border: '#64748B',
  primary: '#1D4ED8',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  onDanger: '#FFFFFF',
  dangerSurface: '#FEE2E2',
  onDangerSurface: '#7F1D1D',
  warningSurface: '#FEF3C7',
  onWarningSurface: '#78350F',
  infoSurface: '#DBEAFE',
  onInfoSurface: '#1E3A8A',
  disabledSurface: '#E2E8F0',
  onDisabled: '#475569',
} as const;

/** Combinaciones de texto sobre fondo que usan los componentes (todas deben cumplir AA, 4.5:1). */
export const textPairs = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['primary', 'background'],
  ['onPrimary', 'primary'],
  ['danger', 'background'],
  ['onDanger', 'danger'],
  ['onDangerSurface', 'dangerSurface'],
  ['onWarningSurface', 'warningSurface'],
  ['onInfoSurface', 'infoSurface'],
  ['onDisabled', 'disabledSurface'],
] as const satisfies ReadonlyArray<readonly [keyof typeof colors, keyof typeof colors]>;

/** Objetivo táctil mínimo en px (WCAG 2.5.5 / guías de Android e iOS). */
export const MIN_TOUCH_TARGET = 44;

/** Tamaños en px lógicos: React Native los escala con el tamaño de texto del sistema. */
export const fontSize = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  title: 22,
  headline: 28,
} as const;

export const lineHeight = {
  caption: 20,
  body: 24,
  bodyLarge: 26,
  title: 30,
  headline: 36,
} as const;

/** Tope del escalado para que el texto crezca sin romper el diseño (sigue siendo escalable). */
export const MAX_FONT_SCALE = 2;

export const fontWeight = { regular: '400', semibold: '600', bold: '700' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { md: 8, lg: 12 } as const;

export const borderWidth = { thin: 1, thick: 2 } as const;
