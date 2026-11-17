import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Settings from '../settings';

const mockSignOut = jest.fn();
jest.mock('@/presentation/session/session-context', () => ({
  useSession: () => ({
    status: 'authenticated',
    tokens: null,
    signIn: jest.fn(),
    signOut: mockSignOut,
  }),
}));

describe('pantalla de ajustes', () => {
  beforeEach(() => mockSignOut.mockReset());

  it('«Cerrar sesión» cierra la sesión y el botón mide al menos 44 px', async () => {
    mockSignOut.mockResolvedValue({ serverRevoked: true, localCleared: true });
    await render(<Settings />);
    const button = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(button).toHaveStyle({ minHeight: 44 });

    await fireEvent.press(button);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/No pudimos borrar/)).toBeNull();
  });

  it('avisa si no se pudieron borrar todos los datos locales', async () => {
    mockSignOut.mockResolvedValue({ serverRevoked: false, localCleared: false });
    await render(<Settings />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByText(/No pudimos borrar todos los datos/)).toBeOnTheScreen();
  });

  it('no admite el doble toque mientras cierra', async () => {
    let finish!: (value: unknown) => void;
    mockSignOut.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<Settings />);
    void fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled(),
    );
    void fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    finish({ serverRevoked: true, localCleared: true });
  });
});
