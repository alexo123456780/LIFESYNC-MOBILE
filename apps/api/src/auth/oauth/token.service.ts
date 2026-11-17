import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JWTPayload, SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import type { Env } from '../../common/env.validation.js';
import { PrismaClient } from '../../generated/prisma/client.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALG = 'ES256';

/** En la base solo se guarda este hash: el valor en claro nunca se persiste. */
export const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const decodePem = (b64: string): string => Buffer.from(b64, 'base64').toString('utf8');

@Injectable()
export class TokenService {
  private keys?: Promise<{
    privateKey: Awaited<ReturnType<typeof importPKCS8>>;
    publicKey: Awaited<ReturnType<typeof importSPKI>>;
  }>;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaClient,
  ) {}

  private loadKeys() {
    this.keys ??= (async () => ({
      privateKey: await importPKCS8(decodePem(this.config.get('JWT_PRIVATE_KEY_B64')), ALG),
      publicKey: await importSPKI(decodePem(this.config.get('JWT_PUBLIC_KEY_B64')), ALG),
    }))();
    return this.keys;
  }

  async signAccessToken(userId: string): Promise<string> {
    const { privateKey } = await this.loadKeys();
    return new SignJWT({})
      .setProtectedHeader({ alg: ALG, typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(this.config.get('JWT_ISSUER'))
      .setAudience(this.config.get('JWT_AUDIENCE'))
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .setJti(randomUUID())
      .sign(privateKey);
  }

  /** Valida firma, `iss`, `aud` y `exp`; solo acepta ES256 (rechaza `alg: none`). */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { publicKey } = await this.loadKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: [ALG],
      issuer: this.config.get('JWT_ISSUER'),
      audience: this.config.get('JWT_AUDIENCE'),
    });
    return payload;
  }

  /** Crea un refresh token de 7 días y devuelve su valor en claro (único momento en que existe). */
  async issueRefreshToken(userId: string, familyId: string = randomUUID()): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return token;
  }
}
