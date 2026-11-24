import { act, render, screen } from '@testing-library/react-native';
import { defaultNetworkMonitor, OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner (LM-111)', () => {
  beforeEach(() => {
    defaultNetworkMonitor.setOnline(true);
  });

  it('no se muestra cuando hay conexión a internet', async () => {
    await render(<OfflineBanner monitor={defaultNetworkMonitor} />);
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });

  it('aparece cuando no hay red y desaparece al volver', async () => {
    await render(<OfflineBanner monitor={defaultNetworkMonitor} />);

    // Simular pérdida de red
    await act(async () => {
      defaultNetworkMonitor.setOnline(false);
    });
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();

    // Simular retorno de red
    await act(async () => {
      defaultNetworkMonitor.setOnline(true);
    });
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });
});
