// Dominio puro: no importa Expo, React ni React Native. [LM-100]

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'blocked';
export type PermissionKind = 'camera' | 'location';

export interface PermissionState {
  camera: PermissionStatus;
  location: PermissionStatus;
}

export type PermissionAction =
  { type: 'SET'; kind: PermissionKind; status: PermissionStatus } | { type: 'RESET' };

export const initialPermissionState: PermissionState = {
  camera: 'undetermined',
  location: 'undetermined',
};

/** Reducer puro para el estado de permisos del dispositivo. */
export function permissionsReducer(
  state: PermissionState,
  action: PermissionAction,
): PermissionState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.kind]: action.status };
    case 'RESET':
      return initialPermissionState;
    default:
      return state;
  }
}

/** Devuelve true si se puede usar la cámara. */
export function canUseCamera(state: PermissionState): boolean {
  return state.camera === 'granted';
}

/** Devuelve true si se puede usar la ubicación. */
export function canUseLocation(state: PermissionState): boolean {
  return state.location === 'granted';
}

/** Devuelve true si todos los permisos están concedidos. */
export function isFullyGranted(state: PermissionState): boolean {
  return canUseCamera(state) && canUseLocation(state);
}
