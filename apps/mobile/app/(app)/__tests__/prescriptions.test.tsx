import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PrescriptionsScreen from '../prescriptions';
import { api } from '@/infrastructure/http/api';

jest.mock('@/infrastructure/http/api', () => ({
  api: {
    post: jest.fn().mockResolvedValue({ id: 'rx-1' }),
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

describe('PrescriptionsScreen (LM-97)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite capturar foto y enviarla a la API', async () => {
    await render(<PrescriptionsScreen />);

    const captureBtn = screen.getByRole('button', { name: 'Capturar foto con la cámara' });
    await act(async () => {
      fireEvent.press(captureBtn);
    });

    const uploadBtn = screen.getByRole('button', { name: 'Guardar y subir receta médica' });
    await act(async () => {
      fireEvent.press(uploadBtn);
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/prescriptions',
        expect.objectContaining({ data: expect.any(String) }),
      );
      expect(screen.getByText(/Receta médica guardada/)).toBeTruthy();
    });
  });

  it('permite captura manual cuando se usa la opción alternativa (degradación elegante)', async () => {
    await render(<PrescriptionsScreen />);

    const input = screen.getByLabelText('Detalles de la receta');
    await act(async () => {
      fireEvent.changeText(input, 'Paracetamol 500mg');
    });

    const uploadBtn = screen.getByRole('button', { name: 'Guardar y subir receta médica' });
    await act(async () => {
      fireEvent.press(uploadBtn);
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/prescriptions',
        expect.objectContaining({ data: expect.any(String) }),
      );
    });
  });

  it('muestra mensaje de error si la subida falla', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Fallo al subir a la API'));
    await render(<PrescriptionsScreen />);

    const captureBtn = screen.getByRole('button', { name: 'Capturar foto con la cámara' });
    await act(async () => {
      fireEvent.press(captureBtn);
    });

    const uploadBtn = screen.getByRole('button', { name: 'Guardar y subir receta médica' });
    await act(async () => {
      fireEvent.press(uploadBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Fallo al subir a la API')).toBeTruthy();
    });
  });
});
