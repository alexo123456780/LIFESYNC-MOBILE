import { validateRegister } from './register-schema';

const valid = { email: 'ana@correo.com', password: 'una-contraseña-larga' };

describe('validateRegister', () => {
  it('acepta datos válidos y normaliza el correo', () => {
    expect(validateRegister({ ...valid, email: '  Ana@Correo.COM ' })).toEqual({
      ok: true,
      value: { email: 'ana@correo.com', password: valid.password },
    });
  });

  it.each([
    ['correo vacío', { ...valid, email: '' }, 'email'],
    ['correo mal formado', { ...valid, email: 'ana@correo' }, 'email'],
    ['correo sin arroba', { ...valid, email: 'ana.correo.com' }, 'email'],
    ['correo demasiado largo', { ...valid, email: `${'a'.repeat(250)}@b.co` }, 'email'],
    ['contraseña corta', { ...valid, password: 'x'.repeat(11) }, 'password'],
    ['contraseña demasiado larga', { ...valid, password: 'x'.repeat(129) }, 'password'],
  ] as const)('rechaza: %s', (_nombre, input, field) => {
    const result = validateRegister(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toBeTruthy();
  });

  it('acepta los límites exactos de la contraseña (12 y 128)', () => {
    expect(validateRegister({ ...valid, password: 'x'.repeat(12) }).ok).toBe(true);
    expect(validateRegister({ ...valid, password: 'x'.repeat(128) }).ok).toBe(true);
  });

  it('reporta los errores de ambos campos a la vez, en español', () => {
    const result = validateRegister({ email: 'mal', password: 'corta' });
    expect(result).toEqual({
      ok: false,
      errors: {
        email: 'Escribe un correo válido',
        password: 'La contraseña debe tener al menos 12 caracteres',
      },
    });
  });
});
