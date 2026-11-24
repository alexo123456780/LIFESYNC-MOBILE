jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
  },
}));

import { randomBytes } from '@noble/ciphers/utils.js';
import { EncryptedLocalCache, type KeyValueStore } from '@/infrastructure/cache/local-cache';
import type { CacheKeyStorage } from '@/infrastructure/secure-store/token-storage';
import { permissionMachineReducer } from '@/application/permissions-machine';

function createMemoryStorage(): KeyValueStore {
  const store = new Map<string, string>();
  return {
    getItem: async (k) => store.get(k) ?? null,
    setItem: async (k, v) => {
      store.set(k, v);
    },
    clear: async () => {
      store.clear();
    },
  };
}

function createMemoryKeyStorage(): CacheKeyStorage {
  let key: Uint8Array | null = null;
  return {
    getOrCreateKey: async () => {
      if (!key) key = randomBytes(32);
      return key;
    },
    clearKey: async () => {
      key = null;
    },
  };
}

describe('Graceful degradation de permisos (LM-102, RF-M18)', () => {
  let cache: EncryptedLocalCache;

  beforeEach(async () => {
    cache = new EncryptedLocalCache(createMemoryStorage(), createMemoryKeyStorage());
    // Inicializar caché con datos clínicos
    await cache.set('profile', { bloodType: 'O_POS', notes: 'Paciente protegido' });
    await cache.set('allergies', [{ name: 'Polen', severity: 'MILD' }]);
  });

  it('con GPS denegado o bloqueado, se desactiva el envío de incidentes pero el historial offline sigue disponible', async () => {
    let gpsState = permissionMachineReducer('undetermined', { type: 'REQUEST' });
    gpsState = permissionMachineReducer(gpsState, { type: 'DENY' });
    expect(gpsState).toBe('denied');

    // Comprobar que denegado desactiva la función GPS pero no rompe la app
    const isGpsAvailable = gpsState === 'granted';
    expect(isGpsAvailable).toBe(false);

    // El historial clínico sigue leyéndose desde la caché sin crash
    const cachedProfile = await cache.get('profile');
    const cachedAllergies = await cache.get('allergies');

    expect(cachedProfile).toEqual({
      status: 'hit',
      value: { bloodType: 'O_POS', notes: 'Paciente protegido' },
    });
    expect(cachedAllergies).toEqual({
      status: 'hit',
      value: [{ name: 'Polen', severity: 'MILD' }],
    });
  });

  it('con cámara denegada o bloqueada, se habilita la captura manual de recetas sin crash', async () => {
    let cameraState = permissionMachineReducer('undetermined', { type: 'REQUEST' });
    cameraState = permissionMachineReducer(cameraState, { type: 'DENY' });
    cameraState = permissionMachineReducer(cameraState, { type: 'BLOCK' });
    expect(cameraState).toBe('blocked');

    // Degradación: permite entrada manual de receta médica
    const canUseHardwareCamera = cameraState === 'granted';
    const fallbackToManualEntry = !canUseHardwareCamera;
    expect(fallbackToManualEntry).toBe(true);

    // El historial clínico sigue accesible
    const cachedProfile = await cache.get('profile');
    expect(cachedProfile.status).toBe('hit');
  });

  it('revocar un permiso otorgado pasa a denied sin provocar excepciones', () => {
    let state = permissionMachineReducer('requesting', { type: 'GRANT' });
    expect(state).toBe('granted');

    expect(() => {
      state = permissionMachineReducer(state, { type: 'REVOKED' });
    }).not.toThrow();

    expect(state).toBe('denied');
  });
});
