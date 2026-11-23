import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { TokenStorage } from '../../application/token-storage';
import type { SessionTokens } from '../../domain/session';

const ACCESS_KEY = 'lifesync.accessToken';
const REFRESH_KEY = 'lifesync.refreshToken';
const CACHE_KEY = 'lifesync.cacheKey';
const CACHE_KEY_BYTES = 32;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

export interface CacheKeyStorage {
  getOrCreateKey(): Promise<Uint8Array>;
  clearKey(): Promise<void>;
}

/** Los tokens viven solo en el almacén respaldado por hardware (Keystore en Android, Keychain en iOS). */
export const secureTokenStorage: TokenStorage = {
  async save(tokens: SessionTokens) {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  },

  async load() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

/** Clave simétrica de 256 bits para XChaCha20-Poly1305: nace y vive solo en SecureStore. */
export const secureCacheKeyStorage: CacheKeyStorage = {
  async getOrCreateKey(): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(CACHE_KEY);
    if (existing && existing.length === CACHE_KEY_BYTES * 2) {
      return hexToBytes(existing);
    }
    const generated = await Crypto.getRandomBytesAsync(CACHE_KEY_BYTES);
    await SecureStore.setItemAsync(CACHE_KEY, bytesToHex(generated));
    return generated;
  },

  async clearKey(): Promise<void> {
    await SecureStore.deleteItemAsync(CACHE_KEY);
  },
};
