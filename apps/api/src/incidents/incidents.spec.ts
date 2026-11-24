import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateIncidentLocationDto } from './dto/create-incident-location.dto.js';
import { IncidentsService } from './incidents.service.js';

describe('IncidentsService & DTO (LM-98)', () => {
  let service: IncidentsService;
  let mockPrisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockPrisma = {
      incidentLocation: {
        create: vi
          .fn()
          .mockImplementation(
            ({ data }: { data: { latitude: number; longitude: number; recordedAt?: Date } }) =>
              Promise.resolve({
                id: 'loc-1',
                latitude: data.latitude,
                longitude: data.longitude,
                recordedAt: data.recordedAt,
              }),
          ),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new IncidentsService(mockPrisma as never);
  });

  it('guarda una ubicación válida asociada al usuario del token', async () => {
    const dto: CreateIncidentLocationDto = {
      latitude: 19.4326,
      longitude: -99.1332,
      recordedAt: '2026-11-24T00:00:00.000Z',
    };

    const res = await service.recordLocation('user-1', dto);
    expect(res.id).toBe('loc-1');
    expect(res.latitude).toBe(19.4326);
    expect(res.longitude).toBe(-99.1332);
    expect(mockPrisma.incidentLocation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        latitude: 19.4326,
        longitude: -99.1332,
        recordedAt: new Date('2026-11-24T00:00:00.000Z'),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
    });
  });

  describe('CreateIncidentLocationDto validation', () => {
    it('acepta coordenadas dentro del rango válido', async () => {
      const dto = new CreateIncidentLocationDto();
      dto.latitude = 45.0;
      dto.longitude = -75.0;
      dto.recordedAt = '2026-11-24T00:00:00.000Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rechaza latitud fuera de [-90, 90]', async () => {
      const dto = new CreateIncidentLocationDto();
      dto.latitude = 95.0;
      dto.longitude = 0.0;
      dto.recordedAt = '2026-11-24T00:00:00.000Z';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('latitude');
    });

    it('rechaza longitud fuera de [-180, 180]', async () => {
      const dto = new CreateIncidentLocationDto();
      dto.latitude = 0.0;
      dto.longitude = 185.0;
      dto.recordedAt = '2026-11-24T00:00:00.000Z';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('longitude');
    });

    it('rechaza fecha mal formada', async () => {
      const dto = new CreateIncidentLocationDto();
      dto.latitude = 0.0;
      dto.longitude = 0.0;
      dto.recordedAt = 'not-a-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('recordedAt');
    });
  });
});
