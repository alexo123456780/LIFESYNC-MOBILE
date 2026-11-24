import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import { useDevicePermission, type DevicePermissionAdapter } from './use-device-permission';

function TestPermissionComponent({
  adapter,
  onHook,
}: {
  adapter: DevicePermissionAdapter;
  onHook: (hook: ReturnType<typeof useDevicePermission>) => void;
}) {
  const hook = useDevicePermission('camera', adapter);
  onHook(hook);
  return null;
}

describe('useDevicePermission hook (LM-101)', () => {
  let mockAdapter: DevicePermissionAdapter;
  let linkingSpy: jest.SpyInstance;
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
    mockAdapter = {
      checkStatus: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
      requestStatus: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    };
    linkingSpy = jest.spyOn(Linking, 'openSettings').mockImplementation(async () => {});
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      event: string,
      handler: (state: string) => void,
    ) => {
      if (event === 'change') {
        appStateListener = handler;
      }
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('inicia en undetermined y pasa a granted tras solicitar con éxito', async () => {
    let hook!: ReturnType<typeof useDevicePermission>;
    await render(<TestPermissionComponent adapter={mockAdapter} onHook={(h) => (hook = h)} />);
    expect(hook.state).toBe('undetermined');

    await act(async () => {
      await hook.request();
    });

    expect(hook.state).toBe('granted');
    expect(hook.isGranted).toBe(true);
  });

  it('pasa a denied si el usuario rechaza la petición', async () => {
    mockAdapter.requestStatus = jest.fn().mockResolvedValue({ granted: false, canAskAgain: true });
    let hook!: ReturnType<typeof useDevicePermission>;
    await render(<TestPermissionComponent adapter={mockAdapter} onHook={(h) => (hook = h)} />);

    await act(async () => {
      await hook.request();
    });

    expect(hook.state).toBe('denied');
    expect(hook.isDenied).toBe(true);
  });

  it('pasa a blocked si canAskAgain es false y permite abrir ajustes', async () => {
    mockAdapter.requestStatus = jest.fn().mockResolvedValue({ granted: false, canAskAgain: false });
    let hook!: ReturnType<typeof useDevicePermission>;
    await render(<TestPermissionComponent adapter={mockAdapter} onHook={(h) => (hook = h)} />);

    await act(async () => {
      await hook.request();
    });

    expect(hook.state).toBe('blocked');
    expect(hook.isBlocked).toBe(true);

    await act(async () => {
      await hook.openSettings();
    });

    expect(linkingSpy).toHaveBeenCalledTimes(1);
  });

  it('se re-evalúa al regresar a la app (APP_FOREGROUND)', async () => {
    mockAdapter.requestStatus = jest.fn().mockResolvedValue({ granted: false, canAskAgain: false });
    let hook!: ReturnType<typeof useDevicePermission>;
    await render(<TestPermissionComponent adapter={mockAdapter} onHook={(h) => (hook = h)} />);

    await act(async () => {
      await hook.request();
    });
    expect(hook.state).toBe('blocked');

    // Ahora simular que el usuario lo activó en ajustes
    mockAdapter.checkStatus = jest.fn().mockResolvedValue({ granted: true, canAskAgain: true });

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => {
      expect(hook.state).toBe('granted');
    });
  });
});
