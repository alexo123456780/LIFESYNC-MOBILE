import { type ApiPort, HttpError, NetworkError } from './errors';
import { registerUser } from './register-user';

const input = { email: 'ana@correo.com', password: 'una-contraseña-larga' };
const apiThatFailsWith = (error: unknown): ApiPort => ({
  post: async () => {
    throw error;
  },
});

describe('registerUser', () => {
  it('201: crea la cuenta enviando correo y contraseña a /auth/register', async () => {
    const calls: unknown[][] = [];
    const api: ApiPort = {
      post: async (...args) => {
        calls.push(args);
        return undefined as never;
      },
    };

    await expect(registerUser(api, input)).resolves.toEqual({ status: 'created' });
    expect(calls).toEqual([['/auth/register', input]]);
  });

  it('409: correo ya registrado', async () => {
    await expect(registerUser(apiThatFailsWith(new HttpError(409, {})), input)).resolves.toEqual({
      status: 'email_taken',
    });
  });

  it('400: muestra el mensaje de validación del servidor (texto o lista)', async () => {
    await expect(
      registerUser(
        apiThatFailsWith(new HttpError(400, { message: ['email inválido', 'password corta'] })),
        input,
      ),
    ).resolves.toEqual({ status: 'invalid', message: 'email inválido. password corta' });
    await expect(
      registerUser(apiThatFailsWith(new HttpError(400, { message: 'Dato inválido' })), input),
    ).resolves.toEqual({ status: 'invalid', message: 'Dato inválido' });
    await expect(
      registerUser(apiThatFailsWith(new HttpError(400, undefined)), input),
    ).resolves.toEqual({
      status: 'invalid',
      message: 'Revisa los datos ingresados',
    });
  });

  it('sin red o servidor dormido: unreachable', async () => {
    await expect(registerUser(apiThatFailsWith(new NetworkError()), input)).resolves.toEqual({
      status: 'unreachable',
    });
  });

  it.each([500, 502, 503])('%s: error del servidor', async (status) => {
    await expect(registerUser(apiThatFailsWith(new HttpError(status, {})), input)).resolves.toEqual(
      {
        status: 'server_error',
      },
    );
  });

  it('propaga los errores inesperados', async () => {
    await expect(registerUser(apiThatFailsWith(new TypeError('bug')), input)).rejects.toThrow(
      'bug',
    );
  });
});
