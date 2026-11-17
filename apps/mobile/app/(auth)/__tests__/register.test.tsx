import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HttpError, NetworkError } from '@/application/errors';
import { api } from '@/infrastructure/http/api';
import Register from '../register';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/infrastructure/http/api', () => ({ api: { post: jest.fn() } }));

const post = api.post as jest.Mock;
const fill = async (email: string, password: string) => {
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), email);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
};
const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

describe('pantalla de registro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('con correo mal formado o contraseña corta muestra errores y no envía la petición', async () => {
    await render(<Register />);
    await fill('mal', 'corta');
    await submit();

    expect(screen.getByText('Escribe un correo válido')).toBeOnTheScreen();
    expect(screen.getByText('La contraseña debe tener al menos 12 caracteres')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
  });

  it('los campos tienen etiquetas accesibles y objetivos de al menos 44 px', async () => {
    await render(<Register />);
    expect(screen.getByLabelText('Correo electrónico')).toHaveStyle({ minHeight: 44 });
    expect(screen.getByLabelText('Contraseña')).toHaveStyle({ minHeight: 44 });
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toHaveStyle({ minHeight: 44 });
  });

  it('201: envía los datos normalizados y lleva a la bienvenida', async () => {
    post.mockResolvedValue(undefined);
    await render(<Register />);
    await fill(' Ana@Correo.com ', 'una-contraseña-larga');
    await submit();

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/welcome',
        params: { registered: '1' },
      }),
    );
    expect(post).toHaveBeenCalledWith('/auth/register', {
      email: 'ana@correo.com',
      password: 'una-contraseña-larga',
    });
  });

  it('deshabilita el botón mientras la petición está en curso (sin doble envío)', async () => {
    let resolve!: () => void;
    post.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    await render(<Register />);
    await fill('ana@correo.com', 'una-contraseña-larga');
    // Sin await: el manejador queda esperando la red y fireEvent esperaría a que termine.
    void fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled(),
    );
    void fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(post).toHaveBeenCalledTimes(1);

    resolve();
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it('409: muestra que el correo ya está registrado', async () => {
    post.mockRejectedValue(new HttpError(409, {}));
    await render(<Register />);
    await fill('ana@correo.com', 'una-contraseña-larga');
    await submit();

    expect(
      await screen.findByText('Ese correo ya está registrado. Inicia sesión.'),
    ).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('400: muestra el mensaje de validación del servidor', async () => {
    post.mockRejectedValue(new HttpError(400, { message: ['password demasiado débil'] }));
    await render(<Register />);
    await fill('ana@correo.com', 'una-contraseña-larga');
    await submit();

    expect(await screen.findByText('password demasiado débil')).toBeOnTheScreen();
  });

  it('sin red: muestra un aviso con «Reintentar» (sin cerrar la app) y reintenta', async () => {
    post.mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce(undefined);
    await render(<Register />);
    await fill('ana@correo.com', 'una-contraseña-larga');
    await submit();

    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('error 5xx: muestra el aviso del servidor con reintento', async () => {
    post.mockRejectedValue(new HttpError(503, {}));
    await render(<Register />);
    await fill('ana@correo.com', 'una-contraseña-larga');
    await submit();

    expect(await screen.findByText(/El servidor tuvo un problema/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
  });
});
