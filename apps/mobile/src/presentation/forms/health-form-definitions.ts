import { HEALTH_FIELD_LIMITS, type BloodType, type Severity } from '../../domain/health-schemas';
import type { FieldDefinition, SelectOption } from './DynamicForm';

export const BLOOD_TYPE_OPTIONS: readonly SelectOption<BloodType>[] = [
  { label: 'A+', value: 'A_POS' },
  { label: 'A-', value: 'A_NEG' },
  { label: 'B+', value: 'B_POS' },
  { label: 'B-', value: 'B_NEG' },
  { label: 'AB+', value: 'AB_POS' },
  { label: 'AB-', value: 'AB_NEG' },
  { label: 'O+', value: 'O_POS' },
  { label: 'O-', value: 'O_NEG' },
];

export const SEVERITY_OPTIONS: readonly SelectOption<Severity>[] = [
  { label: 'Leve', value: 'MILD' },
  { label: 'Moderada', value: 'MODERATE' },
  { label: 'Severa', value: 'SEVERE' },
];

export const healthProfileFields: readonly FieldDefinition<'bloodType' | 'notes'>[] = [
  {
    name: 'bloodType',
    kind: 'select',
    label: 'Tipo de sangre',
    options: BLOOD_TYPE_OPTIONS,
    allowClear: true,
  },
  {
    name: 'notes',
    kind: 'text',
    label: 'Notas clínicas',
    maxLength: HEALTH_FIELD_LIMITS.profileNotesMax,
  },
];

export const allergyFields: readonly FieldDefinition<'name' | 'severity'>[] = [
  {
    name: 'name',
    kind: 'text',
    label: 'Nombre de la alergia',
    maxLength: HEALTH_FIELD_LIMITS.allergyNameMax,
  },
  {
    name: 'severity',
    kind: 'select',
    label: 'Severidad',
    options: SEVERITY_OPTIONS,
  },
];

export const medicationFields: readonly FieldDefinition<
  'name' | 'dose' | 'frequencyHours' | 'controlled' | 'startsAt' | 'endsAt'
>[] = [
  {
    name: 'name',
    kind: 'text',
    label: 'Nombre del medicamento',
    maxLength: HEALTH_FIELD_LIMITS.medicationNameMax,
  },
  {
    name: 'dose',
    kind: 'text',
    label: 'Dosis',
    maxLength: HEALTH_FIELD_LIMITS.medicationDoseMax,
  },
  {
    name: 'frequencyHours',
    kind: 'text',
    label: 'Frecuencia (horas)',
    keyboardType: 'numeric',
  },
  {
    name: 'controlled',
    kind: 'switch',
    label: 'Medicamento controlado',
    description: 'Actívalo si requiere confirmación prioritaria en recordatorios.',
  },
  {
    name: 'startsAt',
    kind: 'date',
    label: 'Fecha de inicio',
    hint: 'Formato recomendado: AAAA-MM-DD',
  },
  {
    name: 'endsAt',
    kind: 'date',
    label: 'Fecha de fin (opcional)',
    hint: 'Déjalo vacío si el tratamiento es continuo.',
  },
];

export const emergencyContactFields: readonly FieldDefinition<'name' | 'phone' | 'relationship'>[] =
  [
    {
      name: 'name',
      kind: 'text',
      label: 'Nombre del contacto',
      maxLength: HEALTH_FIELD_LIMITS.contactNameMax,
    },
    {
      name: 'phone',
      kind: 'text',
      label: 'Teléfono',
      keyboardType: 'phone-pad',
      maxLength: HEALTH_FIELD_LIMITS.contactPhoneMax,
    },
    {
      name: 'relationship',
      kind: 'text',
      label: 'Parentesco o relación',
      maxLength: HEALTH_FIELD_LIMITS.contactRelationshipMax,
    },
  ];
