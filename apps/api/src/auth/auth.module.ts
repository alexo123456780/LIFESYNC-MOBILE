import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { OAuthController } from './oauth/oauth.controller.js';
import { OAuthService } from './oauth/oauth.service.js';
import { TokenService } from './oauth/token.service.js';

// El registro (LM-40) y el refresh/logout (LM-38 y LM-39) se agregan aquí.
@Module({
  // Límite por defecto holgado; los endpoints sensibles lo reducen con @Throttle.
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [OAuthController],
  providers: [OAuthService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
