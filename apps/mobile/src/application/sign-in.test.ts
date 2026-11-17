import { HttpError, NetworkError } from './errors';
import { type SignInResult, signIn } from './sign-in';

const tokens = { accessToken: 'access', refreshToken: 'refresh' };

describe('signIn', () => {
  it('comprueba el servidor, abre el navegador y devuelve los tokens', async () => {
    const phases: string[] = [];
    const result = await signIn(
      {
        checkServer: async () => ({ status: 'ok' }),
        openBrowser: async () => ({ status: 'signed_in', tokens }),
      },
      (phase) => phases.push(phase),
    );

    expect(result).toEqual({ status: 'signed_in', tokens });
    expect(phases).toEqual(['connecting', 'opening']);
  });

  it('sin conexión avisa sin abrir el navegador', async () => {
    let opened = false;
    const result = await signIn({
      checkServer: async () => {
        throw new NetworkError();
      },
      openBrowser: async () => {
        opened = true;
        return { status: 'cancelled' };
      },
    });

    expect(result).toEqual({ status: 'unreachable' });
    expect(opened).toBe(false);
  });

  it('si el servidor responde con error HTTP está vivo: continúa con el login', async () => {
    const result = await signIn({
      checkServer: async () => {
        throw new HttpError(503, {});
      },
      openBrowser: async () => ({ status: 'signed_in', tokens }),
    });
    expect(result.status).toBe('signed_in');
  });

  it.each<SignInResult>([
    { status: 'cancelled' },
    { status: 'state_mismatch' },
    { status: 'rejected' },
    { status: 'unreachable' },
  ])('devuelve tal cual el resultado %j del navegador', async (outcome) => {
    await expect(
      signIn({ checkServer: async () => undefined, openBrowser: async () => outcome }),
    ).resolves.toEqual(outcome);
  });

  it('un fallo inesperado al abrir el navegador no crea sesión ni cierra la app', async () => {
    await expect(
      signIn({
        checkServer: async () => undefined,
        openBrowser: async () => {
          throw new Error('sin navegador');
        },
      }),
    ).resolves.toEqual({ status: 'rejected' });
  });
});
