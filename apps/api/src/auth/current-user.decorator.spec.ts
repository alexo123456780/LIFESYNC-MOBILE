import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { extractCurrentUserId } from './current-user.decorator.js';

const mockContext = (user?: { id: string }): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('@CurrentUser (LM-61)', () => {
  it('devuelve el userId del request autenticado', () => {
    expect(extractCurrentUserId(mockContext({ id: 'user-123' }))).toBe('user-123');
  });

  it('lanza 401 si no existe usuario autenticado en el request', () => {
    expect(() => extractCurrentUserId(mockContext(undefined))).toThrow(UnauthorizedException);
  });
});
