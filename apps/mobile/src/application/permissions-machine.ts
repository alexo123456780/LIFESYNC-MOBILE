// Máquina de estados pura de permisos de hardware (PRD 9.4, RF-M15, LM-100).
// No depende de Expo, React ni React Native.

export type PermissionState = 'undetermined' | 'requesting' | 'granted' | 'denied' | 'blocked';
export type PermissionKind = 'camera' | 'location';

export type PermissionEvent =
  | { type: 'REQUEST' }
  | { type: 'GRANT' }
  | { type: 'DENY' }
  | { type: 'BLOCK' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'APP_FOREGROUND' }
  | { type: 'REVOKED' };

/** Reducer puro para la máquina de estados de un permiso individual (Tabla 9.4 del PRD). */
export function permissionMachineReducer(
  state: PermissionState,
  event: PermissionEvent,
): PermissionState {
  switch (state) {
    case 'undetermined':
      if (event.type === 'REQUEST') return 'requesting';
      break;

    case 'requesting':
      if (event.type === 'GRANT') return 'granted';
      if (event.type === 'DENY') return 'denied';
      break;

    case 'denied':
      if (event.type === 'REQUEST') return 'requesting';
      if (event.type === 'BLOCK') return 'blocked';
      break;

    case 'blocked':
      if (event.type === 'OPEN_SETTINGS' || event.type === 'APP_FOREGROUND') {
        return 'undetermined';
      }
      break;

    case 'granted':
      if (event.type === 'REVOKED') return 'denied';
      break;
  }

  return state;
}

export interface AppPermissionsState {
  camera: PermissionState;
  location: PermissionState;
}

export const initialAppPermissionsState: AppPermissionsState = {
  camera: 'undetermined',
  location: 'undetermined',
};

export type AppPermissionsAction =
  { permission: PermissionKind; event: PermissionEvent } | { type: 'RESET' };

/** Reducer para gestionar las dos instancias de permisos: cámara y ubicación. */
export function appPermissionsReducer(
  state: AppPermissionsState,
  action: AppPermissionsAction,
): AppPermissionsState {
  if ('type' in action && action.type === 'RESET') {
    return initialAppPermissionsState;
  }
  if ('permission' in action) {
    return {
      ...state,
      [action.permission]: permissionMachineReducer(state[action.permission], action.event),
    };
  }
  return state;
}
