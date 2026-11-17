import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OAuthController } from './oauth/oauth.controller.js';
import { OAuthService } from './oauth/oauth.service.js';
import { RefreshTokenService } from './oauth/refresh-token.service.js';
import { TokenService } from './oauth/token.service.js';
import { RegisterService } from './register/register.service.js';

@Module({
  // Límite por defecto holgado; los endpoints sensibles lo reducen con @Throttle.
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [OAuthController, AuthController],
  providers: [OAuthService, TokenService, RefreshTokenService, RegisterService, JwtAuthGuard],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
