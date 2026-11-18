import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { API_PREFIX } from './common/api-prefix.js';
import type { Env } from './common/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Detrás del balanceador de Render la IP real llega en X-Forwarded-For (límite de intentos).
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
