import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard.js';
import { RefreshTokenService } from './oauth/refresh-token.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly refreshTokens: RefreshTokenService) {}

  /** Cierra la sesión de verdad: revoca el refresh token recibido y toda su familia. */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (typeof body.refresh_token !== 'string' || body.refresh_token === '') {
      throw new BadRequestException('refresh_token es obligatorio');
    }
    await this.refreshTokens.revoke(request.user.id, body.refresh_token);
  }
}
