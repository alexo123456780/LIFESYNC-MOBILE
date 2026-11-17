import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { API_PREFIX } from '../src/common/api-prefix.js';
import { challengeFromVerifier } from '../src/auth/oauth/pkce.js';
import { OAuthService } from '../src/auth/oauth/oauth.service.js';
import { type TokenResponse, TokenService, hashToken } from '../src/auth/oauth/token.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const REDIRECT_URI = 'lifesync://oauth/callback';

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  await app.init();
  return app;
}

describe('refresh token rotativo y logout', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const userIds: string[] = [];

  const createUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `refresh-${randomUUID()}@prueba.test`,
        passwordHash: await argon2.hash('x', { type: argon2.argon2id }),
      },
    });
    userIds.push(user.id);
    return user.id;
  };
  /** Obtiene un par de tokens inicial por el flujo real: código de autorización y canje PKCE. */
  const login = async (userId: string): Promise<TokenResponse> => {
    const verifier = randomBytes(32).toString('base64url');
    const code = await app.get(OAuthService).issueAuthorizationCode(userId, {
      redirectUri: REDIRECT_URI,
      codeChallenge: challengeFromVerifier(verifier),
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      })
      .expect(200);
    return res.body as TokenResponse;
  };
  const refresh = (token: string) =>
    request(app.getHttpServer())
      .post('/api/v1/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: token });
  const logout = (accessToken: string | undefined, refreshToken: string) => {
    const req = request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refresh_token: refreshToken });
    return accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req;
  };
  const stored = (token: string) =>
    prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });

  // Aplicación nueva por prueba: cada una parte con el contador de intentos en cero.
  beforeEach(async () => {
    app = await createApp();
    prisma = app.get(PrismaClient);
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
    await app.close();
  });

  describe('POST /oauth/token con grant_type=refresh_token', () => {
    it('devuelve un par nuevo en la misma familia y deja inutilizable el anterior', async () => {
      const first = await login(await createUser());

      const res = await refresh(first.refresh_token).expect(200);

      expect(res.body.refresh_token).not.toBe(first.refresh_token);
      expect(res.body.access_token).not.toBe(first.access_token);
      await app.get(TokenService).verifyAccessToken(res.body.access_token);
      const [old, next] = await Promise.all([
        stored(first.refresh_token),
        stored(res.body.refresh_token),
      ]);
      expect(old.revokedAt).not.toBeNull();
      expect(next).toMatchObject({ familyId: old.familyId, revokedAt: null });
      // En la base solo existe el hash, nunca el valor en claro.
      expect(
        await prisma.refreshToken.count({ where: { tokenHash: res.body.refresh_token } }),
      ).toBe(0);
    });

    it('reutilizar un refresh ya rotado responde 401 y revoca toda la familia', async () => {
      const first = await login(await createUser());
      const second = (await refresh(first.refresh_token).expect(200)).body as TokenResponse;

      const reuse = await refresh(first.refresh_token).expect(401);
      expect(reuse.body).toMatchObject({ error: 'invalid_grant' });

      expect((await stored(second.refresh_token)).revokedAt).not.toBeNull();
      await refresh(second.refresh_token).expect(401);
    });

    it('no afecta a las demás familias del mismo usuario', async () => {
      const userId = await createUser();
      const sesionA = await login(userId);
      const sesionB = await login(userId);

      await refresh(sesionA.refresh_token).expect(200);
      await refresh(sesionA.refresh_token).expect(401); // reutilización: revoca solo la familia A

      expect((await stored(sesionB.refresh_token)).revokedAt).toBeNull();
      await refresh(sesionB.refresh_token).expect(200);
    });

    it.each([
      ['desconocido', 'token-que-no-existe'],
      ['vacío', ''],
    ])('un refresh token %s responde 401', async (_nombre, token) => {
      await refresh(token).expect(401);
    });

    it('un refresh token vencido responde 401', async () => {
      const first = await login(await createUser());
      await prisma.refreshToken.update({
        where: { tokenHash: hashToken(first.refresh_token) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await refresh(first.refresh_token).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('responde 204, revoca el refresh y ya no se puede canjear', async () => {
      const tokens = await login(await createUser());

      await logout(tokens.access_token, tokens.refresh_token).expect(204);

      expect((await stored(tokens.refresh_token)).revokedAt).not.toBeNull();
      await refresh(tokens.refresh_token).expect(401);
    });

    it('revoca también los refresh tokens rotados de la misma familia', async () => {
      const first = await login(await createUser());
      const second = (await refresh(first.refresh_token).expect(200)).body as TokenResponse;

      await logout(second.access_token, second.refresh_token).expect(204);

      expect((await stored(second.refresh_token)).revokedAt).not.toBeNull();
    });

    it('sin access token válido responde 401', async () => {
      const tokens = await login(await createUser());
      await logout(undefined, tokens.refresh_token).expect(401);
      await logout('token.invalido.firma', tokens.refresh_token).expect(401);
      expect((await stored(tokens.refresh_token)).revokedAt).toBeNull();
    });

    it('sin refresh_token responde 400', async () => {
      const tokens = await login(await createUser());
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send({})
        .expect(400);
    });

    it('no revoca el refresh token de otro usuario', async () => {
      const mio = await login(await createUser());
      const ajeno = await login(await createUser());

      await logout(mio.access_token, ajeno.refresh_token).expect(204);

      expect((await stored(ajeno.refresh_token)).revokedAt).toBeNull();
    });
  });
});
