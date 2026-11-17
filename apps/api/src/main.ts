import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { API_PREFIX } from './common/api-prefix.js';
import type { Env } from './common/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
