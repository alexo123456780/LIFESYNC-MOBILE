import { useCallback, useEffect, useReducer } from 'react';
import { AppState, Linking } from 'react-native';
import { type PermissionKind, permissionMachineReducer } from '@/application/permissions-machine';

export interface DevicePermissionAdapter {
  checkStatus: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestStatus: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
}

export function useDevicePermission(_kind: PermissionKind, adapter: DevicePermissionAdapter) {
  const [state, dispatch] = useReducer(permissionMachineReducer, 'undetermined');

  const check = useCallback(async () => {
    dispatch({ type: 'REQUEST' });
    try {
      const res = await adapter.checkStatus();
      if (res.granted) {
        dispatch({ type: 'GRANT' });
      } else if (!res.canAskAgain) {
        dispatch({ type: 'DENY' });
        dispatch({ type: 'BLOCK' });
      } else {
        dispatch({ type: 'DENY' });
      }
    } catch {
      dispatch({ type: 'DENY' });
    }
  }, [adapter]);

  const request = useCallback(async () => {
    dispatch({ type: 'REQUEST' });
    try {
      const res = await adapter.requestStatus();
      if (res.granted) {
        dispatch({ type: 'GRANT' });
      } else if (!res.canAskAgain) {
        dispatch({ type: 'DENY' });
        dispatch({ type: 'BLOCK' });
      } else {
        dispatch({ type: 'DENY' });
      }
    } catch {
      dispatch({ type: 'DENY' });
    }
  }, [adapter]);

  const openSettings = useCallback(async () => {
    dispatch({ type: 'OPEN_SETTINGS' });
    try {
      await Linking.openSettings();
    } catch {
      // Ignorar fallo de apertura de ajustes
    }
  }, []);

  // Al volver a primer plano (APP_FOREGROUND), re-evaluar si estaba bloqueado
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        dispatch({ type: 'APP_FOREGROUND' });
        void check();
      }
    });
    return () => sub.remove();
  }, [check]);

  return {
    state,
    isGranted: state === 'granted',
    isBlocked: state === 'blocked',
    isDenied: state === 'denied',
    isRequesting: state === 'requesting',
    request,
    openSettings,
    check,
  };
}
