import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import type { Env } from '../../common/env.validation.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { type AuthorizeRequestResult, parseAuthorizeRequest } from './authorize-request.js';
import { OAuthError } from './oauth-error.js';
import { verifyPkce } from './pkce.js';
import { ACCESS_TOKEN_TTL_SECONDS, TokenService, hashToken } from './token.service.js';

export const AUTHORIZATION_CODE_TTL_MS = 60_000;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
}

@Injectable()
export class OAuthService {
  /** Hash de relleno: verificar contra él iguala el tiempo de respuesta cuando el correo no existe. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get redirectUris(): readonly string[] {
    return this.config.get('OAUTH_REDIRECT_URIS');
  }

  parseAuthorize(input: Record<string, unknown>): AuthorizeRequestResult {
    return parseAuthorizeRequest(input, this.redirectUris);
  }

  /** Devuelve el id del usuario si las credenciales son válidas; null en cualquier otro caso. */
  async authenticate(email: unknown, password: unknown): Promise<string | null> {
    if (typeof email !== 'string' || typeof password !== 'string') return null;
    if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) return null;

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      this.dummyHash ??= argon2.hash('relleno', { type: argon2.argon2id });
      await argon2.verify(await this.dummyHash, password);
      return null;
    }
    return (await argon2.verify(user.passwordHash, password)) ? user.id : null;
  }

  /** Crea un código de un solo uso de 60 s; en la base solo queda su hash. */
  async issueAuthorizationCode(
    userId: string,
    params: { redirectUri: string; codeChallenge: string },
  ): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.prisma.authorizationCode.create({
      data: {
        userId,
        codeHash: hashToken(code),
        codeChallenge: params.codeChallenge,
        redirectUri: params.redirectUri,
        expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
      },
    });
    return code;
  }

  async exchangeAuthorizationCode(input: {
    code: unknown;
    codeVerifier: unknown;
    redirectUri: unknown;
  }): Promise<TokenResponse> {
    const invalidGrant = () =>
      new OAuthError('invalid_grant', 'Código inválido, vencido o ya utilizado');
    const { code, codeVerifier, redirectUri } = input;
    if (
      typeof code !== 'string' ||
      typeof codeVerifier !== 'string' ||
      typeof redirectUri !== 'string'
    ) {
      throw new OAuthError('invalid_request', 'Faltan code, code_verifier o redirect_uri');
    }

    const record = await this.prisma.authorizationCode.findUnique({
      where: { codeHash: hashToken(code) },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) throw invalidGrant();

    // El código se quema de forma atómica antes de verificar: un intento fallido también lo invalida.
    const claimed = await this.prisma.authorizationCode.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalidGrant();

    if (record.redirectUri !== redirectUri || !verifyPkce(codeVerifier, record.codeChallenge)) {
      throw invalidGrant();
    }

    return {
      access_token: await this.tokens.signAccessToken(record.userId),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: await this.tokens.issueRefreshToken(record.userId),
    };
  }
}
