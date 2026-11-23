import { randomBytes } from '@noble/ciphers/utils.js';
import type { CacheKeyStorage } from '../secure-store/token-storage';
import { EncryptedLocalCache, type KeyValueStore } from './local-cache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}));

function createMemoryKv(): { store: KeyValueStore; raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    store: {
      getItem: async (k) => raw.get(k) ?? null,
      setItem: async (k, v) => {
        raw.set(k, v);
      },
      clear: async () => {
        raw.clear();
      },
    },
  };
}

function createMemoryKeys(initialKey: Uint8Array = randomBytes(32)): {
  keys: CacheKeyStorage;
  rotate: (next: Uint8Array) => void;
  cleared: () => boolean;
} {
  let key: Uint8Array | null = initialKey;
  let wasCleared = false;
  return {
    keys: {
      getOrCreateKey: async () => {
        key ??= randomBytes(32);
        return key;
      },
      clearKey: async () => {
        key = null;
        wasCleared = true;
      },
    },
    rotate: (next) => {
      key = next;
    },
    cleared: () => wasCleared,
  };
}

describe('EncryptedLocalCache — XChaCha20-Poly1305 (LM-77)', () => {
  it('cifra el contenido en AsyncStorage de modo que es ilegible sin la clave y descifra con la clave correcta', async () => {
    const { store, raw } = createMemoryKv();
    const { keys } = createMemoryKeys();
    const cache = new EncryptedLocalCache(store, keys);

    const secretPayload = [{ id: '1', name: 'Penicilina', severity: 'SEVERE' }];
    await cache.set('allergies', secretPayload);

    const storedRaw = raw.get('lifesync.enc.allergies') ?? '';
    expect(storedRaw).not.toContain('Penicilina');
    expect(storedRaw).not.toContain('SEVERE');

    const result = await cache.get<typeof secretPayload>('allergies');
    expect(result).toEqual({ status: 'hit', value: secretPayload });
  });

  it('devuelve corrupted sin crash cuando el ciphertext fue alterado', async () => {
    const { store, raw } = createMemoryKv();
    const { keys } = createMemoryKeys();
    const cache = new EncryptedLocalCache(store, keys);

    await cache.set('contacts', [{ id: '1', name: 'María', phone: '999', relationship: 'Madre' }]);
    const env = JSON.parse(raw.get('lifesync.enc.contacts')!) as {
      v: number;
      n: string;
      c: string;
    };
    const tampered = env.c.slice(0, -2) + (env.c.endsWith('00') ? 'ff' : '00');
    raw.set('lifesync.enc.contacts', JSON.stringify({ ...env, c: tampered }));

    await expect(cache.get('contacts')).resolves.toEqual({ status: 'corrupted' });
  });

  it('devuelve corrupted sin crash cuando se intenta descifrar con una clave distinta', async () => {
    const { store } = createMemoryKv();
    const keyMgr = createMemoryKeys();
    const cache = new EncryptedLocalCache(store, keyMgr.keys);

    await cache.set('medications', [{ id: '1', name: 'Insulina' }]);
    keyMgr.rotate(randomBytes(32));

    await expect(cache.get('medications')).resolves.toEqual({ status: 'corrupted' });
  });

  it('clear borra tanto los datos cifrados como la clave de SecureStore', async () => {
    const { store, raw } = createMemoryKv();
    const keyMgr = createMemoryKeys();
    const cache = new EncryptedLocalCache(store, keyMgr.keys);

    await cache.set('profile', { bloodType: 'O_POS', notes: null });
    expect(raw.size).toBe(1);

    await cache.clear();
    expect(raw.size).toBe(0);
    expect(keyMgr.cleared()).toBe(true);
  });
});
