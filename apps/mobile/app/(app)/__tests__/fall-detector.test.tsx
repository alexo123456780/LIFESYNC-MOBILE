import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FallDetectorScreen from '../fall-detector';
import { alertSubject } from '@/domain/alerts';

describe('FallDetectorScreen (LM-109)', () => {
  it('muestra el aviso de que no es un dispositivo médico', async () => {
    await render(<FallDetectorScreen />);
    expect(screen.getByText(/NO constituye un dispositivo médico/)).toBeTruthy();
  });

  it('inicia la cuenta regresiva al simular impacto y permite cancelar', async () => {
    await render(<FallDetectorScreen />);

    const simBtn = screen.getByRole('button', {
      name: 'Simular detección de caída para demostración',
    });
    await act(async () => {
      fireEvent.press(simBtn);
    });

    expect(await screen.findByText('30 s')).toBeTruthy();

    const cancelBtn = screen.getByRole('button', {
      name: 'Cancelar alerta de caída, me encuentro bien',
    });
    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    expect(screen.queryByText('30 s')).toBeNull();
  });

  it('emite alerta a través del Observer si la cuenta regresiva llega a cero', async () => {
    jest.useFakeTimers();
    const notifySpy = jest.spyOn(alertSubject, 'notify');

    await render(<FallDetectorScreen />);

    const simBtn = screen.getByRole('button', {
      name: 'Simular detección de caída para demostración',
    });
    await act(async () => {
      fireEvent.press(simBtn);
    });

    // Avanzar los 30 segundos paso a paso para ejecutar los setTimeouts consecutivos
    for (let i = 0; i < 31; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'possible_fall',
        title: expect.stringContaining('caída detectada'),
      }),
    );

    jest.useRealTimers();
  });
});
