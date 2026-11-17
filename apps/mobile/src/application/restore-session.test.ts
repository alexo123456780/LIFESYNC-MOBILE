import { restoreSession } from './restore-session';
import type { TokenStorage } from './token-storage';

const storageWith = (load: TokenStorage['load']): TokenStorage => ({
  save: async () => {},
  load,
  clear: async () => {},
});

describe('restoreSession', () => {
  it('devuelve los tokens guardados', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    await expect(restoreSession(storageWith(async () => tokens))).resolves.toEqual(tokens);
  });

  it('sin tokens devuelve null (se abre la pila de autenticación)', async () => {
    await expect(restoreSession(storageWith(async () => null))).resolves.toBeNull();
  });

  it('si el almacén falla no bloquea el arranque: sin sesión', async () => {
    await expect(
      restoreSession(
        storageWith(async () => {
          throw new Error('keystore no disponible');
        }),
      ),
    ).resolves.toBeNull();
  });
});
