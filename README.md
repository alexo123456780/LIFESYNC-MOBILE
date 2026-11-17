# LifeSync Mobile

App móvil (Android e iOS) que guarda el historial médico de emergencia de una persona: tipo de sangre, alergias, medicamentos y contactos. Los datos viven cifrados en el teléfono para consultarlos sin internet y se sincronizan con un backend protegido.

| Parte    | Tecnología                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| App      | Expo SDK 58 (React Native 0.88), TypeScript y Expo Router — `apps/mobile`      |
| API      | NestJS 12 (ESM), Prisma 7 y PostgreSQL 16 — `apps/api`                         |
| Entornos | Docker Compose en desarrollo, Render en producción                             |
| Calidad  | ESLint, Prettier, commitlint + Husky, Jest (app), Vitest (API), GitHub Actions |

El detalle de requerimientos está en [`docs/PRD.md`](docs/PRD.md) y las decisiones técnicas en [`docs/adr/`](docs/adr) y [`docs/decisiones-abiertas.md`](docs/decisiones-abiertas.md).

## Requisitos

- Node.js 24 (LTS) y npm 11.
- Docker y Docker Compose.
- Para la app: un emulador de Android (o un teléfono con la development build). **Expo Go solo soporta un SDK a la vez**; comprueba que la versión de tu tienda soporte SDK 58 y, si no, usa la development build.

## Primer día

```bash
# 1. Dependencias de todo el monorepo (también genera el cliente de Prisma e instala los hooks de Husky)
npm ci

# 2. Variables de entorno del API y de Docker
cp .env.example .env
#    Edita .env: DB_PASSWORD, PGADMIN_PASSWORD y SEED_USER_PASSWORD son obligatorios.
#    Si el puerto 5432 está ocupado, cambia DB_PORT. En Linux, ajusta DEV_UID/DEV_GID con `id -u` / `id -g`.

# 3. API + PostgreSQL (aplica las migraciones al arrancar)
docker compose up
#    Comprueba: curl http://localhost:3000/api/v1/healthz   ->  {"status":"ok"}

# 4. App (en otra terminal)
cp apps/mobile/.env.example apps/mobile/.env
cd apps/mobile && npx expo start
#    Pulsa `a` para abrir el emulador de Android.
```

Extras de Compose: `docker compose --profile tools up` agrega pgAdmin en <http://127.0.0.1:5050> y `docker compose --profile tunnel up` un túnel HTTPS con ngrok (requiere `NGROK_AUTHTOKEN`).

Datos de desarrollo (solo con `NODE_ENV=development`): `docker compose exec api npm run seed` crea el usuario de `SEED_USER_EMAIL` con la contraseña `SEED_USER_PASSWORD`.

## Scripts de la raíz

| Comando                  | Qué hace                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `npm run lint`           | ESLint en todo el monorepo                                     |
| `npm run format:check`   | Verifica el formato con Prettier (`npm run format` lo corrige) |
| `npm run typecheck`      | `tsc --noEmit` en cada workspace                               |
| `npm test`               | Pruebas de herramientas, del API (Vitest) y de la app (Jest)   |
| `npm test -- --coverage` | Igual, con cobertura                                           |

Pruebas e2e del API (necesitan PostgreSQL y `DATABASE_URL`): `npm run migrate:deploy -w apps/api && npm run test:e2e -w apps/api`.

## Estructura

```text
apps/
├── api/              NestJS: common, database (Singleton), auth, health + prisma/ (esquema y migraciones)
└── mobile/           Expo: app/ (rutas) y src/{domain,application,infrastructure,presentation}
docs/                 PRD, ADRs, GitFlow y decisiones
md/bitacora-reporte/  Bitácora de actividades por tarea de Jira
.github/              Workflows de CI/CD y seguridad, Dependabot y plantilla de PR
render.yaml           Blueprint de Render
docker-compose.yml    Entorno de desarrollo (db, api, pgAdmin y túnel)
```

## Navegación y guardia de sesión

Las rutas de la app viven en `apps/mobile/app/` con dos pilas separadas:

- `(auth)`: usuario sin sesión (bienvenida, registro).
- `(app)`: usuario autenticado (historial, ajustes).

Cada `_layout.tsx` consulta el estado de sesión (`loading`, `authenticated` o `unauthenticated`) del `SessionProvider` y usa la función pura `resolveGuardRedirect` (`src/domain/session.ts`) para decidir si redirige. **Pendiente de completar (LM-45 y LM-48):** restaurar la sesión desde `expo-secure-store` al abrir la app, mostrar una pantalla de carga mientras tanto y bloquear el botón «atrás» tras cerrar sesión.

La regla de dependencias va hacia adentro: presentación → aplicación → dominio. El dominio no importa nada de Expo, React ni Nest.

## Flujo de trabajo

- **Ramas:** `feature/LM-n-descripcion` desde `develop`; `prod` es producción. Detalle en [`docs/gitflow.md`](docs/gitflow.md).
- **Commits:** `tipo(ámbito): mensaje [LM-n]` (por ejemplo `feat(api): registro de usuarios [LM-18]`). Husky rechaza los mensajes que no cumplan. Los commits deben ir firmados.
- **Pull Requests:** siempre hacia `develop`, con la plantilla de `.github/pull_request_template.md`. Para fusionar deben estar en verde `quality`, `e2e`, `docker`, `security / audit`, `security / gitleaks` y `security / codeql`.
- **Secretos:** nunca en el repositorio. Usa `.env` (ignorado), los secretos de GitHub y las variables de Render o EAS. Gitleaks y el push protection de GitHub bloquean los intentos.

## Despliegue

Un push a `prod` con el CI en verde invoca el _deploy hook_ de Render (secreto `RENDER_DEPLOY_HOOK_URL`), que construye la imagen `prod` de `apps/api/Dockerfile`. El servicio necesita `DATABASE_URL`, `JWT_PRIVATE_KEY_B64` y `JWT_PUBLIC_KEY_B64` como variables de Render. Las llaves ES256 se generan con:

```bash
node -e "const c=require('crypto');const k=c.generateKeyPairSync('ec',{namedCurve:'P-256'});console.log('JWT_PRIVATE_KEY_B64='+Buffer.from(k.privateKey.export({type:'pkcs8',format:'pem'})).toString('base64'));console.log('JWT_PUBLIC_KEY_B64='+Buffer.from(k.publicKey.export({type:'spki',format:'pem'})).toString('base64'))"
```

El plan gratuito de Render duerme el servicio tras 15 minutos sin tráfico y su base de datos expira a los 30 días; ver la sección 6.6 del PRD.
