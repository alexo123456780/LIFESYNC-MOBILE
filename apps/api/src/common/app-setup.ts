import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { API_PREFIX } from './api-prefix.js';
import { UnifiedHttpExceptionFilter } from './http-exception.filter.js';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'https://lifesync-api-fw89.onrender.com',
];

function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim() === '') return DEFAULT_CORS_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

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

  // Hardening HTTP (LM-118 / LM-130): cabeceras de seguridad, sin X-Powered-By y CORS con lista blanca.
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  const allowedOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origen CORS no permitido'), false);
      }
    },
    credentials: true,
  });

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
