# ADR 0001 — Backend con NestJS 12 (ESM), Prisma 7 y Vitest

- **Estado:** aceptada (2026-11-16)
- **Tarea:** LM-9
- **Decide:** ALE

## Contexto

El PRD (secciones 6.1 y 15) fija NestJS + Prisma y una suite Jest para el backend. Al crear la plantilla se comprobó que:

- Los paquetes de NestJS 12 (`@nestjs/*`) se publican **solo como ESM**, y su plantilla oficial prueba con **Vitest**. Jest solo carga ESM con el modo experimental `--experimental-vm-modules`, que es frágil con la metadata de decoradores.
- Prisma 7 (versión estable vigente) exige un **adaptador de driver** (`@prisma/adapter-pg`), un `prisma.config.ts` y un generador `prisma-client` con salida propia. Además, la clase `PrismaClient` exportada es una fábrica, por lo que `instance instanceof PrismaClient` no aplica.

## Decisión

- `apps/api` es un paquete ESM (`"type": "module"`), con imports relativos terminados en `.js`.
- El runner de pruebas del backend es **Vitest** (misma API `describe/it/expect` que Jest). La app móvil mantiene Jest (`jest-expo`).
- El `DatabaseConnection` (Singleton) construye el `PrismaClient` con `PrismaPg`; el resto de la aplicación lo recibe por inyección de dependencias a través de `DatabaseModule`.
- El cliente de Prisma se genera en `src/generated/prisma` (no se versiona) durante `postinstall`.
- `GET /api/v1/healthz` es solo de vida (no consulta la base), para que Render y Docker no marquen el servicio como caído por un fallo transitorio de la BD.

## Consecuencias

- La sección 15 del PRD debe leerse como «Vitest» en el backend; `npm test -- --coverage` sigue siendo el comando de la demo.
- La plantilla de NestJS 12 genera especificaciones compatibles con Vitest; los mocks usan `vi.fn()` y no `jest.fn()`.
- Quien edite el backend debe terminar los imports relativos en `.js`.
