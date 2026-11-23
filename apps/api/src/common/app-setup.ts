import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { API_PREFIX } from './api-prefix.js';
import { UnifiedHttpExceptionFilter } from './http-exception.filter.js';

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'LifeSync Mobile API',
    version: '1.0.0',
    description: 'API clínica de emergencia con OAuth 2.0 PKCE, validación estricta y anti-IDOR.',
  },
  servers: [{ url: `/${API_PREFIX}` }],
  paths: {
    '/healthz': { get: { summary: 'Healthcheck' } },
    '/auth/register': { post: { summary: 'Registro con Argon2id' } },
    '/auth/logout': { post: { summary: 'Cierre de sesión (revoca refresh token)' } },
    '/oauth/authorize': { get: { summary: 'Inicio de autorización PKCE' } },
    '/oauth/token': { post: { summary: 'Canje de código PKCE o refresh token' } },
    '/users/me': { get: { summary: 'Perfil del usuario autenticado' } },
    '/health-records/profile': {
      get: { summary: 'Consultar perfil clínico' },
      put: { summary: 'Actualizar perfil clínico' },
    },
    '/health-records/allergies': {
      get: { summary: 'Listar alergias' },
      post: { summary: 'Crear alergia' },
    },
    '/health-records/medications': {
      get: { summary: 'Listar medicamentos' },
      post: { summary: 'Crear medicamento' },
    },
    '/health-records/contacts': {
      get: { summary: 'Listar contactos de emergencia' },
      post: { summary: 'Crear contacto de emergencia' },
    },
  },
};

const SWAGGER_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>LifeSync API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({ url: '/api/docs-json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`;

/** Aplica la configuración global de la API: prefijo, ValidationPipe estricto, filtro de errores y Swagger solo en development. */
export function configureApp(
  app: NestExpressApplication,
  nodeEnv: string = process.env.NODE_ENV ?? 'development',
): void {
  if (nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new UnifiedHttpExceptionFilter());

  if (nodeEnv === 'development') {
    const http = app.getHttpAdapter().getInstance();
    http.get('/api/docs-json', (_req: Request, res: Response) => {
      res.json(OPENAPI_SPEC);
    });
    http.get('/api/docs', (_req: Request, res: Response) => {
      res.type('text/html').send(SWAGGER_HTML);
    });
  }
}
