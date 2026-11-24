# Reporte de Actividades — LM-118 Hardening de la API

## Actividad

Endurecimiento de cabeceras HTTP, CORS con lista blanca y límites de tamaño de payload en la API NestJS (`LM-130`, `LM-131`).

## Objetivo

Proteger los endpoints de producción contra ataques comunes de cabeceras, orígenes no autorizados y payloads sobredimensionados, manteniendo la carga de recetas de hasta 2 MB.

## Actividades realizadas

- Se deshabilitó la cabecera `X-Powered-By` y se inyectaron cabeceras de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-DNS-Prefetch-Control: off` y `Strict-Transport-Security` en producción) en `apps/api/src/common/app-setup.ts`.
- Se configuró `app.enableCors()` con lista blanca parametrizada por `CORS_ORIGINS` (y orígenes por defecto seguros).
- Se fijó límite global de cuerpo en `apps/api/src/main.ts` (`json: 3mb`, `urlencoded: 1mb`) para admitir recetas en Base64 de hasta 2 MB sin abrir la puerta a payloads arbitrarios.
- Se verificó ejecución con usuario no root en `apps/api/Dockerfile` y ausencia de secretos/PII en logs.

## Validación

- `npm run lint`, `npm run typecheck`, `npm test --workspace=apps/api` (114 tests), `ci/docker` y `ci/e2e` en verde.

## Tiempo invertido

- ~20 minutos.
