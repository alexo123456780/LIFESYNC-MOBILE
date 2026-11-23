import { z } from 'zod';

export const BLOOD_TYPES = [
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export const SEVERITIES = ['MILD', 'MODERATE', 'SEVERE'] as const;

export type Severity = (typeof SEVERITIES)[number];

export const HEALTH_FIELD_LIMITS = {
  profileNotesMax: 500,
  allergyNameMax: 100,
  medicationNameMax: 100,
  medicationDoseMax: 50,
  contactNameMax: 100,
  contactPhoneMax: 20,
  contactRelationshipMax: 50,
} as const;

function parseDateValue(value: Date | string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const optionalTrimmedString = (max: number, maxMessage: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, { message: maxMessage })
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const healthProfileSchema = z.object({
  bloodType: z
    .enum(BLOOD_TYPES, { error: 'Selecciona un tipo de sangre válido' })
    .nullable()
    .optional(),
  notes: optionalTrimmedString(
    HEALTH_FIELD_LIMITS.profileNotesMax,
    `Las notas no pueden superar ${HEALTH_FIELD_LIMITS.profileNotesMax} caracteres`,
  ),
});

export type HealthProfileInput = z.input<typeof healthProfileSchema>;
export type HealthProfileValue = z.output<typeof healthProfileSchema>;

export const allergySchema = z.object({
  name: z
    .string({ error: 'Escribe el nombre de la alergia' })
    .trim()
    .min(1, 'Escribe el nombre de la alergia')
    .max(
      HEALTH_FIELD_LIMITS.allergyNameMax,
      `El nombre no puede superar ${HEALTH_FIELD_LIMITS.allergyNameMax} caracteres`,
    ),
  severity: z.enum(SEVERITIES, { error: 'Selecciona una severidad válida' }),
});

export type AllergyInput = z.input<typeof allergySchema>;
export type AllergyValue = z.output<typeof allergySchema>;

export const medicationSchema = z
  .object({
    name: z
      .string({ error: 'Escribe el nombre del medicamento' })
      .trim()
      .min(1, 'Escribe el nombre del medicamento')
      .max(
        HEALTH_FIELD_LIMITS.medicationNameMax,
        `El nombre no puede superar ${HEALTH_FIELD_LIMITS.medicationNameMax} caracteres`,
      ),
    dose: z
      .string({ error: 'Escribe la dosis' })
      .trim()
      .min(1, 'Escribe la dosis')
      .max(
        HEALTH_FIELD_LIMITS.medicationDoseMax,
        `La dosis no puede superar ${HEALTH_FIELD_LIMITS.medicationDoseMax} caracteres`,
      ),
    frequencyHours: z.preprocess(
      (value) => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed === '' ? Number.NaN : Number(trimmed);
        }
        return value;
      },
      z
        .number({ error: 'Escribe una frecuencia en horas válida' })
        .refine((n) => Number.isFinite(n), { message: 'Escribe una frecuencia en horas válida' })
        .int('La frecuencia debe ser un número entero de horas')
        .positive('La frecuencia debe ser mayor a 0 horas'),
    ),
    controlled: z.boolean().default(false),
    startsAt: z
      .union([z.date(), z.string()], { error: 'Selecciona la fecha de inicio' })
      .refine((value) => parseDateValue(value) !== null, {
        message: 'Escribe una fecha de inicio válida',
      })
      .transform((value) => parseDateValue(value)!.toISOString()),
    endsAt: z
      .union([z.date(), z.string()])
      .nullable()
      .optional()
      .transform((value) => {
        if (value == null) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      })
      .refine((value) => value === null || parseDateValue(value) !== null, {
        message: 'Escribe una fecha de fin válida',
      })
      .transform((value) => (value === null ? null : parseDateValue(value)!.toISOString())),
  })
  .superRefine((data, ctx) => {
    if (data.endsAt !== null) {
      const startMs = new Date(data.startsAt).getTime();
      const endMs = new Date(data.endsAt).getTime();
      if (endMs < startMs) {
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
        });
      }
    }
  });

export type MedicationInput = z.input<typeof medicationSchema>;
export type MedicationValue = z.output<typeof medicationSchema>;

export const emergencyContactSchema = z.object({
  name: z
    .string({ error: 'Escribe el nombre del contacto' })
    .trim()
    .min(1, 'Escribe el nombre del contacto')
    .max(
      HEALTH_FIELD_LIMITS.contactNameMax,
      `El nombre no puede superar ${HEALTH_FIELD_LIMITS.contactNameMax} caracteres`,
    ),
  phone: z
    .string({ error: 'Escribe el teléfono del contacto' })
    .trim()
    .min(1, 'Escribe el teléfono del contacto')
    .max(
      HEALTH_FIELD_LIMITS.contactPhoneMax,
      `El teléfono no puede superar ${HEALTH_FIELD_LIMITS.contactPhoneMax} caracteres`,
    )
    .regex(/^[+\d\s()-]+$/, 'Escribe un teléfono válido'),
  relationship: z
    .string({ error: 'Escribe el parentesco o relación' })
    .trim()
    .min(1, 'Escribe el parentesco o relación')
    .max(
      HEALTH_FIELD_LIMITS.contactRelationshipMax,
      `El parentesco no puede superar ${HEALTH_FIELD_LIMITS.contactRelationshipMax} caracteres`,
    ),
});

export type EmergencyContactInput = z.input<typeof emergencyContactSchema>;
export type EmergencyContactValue = z.output<typeof emergencyContactSchema>;

export type FieldErrors<TFields extends string = string> = Partial<Record<TFields, string>>;

export type SchemaValidationResult<TValue, TFields extends string = string> =
  { ok: true; value: TValue } | { ok: false; errors: FieldErrors<TFields> };

/** Valida datos con un esquema Zod y devuelve el primer error legible por campo. */
export function validateWithSchema<TValue, TFields extends string = string>(
  schema: z.ZodType<TValue>,
  input: unknown,
): SchemaValidationResult<TValue, TFields> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const errors: FieldErrors<TFields> = {};
  for (const issue of parsed.error.issues) {
    const field = (issue.path[0] ?? '_form') as TFields;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
