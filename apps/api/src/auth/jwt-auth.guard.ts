import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from './oauth/token.service.js';

export type AuthenticatedRequest = Request & { user: { id: string } };

/** Versión mínima: valida el access token y expone el id del usuario. RF-B08 la completa en el Sprint 2. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    try {
      const { sub } = await this.tokens.verifyAccessToken(token);
      if (!sub) throw new UnauthorizedException();
      request.user = { id: sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
