import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ServerWaking } from '../ServerWaking';

describe('ServerWaking (LM-112)', () => {
  it('muestra estado de conexión y reintenta automáticamente hasta que responde', async () => {
    let callCount = 0;
    const checkHealth = jest.fn().mockImplementation(async () => {
      callCount++;
      return callCount >= 2;
    });
    const onReady = jest.fn();

    await render(
      <ServerWaking
        checkHealth={checkHealth}
        onReady={onReady}
        maxRetries={3}
        retryIntervalMs={500}
      />,
    );

    expect(screen.getByText(/Conectando con el servidor…/)).toBeTruthy();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(onReady).toHaveBeenCalled();
  });

  it('muestra estado de falla y botón de reintento tras alcanzar el máximo de intentos', async () => {
    const checkHealth = jest.fn().mockResolvedValue(false);
    const onReady = jest.fn();

    await render(
      <ServerWaking
        checkHealth={checkHealth}
        onReady={onReady}
        maxRetries={2}
        retryIntervalMs={100}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(screen.getByText(/Servidor no disponible/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Reintentar conectar con el servidor' }),
    ).toBeTruthy();

    // Pulsa reintentar
    const retryBtn = screen.getByRole('button', { name: 'Reintentar conectar con el servidor' });
    await act(async () => {
      fireEvent.press(retryBtn);
    });

    expect(screen.getByText(/Conectando con el servidor…/)).toBeTruthy();
  });
});
