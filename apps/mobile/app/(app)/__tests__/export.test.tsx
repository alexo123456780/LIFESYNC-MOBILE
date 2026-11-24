import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import ExportScreen from '../export';
import { api } from '@/infrastructure/http/api';

jest.mock('@/infrastructure/http/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('ExportScreen', () => {
  const shareSpy = jest
    .spyOn(Share, 'share')
    .mockImplementation(jest.fn().mockResolvedValue({ action: 'sharedAction' }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra botones de exportar JSON y CSV', async () => {
    await render(<ExportScreen />);
    expect(screen.getByRole('button', { name: 'Exportar historial en formato JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exportar historial en formato CSV' })).toBeTruthy();
  });

  it('exporta JSON conectándose a la API y abriendo Share', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ profile: { bloodType: 'O_POS' } });
    await render(<ExportScreen />);

    const jsonBtn = screen.getByRole('button', { name: 'Exportar historial en formato JSON' });
    fireEvent.press(jsonBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/export?format=json');
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/^historial-.*\.json$/),
          message: expect.stringContaining('"bloodType": "O_POS"'),
        }),
      );
    });
  });

  it('exporta CSV conectándose a la API y abriendo Share', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce('type,field,value\nprofile,bloodType,O_POS');
    await render(<ExportScreen />);

    const csvBtn = screen.getByRole('button', { name: 'Exportar historial en formato CSV' });
    fireEvent.press(csvBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/export?format=csv');
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/^historial-.*\.csv$/),
          message: expect.stringContaining('type,field,value'),
        }),
      );
    });
  });

  it('muestra mensaje de error si la petición falla', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Fallo de red'));
    await render(<ExportScreen />);

    const jsonBtn = screen.getByRole('button', { name: 'Exportar historial en formato JSON' });
    fireEvent.press(jsonBtn);

    await waitFor(() => {
      expect(screen.getByText('Fallo de red')).toBeTruthy();
    });
  });
});
