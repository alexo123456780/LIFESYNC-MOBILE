import { ConflictException } from '@nestjs/common';
import { RegisterService } from './register.service.js';

interface CreateArgs {
  data: { email: string; passwordHash: string };
  select: Record<string, boolean>;
}

// Doble manual de Prisma: registra las llamadas y permite simular errores de la base.
let calls: CreateArgs[] = [];
let behavior: (args: CreateArgs) => Promise<unknown> = async ({ data }) => ({
  id: 'u1',
  email: data.email,
  createdAt: new Date(),
});
const service = new RegisterService({
  user: {
    create: (args: CreateArgs) => {
      calls.push(args);
      return behavior(args);
    },
  },
} as never);

describe('RegisterService', () => {
  beforeEach(() => {
    calls = [];
    behavior = async ({ data }) => ({ id: 'u1', email: data.email, createdAt: new Date() });
  });

  it('guarda el correo normalizado y un hash Argon2id, y no devuelve el hash', async () => {
    const result = await service.register({
      email: '  Ana@Correo.COM ',
      password: 'una-contraseña-larga',
    });

    const { data, select } = calls[0]!;
    expect(data.email).toBe('ana@correo.com');
    expect(data.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(JSON.stringify(data)).not.toContain('una-contraseña-larga');
    expect(select).toEqual({ id: true, email: true, createdAt: true });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('un correo repetido (violación de unicidad de Prisma) responde 409', async () => {
    behavior = async () => {
      throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    };
    await expect(
      service.register({ email: 'a@b.co', password: 'una-contraseña-larga' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga cualquier otro error de la base', async () => {
    behavior = async () => {
      throw new Error('conexión perdida');
    };
    await expect(
      service.register({ email: 'a@b.co', password: 'una-contraseña-larga' }),
    ).rejects.toThrow('conexión perdida');
  });
});
