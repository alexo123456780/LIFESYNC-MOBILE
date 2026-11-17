# Reporte de Actividades — LM-9 Plantilla del backend NestJS con Prisma y Singleton de base de datos

## Actividad

Plantilla ejecutable del API (LM-25), patrón Singleton de conexión a la base de datos (LM-26) y modelo de identidad con migración inicial y seed de desarrollo (LM-27).

## Objetivo

Contar con un backend ejecutable con `/healthz` y una base de datos versionada sobre la que se construyen el registro de usuarios y el servidor OAuth.

## Actividades realizadas

- Se creó `apps/api` con NestJS, prefijo global `/api/v1` y los módulos `common`, `database`, `auth` y `health`.
- Se agregó configuración por entorno con validación: la aplicación no arranca si falta una variable obligatoria y el error indica cuál.
- Se publicó el endpoint público `GET /api/v1/healthz`.
- Se implementó `DatabaseConnection` como Singleton (constructor privado y `getInstance()`) y se registró en `DatabaseModule`, de modo que los servicios reciben el cliente de base de datos por inyección de dependencias.
- Se modelaron `User`, `AuthorizationCode` y `RefreshToken` con Prisma, guardando únicamente hashes, y se generó la migración inicial versionada.
- Se creó el seed de desarrollo, que se niega a ejecutarse fuera de `development` y guarda la contraseña con Argon2id.
- Se documentó la decisión de stack (NestJS 12 ESM, Prisma 7 y Vitest) en un ADR.

## Criterios atendidos

- `GET /api/v1/healthz` responde 200 sin autenticación con el API en ejecución.
- `DatabaseConnection.getInstance()` devuelve siempre la misma instancia y su constructor es privado (crear una instancia fuera de la clase no compila).
- `prisma migrate deploy` aplica la migración inicial sobre una base vacía y crea las tablas de identidad.
- El seed solo corre con `NODE_ENV=development` y no corre en `production`.
- Existen los módulos `common`, `database`, `auth` y `health`.
- La base solo contiene `passwordHash`, `codeHash` y `tokenHash`; no hay columnas con valores en claro.

## Resultado

El API arranca, responde su verificación de salud y dispone de un esquema de identidad reproducible en cualquier entorno. La migración se aplica sobre una base vacía y el seed es idempotente.

## Validación

- Typecheck estricto, lint y verificación de formato sin errores.
- 17 pruebas unitarias en verde (validación de variables de entorno, Singleton e inyección, guarda del seed).
- 3 pruebas e2e en verde contra PostgreSQL real: salud del API y esquema de identidad sin columnas en claro.
- Servidor compilado en modo producción respondiendo 200 en `/api/v1/healthz` y falla al arrancar sin `DATABASE_URL` indicando la variable.
- Seed rechazado con `production` y sin `NODE_ENV` (sin crear filas) y aplicado con `development`, con `passwordHash` en formato `$argon2id$`.
- Instalación limpia desde cero que regenera el cliente de base de datos; `npm audit` sin vulnerabilidades altas ni críticas.

## Observaciones

La plantilla usa NestJS 12 (solo ESM), por lo que las pruebas del backend corren con Vitest y no con Jest, como indicaba el PRD; la decisión quedó registrada en el ADR 0001. Las variables de JWT y de OAuth se incorporan en las tareas que las utilizan.
