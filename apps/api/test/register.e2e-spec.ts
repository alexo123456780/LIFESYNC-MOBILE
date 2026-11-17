import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { API_PREFIX } from '../src/common/api-prefix.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const PASSWORD = 'contraseña-secreta-única-123';

describe('POST /api/v1/auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const emails: string[] = [];
  const newEmail = () => {
    const email = `registro-${randomUUID()}@prueba.test`;
    emails.push(email);
    return email;
  };
  const register = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(body as object);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    prisma = app.get(PrismaClient);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('con datos válidos responde 201 sin passwordHash y guarda un hash Argon2id', async () => {
    const email = newEmail();

    const res = await register({ email, password: PASSWORD }).expect(201);

    expect(res.body).toMatchObject({ email });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    const row = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(row.passwordHash).not.toContain(PASSWORD);
  });

  it('normaliza el correo: el duplicado en otra capitalización responde 409', async () => {
    const email = newEmail();
    await register({ email, password: PASSWORD }).expect(201);

    const res = await register({ email: email.toUpperCase(), password: PASSWORD }).expect(409);
    expect(res.body).toMatchObject({ statusCode: 409 });
  });

  it.each([
    ['campo extra', { role: 'admin' }],
    ['contraseña corta', { password: 'corta' }],
    ['contraseña demasiado larga', { password: 'x'.repeat(129) }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['tipos erróneos', { email: 42, password: ['a'] }],
    ['inyección NoSQL', { email: { $ne: null } }],
  ])('responde 400 con %s', async (_nombre, cambio) => {
    const res = await register({ email: newEmail(), password: PASSWORD, ...cambio }).expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('un cuerpo vacío responde 400', async () => {
    await register({}).expect(400);
  });

  it('la contraseña no aparece en ningún log', async () => {
    const captured: string[] = [];
    const writers = [process.stdout, process.stderr].map((stream) => {
      const original = stream.write.bind(stream);
      stream.write = ((chunk: string | Uint8Array, ...rest: never[]) => {
        captured.push(String(chunk));
        return original(chunk, ...rest);
      }) as typeof stream.write;
      return () => {
        stream.write = original;
      };
    });
    try {
      await register({ email: newEmail(), password: PASSWORD }).expect(201);
      await register({ email: newEmail(), password: PASSWORD, extra: true }).expect(400);
    } finally {
      writers.forEach((restore) => restore());
    }
    expect(captured.join('')).not.toContain(PASSWORD);
  });
});
