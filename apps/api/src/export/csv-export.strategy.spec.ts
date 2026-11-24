import { describe, expect, it } from 'vitest';
import { CsvExportStrategy, escapeCsvCell } from './csv-export.strategy.js';
import type { HealthSnapshot } from './export-strategy.interface.js';

describe('CsvExportStrategy', () => {
  const strategy = new CsvExportStrategy();

  it('escapa celdas que empiezan con =', () => {
    const escaped = escapeCsvCell('=cmd|"/C calc"!A0');
    expect(escaped).toMatch(/^"?'=/);
  });

  it('escapa celdas que empiezan con +', () => {
    const escaped = escapeCsvCell('+123456');
    expect(escaped).toMatch(/^"?'\+/);
  });

  it('escapa celdas que empiezan con -', () => {
    const escaped = escapeCsvCell('-SOMETHING()');
    expect(escaped).toMatch(/^"?'-/);
  });

  it('escapa celdas que empiezan con @', () => {
    const escaped = escapeCsvCell('@SUM(1,2)');
    expect(escaped).toMatch(/^"?'@/);
  });

  it('exporta el snapshot con cabecera y filas correspondientes', () => {
    const snapshot: HealthSnapshot = {
      profile: { bloodType: 'O_POS', notes: '=Nota peligrosa' },
      allergies: [{ name: '+Polen', severity: 'MILD' }],
      medications: [
        {
          name: '-Aspirina',
          dose: '100mg',
          frequencyHours: 8,
          controlled: false,
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: null,
        },
      ],
      contacts: [{ name: '@Contacto', phone: '1234567890', relationship: 'Madre' }],
    };

    const res = strategy.export(snapshot, 'user-123', '2026-11-23');
    expect(res.mimeType).toBe('text/csv');
    expect(res.filename).toBe('historial-user-123-2026-11-23.csv');
    expect(res.content).toContain('type,field,value');
    expect(res.content).toContain('profile,notes,"\'=Nota peligrosa"');
    expect(res.content).toContain('allergy,name,"\'+Polen"');
    expect(res.content).toContain('medication,name,"\' -Aspirina"'.replace(' ', ''));
    expect(res.content).toContain('contact,name,"\'@Contacto"');
  });
});
