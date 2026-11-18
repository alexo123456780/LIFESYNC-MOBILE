import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NetworkError } from '@/application/errors';
import { api } from '@/infrastructure/http/api';
import { signInWithBrowser } from '@/infrastructure/oauth/oauth-client';
import Welcome from '../welcome';

const mockSignIn = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/infrastructure/http/api', () => ({ api: { get: jest.fn() } }));
jest.mock('@/infrastructure/oauth/oauth-client', () => ({ signInWithBrowser: jest.fn() }));
jest.mock('@/presentation/session/session-context', () => ({
  useSession: () => ({
    status: 'unauthenticated',
    tokens: null,
    signIn: mockSignIn,
    signOut: jest.fn(),
  }),
}));

const get = api.get as jest.Mock;
const browser = signInWithBrowser as jest.Mock;
const tokens = { accessToken: 'access', refreshToken: 'refresh' };
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('pantalla de bienvenida', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
    get.mockResolvedValue({ status: 'ok' });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it('muestra «Iniciar sesión» y «Crear cuenta» con objetivos táctiles de al menos 44 px', async () => {
    await render(<Welcome />);
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveStyle({ minHeight: 44 });
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toHaveStyle({ minHeight: 44 });
  });

  it('«Crear cuenta» lleva al registro', async () => {
    await render(<Welcome />);
    await press('Crear cuenta');
    expect(router.push).toHaveBeenCalledWith('/register');
  });

  it('tras registrarse muestra un aviso para iniciar sesión', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ registered: '1' });
    await render(<Welcome />);
    expect(screen.getByText('Cuenta creada. Ahora inicia sesión.')).toBeOnTheScreen();
  });

  it('con credenciales correctas entrega los tokens a la sesión', async () => {
    browser.mockResolvedValue({ status: 'signed_in', tokens });
    await render(<Welcome />);
    await press('Iniciar sesión');

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(tokens));
    expect(get).toHaveBeenCalledWith('/healthz');
  });

  it('mientras abre el navegador muestra carga y no admite el doble toque', async () => {
    let finish!: (value: unknown) => void;
    browser.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<Welcome />);
    void fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    void fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(browser).toHaveBeenCalledTimes(1);

    finish({ status: 'cancelled' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled(),
    );
  });

  it('sin conexión muestra un mensaje claro con «Reintentar», sin abrir el navegador ni cerrar la app', async () => {
    get.mockRejectedValueOnce(new NetworkError());
    browser.mockResolvedValue({ status: 'signed_in', tokens });
    await render(<Welcome />);
    await press('Iniciar sesión');

    expect(await screen.findByText(/Sin conexión con el servidor/)).toBeOnTheScreen();
    expect(browser).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();

    await press('Reintentar');
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(tokens));
  });

  it.each([
    ['state_mismatch', 'No pudimos verificar el inicio de sesión. Inténtalo de nuevo.'],
    ['rejected', 'No pudimos iniciar sesión. Inténtalo de nuevo.'],
  ])('%s: muestra un error y no crea sesión', async (status, message) => {
    browser.mockResolvedValue({ status });
    await render(<Welcome />);
    await press('Iniciar sesión');

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('si el usuario cierra el navegador informa que no se completó y no crea sesión', async () => {
    browser.mockResolvedValue({ status: 'cancelled' });
    await render(<Welcome />);
    await press('Iniciar sesión');

    expect(await screen.findByText('No se completó el inicio de sesión.')).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
