import { randomBytes } from 'node:crypto';
import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthorizeParams } from './authorize-request.js';
import { CSRF_COOKIE, csrfMatches, newCsrfToken, readCookie } from './csrf.js';
import { buildCsp, renderLoginPage } from './login-page.js';
import { OAuthError } from './oauth-error.js';
import { OAuthService } from './oauth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type { TokenResponse } from './token.service.js';

/** 5 intentos por minuto por IP en el login y en el canje de tokens (RS-09). */
const ATTEMPT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  @Get('authorize')
  authorize(@Query() query: Record<string, unknown>, @Res() res: Response): void {
    const parsed = this.oauth.parseAuthorize(query);
    if (!parsed.ok) throw new OAuthError('invalid_request', parsed.description);
    this.sendLoginPage(res, parsed.params, 200);
  }

  @Post('authorize')
  @UseGuards(ThrottlerGuard)
  @Throttle(ATTEMPT_LIMIT)
  async login(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = this.oauth.parseAuthorize(body);
    if (!parsed.ok) throw new OAuthError('invalid_request', parsed.description);
    if (!csrfMatches(readCookie(req.headers.cookie, CSRF_COOKIE), body.csrf)) {
      throw new OAuthError('invalid_request', 'Token CSRF inválido');
    }

    const userId = await this.oauth.authenticate(body.email, body.password);
    if (!userId) {
      this.sendLoginPage(res, parsed.params, 401, 'Correo o contraseña incorrectos');
      return;
    }

    const code = await this.oauth.issueAuthorizationCode(userId, parsed.params);
    const target = new URL(parsed.params.redirectUri);
    target.searchParams.set('code', code);
    target.searchParams.set('state', parsed.params.state);
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target.toString());
  }

  @Post('token')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle(ATTEMPT_LIMIT)
  async token(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (body.grant_type === 'refresh_token') {
      return this.refreshTokens.rotate(body.refresh_token);
    }
    if (body.grant_type !== 'authorization_code') {
      throw new OAuthError('unsupported_grant_type', 'grant_type no soportado');
    }
    return this.oauth.exchangeAuthorizationCode({
      code: body.code,
      codeVerifier: body.code_verifier,
      redirectUri: body.redirect_uri,
    });
  }

  private sendLoginPage(res: Response, params: AuthorizeParams, status: number, error?: string) {
    const csrfToken = newCsrfToken();
    const nonce = randomBytes(16).toString('base64url');
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/v1/oauth',
      maxAge: 10 * 60 * 1000,
    });
    res.setHeader('Content-Security-Policy', buildCsp(nonce, this.oauth.redirectUris));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.status(status).type('html').send(renderLoginPage({ params, csrfToken, nonce, error }));
  }
}
