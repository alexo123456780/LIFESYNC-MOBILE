import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const verify = vi.fn();
const guard = new JwtAuthGuard({ verifyAccessToken: verify } as never);
const contextWith = (authorization?: string) => {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  return { request, context: { switchToHttp: () => ({ getRequest: () => request }) } as never };
};

describe('JwtAuthGuard', () => {
  beforeEach(() => verify.mockReset());

  it('acepta un access token válido y expone el id del usuario', async () => {
    verify.mockResolvedValue({ sub: 'user-1' });
    const { request, context } = contextWith('Bearer token-valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('token-valido');
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it.each([undefined, '', 'Bearer', 'Basic abc', 'token-sin-esquema'])(
    'rechaza con 401 un encabezado Authorization inválido (%s)',
    async (header) => {
      const { context } = contextWith(header);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it('rechaza con 401 un token que no verifica', async () => {
    // Servicio falso sin espía: un vi.fn que rechaza se reporta como error no manejado.
    const failing = new JwtAuthGuard({
      verifyAccessToken: async () => {
        throw new Error('firma inválida');
      },
    } as never);
    await expect(failing.canActivate(contextWith('Bearer malo').context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza con 401 un token sin sub', async () => {
    verify.mockResolvedValue({});
    await expect(guard.canActivate(contextWith('Bearer sin-sub').context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
