import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { OAuthError } from './oauth-error.js';
import { type TokenResponse, TokenService, hashToken } from './token.service.js';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Canjea un refresh token por un par nuevo dentro de la misma familia. El token usado queda
   * revocado; si se presenta uno ya revocado se asume robo y se revoca toda la familia.
   */
  async rotate(refreshToken: unknown): Promise<TokenResponse> {
    const invalid = () => new OAuthError('invalid_grant', 'Refresh token inválido', 401);
    if (typeof refreshToken !== 'string' || refreshToken === '') throw invalid();

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!record) throw invalid();
    if (record.revokedAt) {
      await this.revokeFamily(record.familyId);
      throw invalid();
    }
    if (record.expiresAt.getTime() <= Date.now()) throw invalid();

    // Reclamo atómico: si dos peticiones usan el mismo token, solo una lo consigue.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) {
      await this.revokeFamily(record.familyId);
      throw invalid();
    }
    return this.tokens.issueTokenPair(record.userId, record.familyId);
  }

  /** Revoca el refresh token indicado y toda su familia. Solo actúa si pertenece al usuario. */
  async revoke(userId: string, refreshToken: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (record?.userId === userId) await this.revokeFamily(record.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
