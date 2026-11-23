import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  UpdateProfileDto,
  UpsertAllergyDto,
  UpsertContactDto,
  UpsertMedicationDto,
} from './dto/health-records.dto.js';

describe('HealthRecords DTOs (LM-66, LM-69, LM-71, LM-73)', () => {
  it('valida UpdateProfileDto y rechaza bloodType inválido o notas > 500', async () => {
    const ok = plainToInstance(UpdateProfileDto, { bloodType: 'O_POS', notes: 'Sin alergias' });
    expect(await validate(ok)).toHaveLength(0);

    const bad = plainToInstance(UpdateProfileDto, { bloodType: 'X_POS', notes: 'a'.repeat(501) });
    const errors = await validate(bad);
    expect(errors.map((e) => e.property)).toEqual(expect.arrayContaining(['bloodType', 'notes']));
  });

  it('valida UpsertAllergyDto y rechaza nombre > 100 o severidad inválida', async () => {
    const ok = plainToInstance(UpsertAllergyDto, { name: 'Penicilina', severity: 'SEVERE' });
    expect(await validate(ok)).toHaveLength(0);

    const bad = plainToInstance(UpsertAllergyDto, { name: 'a'.repeat(101), severity: 'HIGH' });
    const errors = await validate(bad);
    expect(errors.map((e) => e.property)).toEqual(expect.arrayContaining(['name', 'severity']));
  });

  it('valida UpsertMedicationDto y rechaza frequencyHours <= 0 o dosis > 50', async () => {
    const ok = plainToInstance(UpsertMedicationDto, {
      name: 'Insulina',
      dose: '10 UI',
      frequencyHours: 8,
      controlled: true,
      startsAt: '2026-11-23T08:00:00.000Z',
    });
    expect(await validate(ok)).toHaveLength(0);

    const bad = plainToInstance(UpsertMedicationDto, {
      name: '',
      dose: 'd'.repeat(51),
      frequencyHours: 0,
      startsAt: 'no-es-fecha',
    });
    const errors = await validate(bad);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['name', 'dose', 'frequencyHours', 'startsAt']),
    );
  });

  it('valida UpsertContactDto y rechaza teléfono > 20 o parentesco > 50', async () => {
    const ok = plainToInstance(UpsertContactDto, {
      name: 'María López',
      phone: '+52 999 123 4567',
      relationship: 'Madre',
    });
    expect(await validate(ok)).toHaveLength(0);

    const bad = plainToInstance(UpsertContactDto, {
      name: '',
      phone: '1'.repeat(21),
      relationship: 'r'.repeat(51),
    });
    const errors = await validate(bad);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['name', 'phone', 'relationship']),
    );
  });
});
