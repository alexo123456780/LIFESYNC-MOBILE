import { generateKeyPairSync } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';
import { TokenService, hashToken } from './token.service.js';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const env: Record<string, string> = {
  JWT_PRIVATE_KEY_B64: Buffer.from(privatePem).toString('base64'),
  JWT_PUBLIC_KEY_B64: Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString(
    'base64',
  ),
  JWT_ISSUER: 'lifesync-api',
  JWT_AUDIENCE: 'lifesync-mobile',
};
const create = vi.fn();
const service = new TokenService(
  { get: (key: string) => env[key] } as never,
  {
    refreshToken: { create },
  } as never,
);

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('TokenService', () => {
  it('firma un access token ES256 con iss, aud, sub y 15 minutos de vigencia', async () => {
    const token = await service.signAccessToken('user-1');
    const [header] = token.split('.');
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toMatchObject({
      alg: 'ES256',
    });

    const payload = await service.verifyAccessToken(token);
    expect(payload).toMatchObject({ sub: 'user-1', iss: 'lifesync-api', aud: 'lifesync-mobile' });
    expect(payload.exp! - payload.iat!).toBe(900);
  });

  it('rechaza un token con la firma alterada', async () => {
    const token = await service.signAccessToken('user-1');
    const alterado = `${token.slice(0, -4)}AAAA`;
    await expect(service.verifyAccessToken(alterado)).rejects.toThrow();
  });

  it('rechaza un token sin firma (alg: none)', async () => {
    const sinFirma = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
      sub: 'user-1',
      iss: 'lifesync-api',
      aud: 'lifesync-mobile',
      exp: Math.floor(Date.now() / 1000) + 600,
    })}.`;
    await expect(service.verifyAccessToken(sinFirma)).rejects.toThrow();
  });

  it('rechaza un token expirado, con otro emisor o con otra audiencia', async () => {
    const key = await importPKCS8(privatePem, 'ES256');
    const firmar = (claims: { iss: string; aud: string; exp: string | number }) =>
      new SignJWT({})
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject('user-1')
        .setIssuer(claims.iss)
        .setAudience(claims.aud)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(claims.exp)
        .sign(key);

    const vigente = { iss: 'lifesync-api', aud: 'lifesync-mobile', exp: '10m' };
    await expect(service.verifyAccessToken(await firmar(vigente))).resolves.toBeDefined();
    await expect(
      service.verifyAccessToken(
        await firmar({ ...vigente, exp: Math.floor(Date.now() / 1000) - 60 }),
      ),
    ).rejects.toThrow();
    await expect(
      service.verifyAccessToken(await firmar({ ...vigente, iss: 'otro' })),
    ).rejects.toThrow();
    await expect(
      service.verifyAccessToken(await firmar({ ...vigente, aud: 'otra' })),
    ).rejects.toThrow();
  });

  it('rechaza un token firmado con otra llave', async () => {
    const otra = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
    const key = await importPKCS8(
      otra.export({ type: 'pkcs8', format: 'pem' }).toString(),
      'ES256',
    );
    const ajeno = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuer('lifesync-api')
      .setAudience('lifesync-mobile')
      .setExpirationTime('10m')
      .sign(key);
    await expect(service.verifyAccessToken(ajeno)).rejects.toThrow();
  });

  it('guarda solo el hash del refresh token y devuelve el valor en claro una vez', async () => {
    const token = await service.issueRefreshToken('user-1', 'familia-1');

    expect(token).toHaveLength(64);
    const { data } = create.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      userId: 'user-1',
      familyId: 'familia-1',
      tokenHash: hashToken(token),
    });
    expect(JSON.stringify(data)).not.toContain(token);
    expect((data.expiresAt as Date).getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
  });
});
