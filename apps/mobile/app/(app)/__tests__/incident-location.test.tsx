import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import IncidentLocationScreen from '../incident-location';
import { api } from '@/infrastructure/http/api';

jest.mock('@/infrastructure/http/api', () => ({
  api: {
    post: jest.fn().mockResolvedValue({ id: 'loc-1' }),
  },
}));

jest.mock('@/presentation/permissions/use-device-permission', () => ({
  useDevicePermission: () => ({
    isGranted: true,
    isBlocked: false,
    isDenied: false,
    request: jest.fn(),
    openSettings: jest.fn(),
  }),
}));

describe('IncidentLocationScreen (LM-99)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite obtener coordenadas y enviarlas al backend', async () => {
    await render(<IncidentLocationScreen />);

    const getBtn = screen.getByRole('button', { name: 'Obtener coordenadas actuales con GPS' });
    fireEvent.press(getBtn);

    await waitFor(() => {
      expect(screen.getByText(/19\.432608/)).toBeTruthy();
      expect(screen.getByText(/-99\.133209/)).toBeTruthy();
    });

    const sendBtn = screen.getByRole('button', { name: 'Registrar ubicación del incidente' });
    fireEvent.press(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/incidents/location',
        expect.objectContaining({
          latitude: 19.432608,
          longitude: -99.133209,
          recordedAt: expect.any(String),
        }),
      );
      expect(screen.getByText(/Ubicación del incidente registrada exitosamente/)).toBeTruthy();
    });
  });

  it('muestra estado de error si el envío falla', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Error de red al registrar ubicación'));
    await render(<IncidentLocationScreen />);

    const getBtn = screen.getByRole('button', { name: 'Obtener coordenadas actuales con GPS' });
    fireEvent.press(getBtn);

    await waitFor(() => {
      expect(screen.getByText(/19\.432608/)).toBeTruthy();
    });

    const sendBtn = screen.getByRole('button', { name: 'Registrar ubicación del incidente' });
    fireEvent.press(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Error de red al registrar ubicación')).toBeTruthy();
    });
  });
});
