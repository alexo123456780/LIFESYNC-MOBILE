import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto.js';

const errorsFor = async (input: unknown) =>
  (
    await validate(plainToInstance(RegisterDto, input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

const valid = { email: 'ana@correo.com', password: 'una-contraseña-larga' };

describe('RegisterDto', () => {
  it('acepta datos válidos', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it.each([
    ['correo sin dominio', { ...valid, email: 'ana@correo' }],
    ['correo vacío', { ...valid, email: '' }],
    ['correo demasiado largo', { ...valid, email: `${'a'.repeat(250)}@b.co` }],
    ['correo que no es texto', { ...valid, email: 123 }],
    ['inyección SQL en el correo', { ...valid, email: "' OR 1=1 --" }],
    ['contraseña corta (11)', { ...valid, password: 'x'.repeat(11) }],
    ['contraseña demasiado larga (129)', { ...valid, password: 'x'.repeat(129) }],
    ['contraseña que no es texto', { ...valid, password: { $ne: null } }],
    ['campo extra', { ...valid, role: 'admin' }],
  ])('rechaza: %s', async (_nombre, input) => {
    expect((await errorsFor(input)).length).toBeGreaterThan(0);
  });

  it('acepta los límites exactos de la contraseña (12 y 128)', async () => {
    expect(await errorsFor({ ...valid, password: 'x'.repeat(12) })).toEqual([]);
    expect(await errorsFor({ ...valid, password: 'x'.repeat(128) })).toEqual([]);
  });
});
