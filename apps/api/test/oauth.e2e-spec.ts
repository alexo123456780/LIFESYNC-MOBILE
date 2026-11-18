import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { API_PREFIX } from '../src/common/api-prefix.js';
import { challengeFromVerifier } from '../src/auth/oauth/pkce.js';
import { OAuthService } from '../src/auth/oauth/oauth.service.js';
import { TokenService, hashToken } from '../src/auth/oauth/token.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const REDIRECT_URI = 'lifesync://oauth/callback';
const PASSWORD = 'contraseña-de-prueba-123';

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  await app.init();
  return app;
}

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: challengeFromVerifier(verifier) };
};

const authorizeQuery = (challenge: string, extra: Record<string, string> = {}) => ({
  response_type: 'code',
  client_id: 'lifesync-mobile',
  redirect_uri: REDIRECT_URI,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  state: 'estado-123',
  ...extra,
});

const csrfFrom = (response: request.Response): string => {
  const cookie = (response.headers['set-cookie'] as unknown as string[]).find((c) =>
    c.startsWith('oauth_csrf='),
  );
  return cookie!.split(';')[0]!.split('=')[1]!;
};

describe('servidor OAuth 2.0 con PKCE', () => {
  let prisma: PrismaClient;
  let userId: string;
  const email = `oauth-${randomUUID()}@prueba.test`;

  beforeAll(async () => {
    const app = await createApp();
    prisma = app.get(PrismaClient);
    const user = await prisma.user.create({
      data: { email, passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }) },
    });
    userId = user.id;
    await app.close();
  });

  afterAll(async () => {
    const app = await createApp();
    await app.get(PrismaClient).user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('GET /oauth/authorize', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createApp();
    });
    afterAll(async () => {
      await app.close();
    });

    it('muestra la página de login con CSP restrictiva y cookie CSRF', async () => {
      const { challenge } = pkce();
      const res = await request(app.getHttpServer())
        .get('/api/v1/oauth/authorize')
        .query(authorizeQuery(challenge))
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.headers['content-security-policy']).toContain('form-action');
      expect(res.headers['cache-control']).toBe('no-store');
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
      expect(cookie).toMatch(/oauth_csrf=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(res.text).toContain(`name="csrf" value="${csrfFrom(res)}"`);
      expect(res.text).toContain('name="state" value="estado-123"');
    });

    it.each([
      ['redirect_uri no registrado', { redirect_uri: 'https://evil.test/cb' }],
      ['sin code_challenge', { code_challenge: '' }],
      ['code_challenge_method plain', { code_challenge_method: 'plain' }],
      ['sin state', { state: '' }],
    ])('responde 400 con %s', async (_nombre, cambio) => {
      const { challenge } = pkce();
      const res = await request(app.getHttpServer())
        .get('/api/v1/oauth/authorize')
        .query(authorizeQuery(challenge, cambio))
        .expect(400);
      expect(res.body).toMatchObject({ error: 'invalid_request' });
    });
  });

  describe('login, código de autorización y token', () => {
    let app: INestApplication;
    let prisma2: PrismaClient;
    // Aplicación nueva por prueba: así cada una parte con el contador de intentos en cero.
    beforeEach(async () => {
      app = await createApp();
      prisma2 = app.get(PrismaClient);
    });
    afterEach(async () => {
      await app.close();
    });

    const openLogin = async (challenge: string) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/oauth/authorize')
        .query(authorizeQuery(challenge))
        .expect(200);
      return csrfFrom(res);
    };
    const postLogin = (challenge: string, csrf: string | undefined, form: Record<string, string>) =>
      request(app.getHttpServer())
        .post('/api/v1/oauth/authorize')
        .set('Cookie', csrf ? [`oauth_csrf=${csrf}`] : [])
        .type('form')
        .send({
          ...authorizeQuery(challenge),
          csrf: csrf ?? '',
          email,
          password: PASSWORD,
          ...form,
        });
    const exchange = (body: Record<string, string>) =>
      request(app.getHttpServer()).post('/api/v1/oauth/token').type('form').send(body);
    // Códigos creados sin pasar por el login para no consumir el límite de intentos.
    const newCode = async (challenge: string) =>
      app
        .get(OAuthService)
        .issueAuthorizationCode(userId, { redirectUri: REDIRECT_URI, codeChallenge: challenge });

    it('credenciales incorrectas responden 401 y vuelven a mostrar el login', async () => {
      const { challenge } = pkce();
      const csrf = await openLogin(challenge);
      const res = await postLogin(challenge, csrf, { password: 'incorrecta' }).expect(401);
      expect(res.text).toContain('Correo o contraseña incorrectos');
    });

    it('rechaza el envío sin token CSRF válido', async () => {
      const { challenge } = pkce();
      await postLogin(challenge, undefined, {}).expect(400);
    });

    it('login correcto: 302 a lifesync://oauth/callback con code y el mismo state; solo se guarda el hash', async () => {
      const { challenge } = pkce();
      const csrf = await openLogin(challenge);
      const res = await postLogin(challenge, csrf, {}).expect(302);

      const location = new URL(res.headers.location as string);
      expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(REDIRECT_URI);
      expect(location.searchParams.get('state')).toBe('estado-123');
      const code = location.searchParams.get('code')!;

      expect(await prisma2.authorizationCode.count({ where: { codeHash: code } })).toBe(0);
      const row = await prisma2.authorizationCode.findUniqueOrThrow({
        where: { codeHash: hashToken(code) },
      });
      expect(row).toMatchObject({
        userId,
        redirectUri: REDIRECT_URI,
        codeChallenge: challenge,
        usedAt: null,
      });
      const ttl = row.expiresAt.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(50_000);
      expect(ttl).toBeLessThanOrEqual(60_000);
    });

    it('canjea el código una sola vez y entrega un JWT ES256 de 15 minutos y un refresh token con solo su hash', async () => {
      const { verifier, challenge } = pkce();
      const code = await newCode(challenge);

      const res = await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }).expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toMatchObject({ token_type: 'Bearer', expires_in: 900 });
      const header = JSON.parse(
        Buffer.from(res.body.access_token.split('.')[0], 'base64url').toString(),
      );
      expect(header.alg).toBe('ES256');
      const payload = await app.get(TokenService).verifyAccessToken(res.body.access_token);
      expect(payload).toMatchObject({ sub: userId, iss: 'lifesync-api', aud: 'lifesync-mobile' });
      expect(payload.exp! - payload.iat!).toBe(900);

      const refresh = res.body.refresh_token as string;
      expect(await prisma2.refreshToken.count({ where: { tokenHash: refresh } })).toBe(0);
      const stored = await prisma2.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hashToken(refresh) },
      });
      expect(stored).toMatchObject({ userId, revokedAt: null });

      // Segundo canje del mismo código: 400.
      const replay = await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }).expect(400);
      expect(replay.body).toMatchObject({ error: 'invalid_grant' });
    });

    it('un code_verifier distinto responde 400 y quema el código', async () => {
      const { verifier, challenge } = pkce();
      const code = await newCode(challenge);
      await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: pkce().verifier,
        redirect_uri: REDIRECT_URI,
      }).expect(400);
      await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }).expect(400);
    });

    it('un redirect_uri distinto responde 400', async () => {
      const { verifier, challenge } = pkce();
      const code = await newCode(challenge);
      await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: 'lifesync://oauth/otro',
      }).expect(400);
    });

    it('un código vencido responde 400', async () => {
      const { verifier, challenge } = pkce();
      const code = await newCode(challenge);
      await prisma2.authorizationCode.update({
        where: { codeHash: hashToken(code) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }).expect(400);
    });

    it('un grant_type no soportado responde 400 unsupported_grant_type', async () => {
      const res = await exchange({ grant_type: 'password' }).expect(400);
      expect(res.body.error).toBe('unsupported_grant_type');
    });
  });

  describe('límite de intentos (5 por minuto)', () => {
    it('el sexto intento de login responde 429', async () => {
      const app = await createApp();
      const { challenge } = pkce();
      const csrf = csrfFrom(
        await request(app.getHttpServer())
          .get('/api/v1/oauth/authorize')
          .query(authorizeQuery(challenge)),
      );
      const intento = () =>
        request(app.getHttpServer())
          .post('/api/v1/oauth/authorize')
          .set('Cookie', [`oauth_csrf=${csrf}`])
          .type('form')
          .send({ ...authorizeQuery(challenge), csrf, email, password: 'incorrecta' });
      for (let i = 0; i < 5; i += 1) await intento().expect(401);
      await intento().expect(429);
      await app.close();
    });

    it('el sexto intento en /oauth/token responde 429', async () => {
      const app = await createApp();
      const intento = () =>
        request(app.getHttpServer())
          .post('/api/v1/oauth/token')
          .type('form')
          .send({ grant_type: 'password' });
      for (let i = 0; i < 5; i += 1) await intento().expect(400);
      await intento().expect(429);
      await app.close();
    });
  });
});
