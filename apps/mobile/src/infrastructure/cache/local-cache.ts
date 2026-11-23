import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import {
  bytesToHex,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
  bytesToUtf8,
} from '@noble/ciphers/utils.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CacheReadResult,
  EncryptedCachePort,
} from '../../application/health-records-repository';
import { type CacheKeyStorage, secureCacheKeyStorage } from '../secure-store/token-storage';

const NONCE_BYTES = 24;
const KEY_PREFIX = 'lifesync.enc.';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  clear(): Promise<void>;
}

interface EncryptedEnvelope {
  v: 1;
  n: string;
  c: string;
}

/**
 * Caché local cifrada con XChaCha20-Poly1305 (LM-77):
 * AsyncStorage guarda únicamente sobres cifrados; la clave de 256 bits vive solo en SecureStore.
 */
export class EncryptedLocalCache implements EncryptedCachePort {
  constructor(
    private readonly store: KeyValueStore,
    private readonly keys: CacheKeyStorage,
  ) {}

  async set<T>(key: string, value: T): Promise<void> {
    const secretKey = await this.keys.getOrCreateKey();
    const nonce = randomBytes(NONCE_BYTES);
    const plaintext = utf8ToBytes(JSON.stringify(value));
    const ciphertext = xchacha20poly1305(secretKey, nonce).encrypt(plaintext);
    const envelope: EncryptedEnvelope = {
      v: 1,
      n: bytesToHex(nonce),
      c: bytesToHex(ciphertext),
    };
    await this.store.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(envelope));
  }

  async get<T>(key: string): Promise<CacheReadResult<T>> {
    const raw = await this.store.getItem(`${KEY_PREFIX}${key}`);
    if (!raw) return { status: 'miss' };

    try {
      const envelope = JSON.parse(raw) as Partial<EncryptedEnvelope>;
      if (envelope.v !== 1 || typeof envelope.n !== 'string' || typeof envelope.c !== 'string') {
        return { status: 'corrupted' };
      }
      const secretKey = await this.keys.getOrCreateKey();
      const nonce = hexToBytes(envelope.n);
      const ciphertext = hexToBytes(envelope.c);
      const decrypted = xchacha20poly1305(secretKey, nonce).decrypt(ciphertext);
      return { status: 'hit', value: JSON.parse(bytesToUtf8(decrypted)) as T };
    } catch {
      return { status: 'corrupted' };
    }
  }

  async clear(): Promise<void> {
    await Promise.all([this.store.clear(), this.keys.clearKey()]);
  }
}

export const encryptedCache = new EncryptedLocalCache(AsyncStorage, secureCacheKeyStorage);

/** Borra la caché cifrada y la clave de cifrado al cerrar sesión. */
export const clearLocalCache = (): Promise<void> => encryptedCache.clear();
