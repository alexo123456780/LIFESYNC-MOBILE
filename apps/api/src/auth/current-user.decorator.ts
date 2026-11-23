import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

export function extractCurrentUserId(ctx: ExecutionContext): string {
  const request = ctx.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();
  const userId = request.user?.id;
  if (!userId) throw new UnauthorizedException();
  return userId;
}

/** Expone el `sub` (userId) validado por `JwtAuthGuard`; ningún endpoint toma userId del body o URL. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  extractCurrentUserId(ctx),
);
