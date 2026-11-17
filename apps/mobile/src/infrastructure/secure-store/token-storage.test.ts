import * as SecureStore from 'expo-secure-store';
import { secureTokenStorage } from './token-storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const tokens = { accessToken: 'access-jwt', refreshToken: 'refresh-opaco' };

describe('secureTokenStorage', () => {
  beforeEach(() => store.clear());

  it('guarda y recupera ambos tokens', async () => {
    await secureTokenStorage.save(tokens);
    await expect(secureTokenStorage.load()).resolves.toEqual(tokens);
  });

  it('sin tokens guardados devuelve null', async () => {
    await expect(secureTokenStorage.load()).resolves.toBeNull();
  });

  it('un par incompleto no se considera una sesión', async () => {
    await SecureStore.setItemAsync('lifesync.accessToken', 'solo-access');
    await expect(secureTokenStorage.load()).resolves.toBeNull();
  });

  it('clear borra los dos tokens', async () => {
    await secureTokenStorage.save(tokens);
    await secureTokenStorage.clear();
    expect(store.size).toBe(0);
    await expect(secureTokenStorage.load()).resolves.toBeNull();
  });
});
