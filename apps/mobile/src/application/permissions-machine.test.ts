import {
  appPermissionsReducer,
  initialAppPermissionsState,
  permissionMachineReducer,
} from './permissions-machine';

describe('permissionMachineReducer (Tabla 9.4 PRD)', () => {
  it('Fila 1: undetermined + REQUEST -> requesting', () => {
    expect(permissionMachineReducer('undetermined', { type: 'REQUEST' })).toBe('requesting');
  });

  it('Fila 2: requesting + GRANT -> granted', () => {
    expect(permissionMachineReducer('requesting', { type: 'GRANT' })).toBe('granted');
  });

  it('Fila 3: requesting + DENY -> denied', () => {
    expect(permissionMachineReducer('requesting', { type: 'DENY' })).toBe('denied');
  });

  it('Fila 4: denied + REQUEST -> requesting', () => {
    expect(permissionMachineReducer('denied', { type: 'REQUEST' })).toBe('requesting');
  });

  it('Fila 5: denied + BLOCK -> blocked', () => {
    expect(permissionMachineReducer('denied', { type: 'BLOCK' })).toBe('blocked');
  });

  it('Fila 6a: blocked + OPEN_SETTINGS -> undetermined', () => {
    expect(permissionMachineReducer('blocked', { type: 'OPEN_SETTINGS' })).toBe('undetermined');
  });

  it('Fila 6b: blocked + APP_FOREGROUND -> undetermined', () => {
    expect(permissionMachineReducer('blocked', { type: 'APP_FOREGROUND' })).toBe('undetermined');
  });

  it('Fila 7: granted + REVOKED -> denied', () => {
    expect(permissionMachineReducer('granted', { type: 'REVOKED' })).toBe('denied');
  });

  it('deja el estado sin cambios ante eventos no válidos para el estado actual', () => {
    expect(permissionMachineReducer('undetermined', { type: 'GRANT' })).toBe('undetermined');
    expect(permissionMachineReducer('undetermined', { type: 'BLOCK' })).toBe('undetermined');
    expect(permissionMachineReducer('granted', { type: 'REQUEST' })).toBe('granted');
    expect(permissionMachineReducer('blocked', { type: 'GRANT' })).toBe('blocked');
  });
});

describe('appPermissionsReducer', () => {
  it('gestiona de manera independiente la cámara y la ubicación', () => {
    let state = initialAppPermissionsState;
    state = appPermissionsReducer(state, { permission: 'camera', event: { type: 'REQUEST' } });
    state = appPermissionsReducer(state, { permission: 'camera', event: { type: 'GRANT' } });

    expect(state.camera).toBe('granted');
    expect(state.location).toBe('undetermined');

    state = appPermissionsReducer(state, { permission: 'location', event: { type: 'REQUEST' } });
    state = appPermissionsReducer(state, { permission: 'location', event: { type: 'DENY' } });

    expect(state.camera).toBe('granted');
    expect(state.location).toBe('denied');
  });

  it('soporta RESET al estado inicial', () => {
    let state = initialAppPermissionsState;
    state = appPermissionsReducer(state, { permission: 'camera', event: { type: 'REQUEST' } });
    state = appPermissionsReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialAppPermissionsState);
  });
});
