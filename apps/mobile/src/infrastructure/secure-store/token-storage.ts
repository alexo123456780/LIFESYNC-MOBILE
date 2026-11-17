import * as SecureStore from 'expo-secure-store';
import type { SessionTokens } from '../../domain/session';
import type { TokenStorage } from '../../application/token-storage';

const ACCESS_KEY = 'lifesync.accessToken';
const REFRESH_KEY = 'lifesync.refreshToken';

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
