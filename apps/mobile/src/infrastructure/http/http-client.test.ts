import type { TokenStorage } from '../../application/token-storage';
import type { SessionTokens } from '../../domain/session';
import { HttpClient, HttpError, NetworkError } from './http-client';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function createMemoryStorage(initial: SessionTokens | null = null): TokenStorage {
  let current = initial;
  return {
    save: jest.fn(async (tokens: SessionTokens) => {
      current = tokens;
    }),
    load: jest.fn(async () => current),
    clear: jest.fn(async () => {
      current = null;
    }),
  };
}

describe('HttpClient', () => {
  const fetchMock = jest.fn();
  const client = new HttpClient('https://api.test/api/v1');

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('GET usa la URL base y devuelve el cuerpo JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await expect(client.get('/healthz')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/healthz',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST serializa el cuerpo como JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: '1' }));

    await client.post('/auth/register', { email: 'a@b.co' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.co' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('POST envía las cabeceras adicionales (por ejemplo Authorization) junto con el JSON', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await client.post(
      '/auth/logout',
      { refresh_token: 'r' },
      { headers: { Authorization: 'Bearer t' } },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/auth/logout',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      }),
    );
  });

  it('un estado no exitoso lanza HttpError con el estado y el cuerpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { message: 'Correo registrado' }));

    await expect(client.post('/auth/register', {})).rejects.toMatchObject({
      name: 'HttpError',
      status: 409,
      body: { message: 'Correo registrado' },
    });
  });

  it('una respuesta sin cuerpo JSON no rompe el manejo del error', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(client.post('/auth/logout')).resolves.toBeUndefined();
    fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(client.get('/x')).rejects.toBeInstanceOf(HttpError);
  });

  it('sin red lanza NetworkError conservando la causa', async () => {
    const cause = new TypeError('Network request failed');
    fetchMock.mockRejectedValue(cause);

    const error = await client.get('/healthz').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBe(cause);
  });

  describe('interceptores de sesión (LM-64 y LM-65)', () => {
    it('inyecta Authorization: Bearer <JWT> leído de SecureStore cuando hay sesión', async () => {
      const storage = createMemoryStorage({
        accessToken: 'jwt-activo',
        refreshToken: 'ref-1',
      });
      const authed = new HttpClient('https://api.test/api/v1', { tokenStorage: storage });
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

      await authed.get('/users/me');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/api/v1/users/me',
        expect.objectContaining({
          headers: { Authorization: 'Bearer jwt-activo' },
        }),
      );
    });

    it('sin sesión no agrega el header Authorization', async () => {
      const storage = createMemoryStorage(null);
      const authed = new HttpClient('https://api.test/api/v1', { tokenStorage: storage });
      fetchMock.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

      await authed.get('/healthz');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/api/v1/healthz',
        expect.objectContaining({ headers: undefined }),
      );
    });

    it('con 3 peticiones simultáneas que reciben 401 hace un solo refresh y reintenta las 3 con el token nuevo', async () => {
      const storage = createMemoryStorage({
        accessToken: 'jwt-vencido',
        refreshToken: 'ref-viejo',
      });
      const onAuthFailure = jest.fn();
      const authed = new HttpClient('https://api.test/api/v1', {
        tokenStorage: storage,
        onAuthFailure,
      });

      let refreshCalls = 0;
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/oauth/token')) {
          refreshCalls += 1;
          return jsonResponse(200, {
            access_token: 'jwt-nuevo',
            refresh_token: 'ref-nuevo',
          });
        }
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (authHeader === 'Bearer jwt-vencido') {
          return jsonResponse(401, { message: 'Token expirado' });
        }
        if (authHeader === 'Bearer jwt-nuevo') {
          return jsonResponse(200, { path: url });
        }
        return jsonResponse(401, {});
      });

      const results = await Promise.all([
        authed.get<{ path: string }>('/health-records/allergies'),
        authed.get<{ path: string }>('/health-records/medications'),
        authed.get<{ path: string }>('/health-records/contacts'),
      ]);

      expect(refreshCalls).toBe(1);
      expect(storage.save).toHaveBeenCalledWith({
        accessToken: 'jwt-nuevo',
        refreshToken: 'ref-nuevo',
      });
      expect(onAuthFailure).not.toHaveBeenCalled();
      expect(results).toEqual([
        { path: 'https://api.test/api/v1/health-records/allergies' },
        { path: 'https://api.test/api/v1/health-records/medications' },
        { path: 'https://api.test/api/v1/health-records/contacts' },
      ]);
    });

    it('si el refresh responde 401 borra la sesión y dispara onAuthFailure sin exponer tokens', async () => {
      const storage = createMemoryStorage({
        accessToken: 'jwt-secreto-vencido',
        refreshToken: 'ref-revocado',
      });
      const onAuthFailure = jest.fn();
      const authed = new HttpClient('https://api.test/api/v1', {
        tokenStorage: storage,
        onAuthFailure,
      });

      fetchMock.mockImplementation(async () => jsonResponse(401, { message: 'Unauthorized' }));

      const err = await authed.get('/users/me').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(HttpError);
      expect((err as Error).message).not.toContain('jwt-secreto-vencido');
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });
  });
});
