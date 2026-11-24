import { render, screen } from '@testing-library/react-native';
import AlertsScreen from '../alerts';
import { alertLogObserver } from '@/domain/alerts';

describe('AlertsScreen (LM-105)', () => {
  beforeEach(() => {
    alertLogObserver.clear();
  });

  it('muestra estado vacío cuando no hay alertas registradas', async () => {
    await render(<AlertsScreen />);
    expect(screen.getByText(/No tienes alertas pendientes/)).toBeTruthy();
  });

  it('muestra la lista de alertas con título, mensaje y hora', async () => {
    alertLogObserver.update({
      id: 'a1',
      type: 'reminder',
      title: 'Recordatorio de Paracetamol',
      message: 'Tomar 500mg con agua',
      timestamp: new Date('2026-11-24T08:30:00.000Z'),
    });

    await render(<AlertsScreen />);
    expect(screen.getByText('Recordatorio de Paracetamol')).toBeTruthy();
    expect(screen.getByText('Tomar 500mg con agua')).toBeTruthy();
  });
});
