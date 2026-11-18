import { HttpError, NetworkError } from './errors';
import { signOut } from './sign-out';

const tokens = { accessToken: 'access-jwt', refreshToken: 'refresh-opaco' };

const setup = (apiError?: unknown, storageError?: unknown, cacheError?: unknown) => {
  const log = { post: [] as unknown[][], storageCleared: 0, cacheCleared: 0 };
  return {
    log,
    deps: {
      api: {
        post: async (...args: unknown[]) => {
          log.post.push(args);
          if (apiError) throw apiError;
          return undefined as never;
        },
      },
      storage: {
        save: async () => {},
        load: async () => null,
        clear: async () => {
          log.storageCleared += 1;
          if (storageError) throw storageError;
        },
      },
      clearCache: async () => {
        log.cacheCleared += 1;
        if (cacheError) throw cacheError;
      },
    },
  };
};

describe('signOut', () => {
  it('llama a POST /auth/logout con el refresh token y el access token, y borra SecureStore y la caché', async () => {
    const { deps, log } = setup();

    await expect(signOut(deps, tokens)).resolves.toEqual({
      serverRevoked: true,
      localCleared: true,
    });

    expect(log.post).toEqual([
      [
        '/auth/logout',
        { refresh_token: 'refresh-opaco' },
        { headers: { Authorization: 'Bearer access-jwt' } },
      ],
    ]);
    expect(log.storageCleared).toBe(1);
    expect(log.cacheCleared).toBe(1);
  });

  it.each([
    ['sin red', new NetworkError()],
    ['token vencido (401)', new HttpError(401, {})],
    ['servidor caído (503)', new HttpError(503, {})],
  ])('%s: el borrado local se completa igual', async (_nombre, error) => {
    const { deps, log } = setup(error);

    await expect(signOut(deps, tokens)).resolves.toEqual({
      serverRevoked: false,
      localCleared: true,
    });

    expect(log.storageCleared).toBe(1);
    expect(log.cacheCleared).toBe(1);
  });

  it('sin tokens no llama al servidor pero limpia el almacenamiento local', async () => {
    const { deps, log } = setup();
    await expect(signOut(deps, null)).resolves.toEqual({
      serverRevoked: false,
      localCleared: true,
    });
    expect(log.post).toEqual([]);
    expect(log.storageCleared + log.cacheCleared).toBe(2);
  });

  it('si falla un borrado local lo informa pero intenta borrar el otro', async () => {
    const { deps, log } = setup(undefined, new Error('keystore'));
    await expect(signOut(deps, tokens)).resolves.toEqual({
      serverRevoked: true,
      localCleared: false,
    });
    expect(log.cacheCleared).toBe(1);
  });
});
