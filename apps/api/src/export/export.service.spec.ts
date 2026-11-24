import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CsvExportStrategy } from './csv-export.strategy.js';
import { ExportService } from './export.service.js';
import { JsonExportStrategy } from './json-export.strategy.js';

describe('ExportService', () => {
  let service: ExportService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      healthProfile: {
        findUnique: vi.fn().mockResolvedValue({ bloodType: 'A_POS', notes: 'Ninguna' }),
      },
      allergy: {
        findMany: vi.fn().mockResolvedValue([{ name: 'Penicilina', severity: 'SEVERE' }]),
      },
      medication: {
        findMany: vi.fn().mockResolvedValue([
          {
            name: 'Ibuprofeno',
            dose: '400mg',
            frequencyHours: 8,
            controlled: false,
            startsAt: new Date('2026-01-01'),
            endsAt: null,
          },
        ]),
      },
      emergencyContact: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ name: 'Mamá', phone: '555-1234', relationship: 'Madre' }]),
      },
    };

    const jsonStrategy = new JsonExportStrategy();
    const csvStrategy = new CsvExportStrategy();

    service = new ExportService(mockPrisma as never, [jsonStrategy, csvStrategy]);
  });

  it('exporta correctamente en JSON', async () => {
    const result = await service.exportData('user-1', 'json');
    expect(result.mimeType).toBe('application/json');
    expect(result.filename).toMatch(/^historial-user-1-\d{4}-\d{2}-\d{2}\.json$/);
    const parsed = JSON.parse(result.content);
    expect(parsed.profile.bloodType).toBe('A_POS');
    expect(parsed.allergies).toHaveLength(1);
    expect(parsed.medications).toHaveLength(1);
    expect(parsed.contacts).toHaveLength(1);
  });

  it('exporta correctamente en CSV', async () => {
    const result = await service.exportData('user-1', 'csv');
    expect(result.mimeType).toBe('text/csv');
    expect(result.filename).toMatch(/^historial-user-1-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.content).toContain('type,field,value');
    expect(result.content).toContain('profile,bloodType,A_POS');
  });

  it('lanza BadRequestException ante un formato desconocido', async () => {
    await expect(service.exportData('user-1', 'xml')).rejects.toThrow(BadRequestException);
  });
});
