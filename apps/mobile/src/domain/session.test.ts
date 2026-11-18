import { resolveGuardRedirect } from './session';

describe('resolveGuardRedirect', () => {
  it('sin sesión, una ruta de (app) redirige a la pantalla de bienvenida de (auth)', () => {
    expect(resolveGuardRedirect('unauthenticated', '(app)')).toBe('/welcome');
  });

  it('con sesión, una ruta de (auth) redirige a (app)', () => {
    expect(resolveGuardRedirect('authenticated', '(auth)')).toBe('/');
  });

  it('no redirige cuando la pila coincide con la sesión', () => {
    expect(resolveGuardRedirect('authenticated', '(app)')).toBeNull();
    expect(resolveGuardRedirect('unauthenticated', '(auth)')).toBeNull();
  });

  it('no redirige mientras se restaura la sesión', () => {
    expect(resolveGuardRedirect('loading', '(app)')).toBeNull();
    expect(resolveGuardRedirect('loading', '(auth)')).toBeNull();
  });
});
