import { HttpClient, HttpError, NetworkError } from './http-client';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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
});
