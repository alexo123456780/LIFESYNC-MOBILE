import {
  BLOOD_TYPES,
  HEALTH_FIELD_LIMITS,
  SEVERITIES,
  allergySchema,
  emergencyContactSchema,
  healthProfileSchema,
  medicationSchema,
  validateWithSchema,
} from './health-schemas';

describe('esquemas Zod del dominio clínico (LM-75)', () => {
  describe('healthProfileSchema', () => {
    it.each(BLOOD_TYPES)('acepta el tipo de sangre %s y notas válidas', (bloodType) => {
      const result = validateWithSchema(healthProfileSchema, {
        bloodType,
        notes: 'Alérgico a penicilina. Usar brazalete.',
      });
      expect(result).toEqual({
        ok: true,
        value: { bloodType, notes: 'Alérgico a penicilina. Usar brazalete.' },
      });
    });

    it('normaliza notas vacías a null y permite bloodType nulo', () => {
      const result = validateWithSchema(healthProfileSchema, {
        bloodType: null,
        notes: '   ',
      });
      expect(result).toEqual({ ok: true, value: { bloodType: null, notes: null } });
    });

    it('rechaza un tipo de sangre fuera del catálogo', () => {
      const result = validateWithSchema(healthProfileSchema, {
        bloodType: 'X_POS',
        notes: '',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.bloodType).toBe('Selecciona un tipo de sangre válido');
      }
    });

    it('rechaza notas mayores a 500 caracteres', () => {
      const result = validateWithSchema(healthProfileSchema, {
        bloodType: 'O_POS',
        notes: 'a'.repeat(HEALTH_FIELD_LIMITS.profileNotesMax + 1),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.notes).toContain('500');
      }
    });
  });

  describe('allergySchema', () => {
    it.each(SEVERITIES)('acepta una alergia válida con severidad %s', (severity) => {
      const result = validateWithSchema(allergySchema, { name: '  Penicilina  ', severity });
      expect(result).toEqual({ ok: true, value: { name: 'Penicilina', severity } });
    });

    it('rechaza nombre vacío, longitud mayor a 100 y severidad inválida', () => {
      const empty = validateWithSchema(allergySchema, { name: '   ', severity: 'INVALID' });
      expect(empty.ok).toBe(false);
      if (!empty.ok) {
        expect(empty.errors.name).toBe('Escribe el nombre de la alergia');
        expect(empty.errors.severity).toBe('Selecciona una severidad válida');
      }

      const tooLong = validateWithSchema(allergySchema, {
        name: 'a'.repeat(HEALTH_FIELD_LIMITS.allergyNameMax + 1),
        severity: 'SEVERE',
      });
      expect(tooLong.ok).toBe(false);
      if (!tooLong.ok) {
        expect(tooLong.errors.name).toContain('100');
      }
    });
  });

  describe('medicationSchema', () => {
    const validBase = {
      name: 'Insulina',
      dose: '10 UI',
      frequencyHours: '8',
      controlled: true,
      startsAt: '2026-11-23T08:00:00.000Z',
      endsAt: '2026-11-30T08:00:00.000Z',
    };

    it('acepta un medicamento válido y convierte frequencyHours a entero positivo', () => {
      const result = validateWithSchema(medicationSchema, validBase);
      expect(result).toEqual({
        ok: true,
        value: {
          name: 'Insulina',
          dose: '10 UI',
          frequencyHours: 8,
          controlled: true,
          startsAt: '2026-11-23T08:00:00.000Z',
          endsAt: '2026-11-30T08:00:00.000Z',
        },
      });
    });

    it('permite endsAt vacío como null y controlled por defecto en false', () => {
      const result = validateWithSchema(medicationSchema, {
        name: 'Paracetamol',
        dose: '500 mg',
        frequencyHours: 6,
        startsAt: '2026-11-23T08:00:00.000Z',
        endsAt: '',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.controlled).toBe(false);
        expect(result.value.endsAt).toBeNull();
      }
    });

    it.each([0, -4, '0', '-2', 'abc', ''])(
      'rechaza frequencyHours no positiva o inválida: %s',
      (bad) => {
        const result = validateWithSchema(medicationSchema, { ...validBase, frequencyHours: bad });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors.frequencyHours).toBeDefined();
        }
      },
    );

    it('rechaza frequencyHours decimal', () => {
      const result = validateWithSchema(medicationSchema, { ...validBase, frequencyHours: 4.5 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.frequencyHours).toContain('entero');
      }
    });

    it('rechaza endsAt anterior a startsAt', () => {
      const result = validateWithSchema(medicationSchema, {
        ...validBase,
        startsAt: '2026-11-25T10:00:00.000Z',
        endsAt: '2026-11-24T10:00:00.000Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.endsAt).toBe(
          'La fecha de fin no puede ser anterior a la fecha de inicio',
        );
      }
    });

    it('rechaza nombre mayor a 100 caracteres y dosis mayor a 50 caracteres', () => {
      const result = validateWithSchema(medicationSchema, {
        ...validBase,
        name: 'm'.repeat(HEALTH_FIELD_LIMITS.medicationNameMax + 1),
        dose: 'd'.repeat(HEALTH_FIELD_LIMITS.medicationDoseMax + 1),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.name).toContain('100');
        expect(result.errors.dose).toContain('50');
      }
    });
  });

  describe('emergencyContactSchema', () => {
    it('acepta un contacto de emergencia válido', () => {
      const result = validateWithSchema(emergencyContactSchema, {
        name: 'María López',
        phone: '+52 999 123 4567',
        relationship: 'Madre',
      });
      expect(result).toEqual({
        ok: true,
        value: {
          name: 'María López',
          phone: '+52 999 123 4567',
          relationship: 'Madre',
        },
      });
    });

    it('rechaza longitudes excedidas y teléfono inválido', () => {
      const result = validateWithSchema(emergencyContactSchema, {
        name: 'n'.repeat(HEALTH_FIELD_LIMITS.contactNameMax + 1),
        phone: 'teléfono-inválido-123456',
        relationship: 'r'.repeat(HEALTH_FIELD_LIMITS.contactRelationshipMax + 1),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.name).toContain('100');
        expect(result.errors.phone).toContain('20');
        expect(result.errors.relationship).toContain('50');
      }
    });

    it('rechaza caracteres no telefónicos en phone', () => {
      const result = validateWithSchema(emergencyContactSchema, {
        name: 'Juan Pérez',
        phone: 'abc12345',
        relationship: 'Hermano',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.phone).toBe('Escribe un teléfono válido');
      }
    });
  });
});
