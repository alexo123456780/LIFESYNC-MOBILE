import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { TokenService } from '../src/auth/oauth/token.service.js';
import { configureApp } from '../src/common/app-setup.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

describe('CRUD /health-records y protección anti-IDOR (LM-66, LM-69, LM-71, LM-73)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaClient;
  let tokens: TokenService;
  const userIds: string[] = [];

  const createAuthenticatedUser = async () => {
    const user = await prisma.user.create({
      data: {
        email: `health-${randomUUID()}@prueba.test`,
        passwordHash: await argon2.hash('x', { type: argon2.argon2id }),
      },
    });
    userIds.push(user.id);
    const accessToken = await tokens.signAccessToken(user.id);
    return { id: user.id, token: accessToken };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, 'test');
    await app.init();
    prisma = app.get(PrismaClient);
    tokens = app.get(TokenService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('perfil: GET vacío, PUT persiste, rechaza tipo de sangre inválido y campos extra (400)', async () => {
    const user = await createAuthenticatedUser();

    const empty = await request(app.getHttpServer())
      .get('/api/v1/health-records/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(empty.body).toEqual({ id: null, bloodType: null, notes: null });

    const saved = await request(app.getHttpServer())
      .put('/api/v1/health-records/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ bloodType: 'O_POS', notes: 'Asma leve' })
      .expect(200);
    expect(saved.body).toMatchObject({ bloodType: 'O_POS', notes: 'Asma leve' });

    await request(app.getHttpServer())
      .put('/api/v1/health-records/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ bloodType: 'INVALID', extra: true })
      .expect(400);
  });

  it('alergias, medicamentos y contactos: CRUD completo y anti-IDOR 404 entre Usuario A y B', async () => {
    const userA = await createAuthenticatedUser();
    const userB = await createAuthenticatedUser();

    const allergy = await request(app.getHttpServer())
      .post('/api/v1/health-records/allergies')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Penicilina', severity: 'SEVERE' })
      .expect(201);

    const med = await request(app.getHttpServer())
      .post('/api/v1/health-records/medications')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Insulina',
        dose: '10 UI',
        frequencyHours: 8,
        controlled: true,
        startsAt: '2026-11-23T08:00:00.000Z',
        endsAt: '2026-11-30T08:00:00.000Z',
      })
      .expect(201);
    expect(med.body.controlled).toBe(true);

    // endsAt < startsAt -> 400
    await request(app.getHttpServer())
      .post('/api/v1/health-records/medications')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Insulina',
        dose: '10 UI',
        frequencyHours: 8,
        startsAt: '2026-11-25T08:00:00.000Z',
        endsAt: '2026-11-24T08:00:00.000Z',
      })
      .expect(400);

    const contact = await request(app.getHttpServer())
      .post('/api/v1/health-records/contacts')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'María López', phone: '+52 999 123 4567', relationship: 'Madre' })
      .expect(201);

    // Usuario B NO puede editar ni borrar registros de Usuario A -> 404
    await request(app.getHttpServer())
      .put(`/api/v1/health-records/allergies/${allergy.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ name: 'Hack', severity: 'MILD' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/health-records/medications/${med.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/health-records/contacts/${contact.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(404);

    // Usuario A borra sus propios registros -> 204
    await request(app.getHttpServer())
      .delete(`/api/v1/health-records/allergies/${allergy.body.id}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(204);
  });
});
