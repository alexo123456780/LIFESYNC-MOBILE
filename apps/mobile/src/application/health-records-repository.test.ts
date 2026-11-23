import { NetworkError } from './errors';
import {
  type ClinicalApiPort,
  type EncryptedCachePort,
  OfflineCacheError,
  createHealthRecordsRepository,
} from './health-records-repository';

function createMocks() {
  const api: jest.Mocked<ClinicalApiPort> = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const cacheMap = new Map<string, unknown>();
  const cache: jest.Mocked<EncryptedCachePort> = {
    set: jest.fn(async (k, v) => {
      cacheMap.set(k, v);
    }),
    get: jest.fn(async (k: string) =>
      cacheMap.has(k)
        ? { status: 'hit' as const, value: cacheMap.get(k) }
        : { status: 'miss' as const },
    ) as jest.MockedFunction<EncryptedCachePort['get']>,
    clear: jest.fn(async () => {
      cacheMap.clear();
    }),
  };
  return { api, cache, repo: createHealthRecordsRepository(api, cache) };
}

describe('HealthRecordsRepository — lectura offline desde caché cifrada (LM-78)', () => {
  it('con red refresca la caché y en modo avión lee alergias, medicamentos y contactos sin crash', async () => {
    const { api, cache, repo } = createMocks();
    const allergies = [{ id: 'a1', name: 'Penicilina', severity: 'SEVERE' }];
    const meds = [
      {
        id: 'm1',
        name: 'Insulina',
        dose: '10 UI',
        frequencyHours: 8,
        controlled: true,
        startsAt: '2026-11-23T08:00:00.000Z',
        endsAt: null,
      },
    ];
    const contacts = [{ id: 'c1', name: 'María', phone: '+529991112222', relationship: 'Madre' }];

    api.get
      .mockResolvedValueOnce(allergies)
      .mockResolvedValueOnce(meds)
      .mockResolvedValueOnce(contacts);

    expect(await repo.listAllergies()).toEqual({ data: allergies, fromCache: false });
    expect(await repo.listMedications()).toEqual({ data: meds, fromCache: false });
    expect(await repo.listContacts()).toEqual({ data: contacts, fromCache: false });
    expect(cache.set).toHaveBeenCalledTimes(3);

    // Modo avión: todas las peticiones lanzan NetworkError
    api.get.mockRejectedValue(new NetworkError());

    expect(await repo.listAllergies()).toEqual({ data: allergies, fromCache: true });
    expect(await repo.listMedications()).toEqual({ data: meds, fromCache: true });
    expect(await repo.listContacts()).toEqual({ data: contacts, fromCache: true });
  });

  it('sin red y con caché vacía o corrupta lanza OfflineCacheError recuperable', async () => {
    const { api, cache, repo } = createMocks();
    api.get.mockRejectedValue(new NetworkError());

    await expect(repo.listAllergies()).rejects.toBeInstanceOf(OfflineCacheError);

    cache.get.mockResolvedValueOnce({ status: 'corrupted' });
    await expect(repo.listMedications()).rejects.toMatchObject({
      name: 'OfflineCacheError',
      reason: 'corrupted',
    });
  });
});
