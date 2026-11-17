# PRD – LifeSync Mobile

| | |
|---|---|
| **Versión** | 1.1 (actualizada con equipo, Render, OAuth y Expo SDK 58) |
| **Fecha** | 14 de noviembre de 2026 |
| **Asignatura** | Desarrollo Móvil Integral |
| **Metodología** | Scrum, 4 sprints de 1 semana, equipo de 4 integrantes |
| **Evaluación** | Demostración técnica presencial en 3 estaciones (Backend, App móvil, QA/DevSecOps) |

**Cambios de la v1.1 respecto a la v1.0**

- Equipo con nombres y responsabilidades por requerimiento (sección 3 y columna `Resp.` de la sección 7).
- Despliegue del backend y la base de datos en **Render (plan gratuito)**, con CI/CD en GitHub Actions (sección 12).
- Autenticación con **OAuth 2.0 Authorization Code + PKCE**, que es la mejor práctica actual (sección 6.4).
- Expo **SDK 58** (la versión más reciente) y estrategia Expo Go vs. development build (sección 6.5).
- Definición de "anomalías" del teléfono (sección 9.3).
- Imágenes de recetas guardadas en PostgreSQL por el disco efímero de Render (sección 6.6).
- Decisión sobre el `.ipa` sin cuenta de Apple Developer (sección 17).

---

## 1. Resumen ejecutivo

LifeSync Mobile es una app móvil multiplataforma (Android + iOS) que guarda el **historial médico de emergencia** de una persona: tipo de sangre, alergias, medicamentos (incluidos los controlados) y contactos de emergencia. Los datos viven cifrados en el teléfono para consulta sin internet y se sincronizan con un backend en la nube protegido contra inyecciones y accesos indebidos.

El proyecto se evalúa tanto por lo que hace la app como por **cómo está construida**: patrones de diseño (Singleton, Strategy, Observer), seguridad (hashing, hardware seguro, TLS obligatorio, IDOR), permisos de hardware con degradación elegante, pruebas, auditoría estática y binarios firmados.

**Decisión central:** Expo SDK 58 (React Native + TypeScript) para la app; NestJS + Prisma + PostgreSQL para el backend, contenerizado con Docker, desplegado en Render con CI/CD en GitHub Actions.

## 2. Objetivos y métricas de éxito

| # | Objetivo | Métrica de éxito | Cómo se demuestra |
|---|---|---|---|
| O1 | Backend seguro y desplegado | 0 inyecciones ni IDOR exitosos en las pruebas de Postman de la estación 1 | Postman con payloads corruptos e IDs de otro usuario |
| O2 | Contraseñas ilegibles | 100% de `passwordHash` en formato Argon2id | pgAdmin / Compass abierto en vivo |
| O3 | Token en hardware seguro | JWT y refresh solo en SecureStore; nunca en AsyncStorage ni logs | Revisión de código y demo |
| O4 | App resiliente | 0 crashes al activar modo avión y al denegar permisos | Prueba de fuego en dispositivo físico |
| O5 | Calidad verificable | Pruebas unitarias en verde, cobertura ≥ 80% en módulos críticos | `npm test -- --coverage` proyectado en vivo |
| O6 | Dependencias limpias | 0 vulnerabilidades críticas/altas sin resolver; 0 secretos expuestos | `npm audit`, Gitleaks, CodeQL |
| O7 | Liberación | `.aab` firmado en modo Release (y `.ipa` si se consigue cuenta Apple, ver 17) | Archivos mostrados en la estación 3 |
| O8 | Proceso ágil trazable | 100% de historias del tablero con PR enlazada | Jira + GitHub |
| O9 | Entrega continua | Merge a `main` con CI en verde despliega solo a Render | Pipeline en GitHub Actions |

## 3. Equipo y responsabilidades

Los roles se alinean con las 3 estaciones de evaluación. La distribución entre Jose, Mario y Héctor es una propuesta y pueden intercambiarla.

| Integrante | Rol | Estación | Responsabilidades principales |
|---|---|---|---|
| **Alejandro Magaña López** (ALE) | Lead Backend + DevSecOps + **base del proyecto** | 1 y 3 | Monorepo, Docker, GitFlow y protección de ramas, CI/CD, Render, EAS, plantilla base de la app Expo, API, OAuth, seguridad, IDOR, SAST, builds firmados |
| **Jose Ariel Martinez Llanes** (JOS) | Lead Frontend | 2 | Pantallas y formularios, login y registro, navegación, Observer de alertas, máquina de estados de permisos, integración con la API |
| **Mario Rafael Solis Suarez** (MAR) | Diseñador UI/UX + sensores en pantalla | 2 | Sistema visual, accesibilidad, cámara (escaneo de recetas), GPS, tarjeta de emergencia, detección de caídas |
| **Hector Enrique Mendoza Nava** (HEC) | Scrum Master + QA | 3 | Tablero Jira (con su agente), ceremonias, aprobación de PRs, pruebas del frontend, documentación del SAST y plan de pruebas |

**Reglas de trabajo**

- Alejandro entrega la **base lista antes del día 3 del Sprint 1** (ver 20.2), para que el resto empiece directo en pantallas.
- Los PRs los aprueba el Scrum Master (Héctor), como exige el documento. Para los PRs de backend se pide además una revisión técnica de Jose.
- Carga desbalanceada: Alejandro lleva la mayor parte de la rúbrica de seguridad y DevOps. Si el Sprint 3 aprieta, las tareas marcadas "delegable" en la sección 7 se pasan a Jose.

## 4. Usuarios y casos de uso

**Actores**

- **Paciente (usuario principal):** registra y mantiene su historial.
- **Sistema médico (consumidor de la API):** recibe el historial exportado en JSON.
- **Aseguradora (consumidor de la API):** recibe el historial exportado en CSV.

| ID | Caso de uso |
|---|---|
| CU-01 | Registrarme e iniciar sesión de forma segura |
| CU-02 | Capturar y editar mi perfil clínico (sangre, alergias, medicamentos, contactos) |
| CU-03 | Consultar mi historial sin internet, incluso en una emergencia |
| CU-04 | Escanear una receta con la cámara y adjuntarla a mi historial |
| CU-05 | Recibir recordatorios de medicamentos y alertas locales |
| CU-06 | Registrar la ubicación de un incidente (GPS) para guardarla en la nube |
| CU-07 | Seguir usando la app si niego permisos de cámara o GPS |
| CU-08 | Exportar mi historial en JSON o CSV |
| CU-09 | Recibir una alerta si el teléfono detecta una posible caída |

## 5. Alcance, supuestos y restricciones

**Dentro del alcance**

- OAuth 2.0 Authorization Code + PKCE con JWT firmado, refresh con rotación y cierre de sesión.
- CRUD de registros de salud con validación estricta y control de propiedad (IDOR).
- Caché local cifrada para consulta offline.
- Cámara (recetas) y GPS (incidente) con máquina de estados y degradación gradual.
- Alertas locales con patrón Observer y detección de anomalías.
- Exportación con patrón Strategy.
- CI/CD, pruebas unitarias, SAST, hardening y artefactos de distribución.

**Fuera del alcance**

- OCR automático de recetas (la cámara captura la imagen, no interpreta el texto).
- Integración real con sistemas hospitalarios (HL7/FHIR).
- Panel web de administración.
- Cumplimiento legal formal (LFPDPPP, HIPAA); se aplican buenas prácticas, no certificación.
- Detección de caídas con la app cerrada (los sensores de Expo solo funcionan con la app en primer plano).
- Notificaciones push remotas; solo notificaciones **locales**.

**Supuestos**

- Se usa un dispositivo físico (el docente exige modo avión y permisos reales).
- Cada integrante tiene laptop con Docker Desktop y Node.js LTS.
- El profesor acepta Expo (el documento lo menciona junto a Flutter).

**Restricciones**

- 4 semanas, 4 sprints cerrados, un entregable demostrable por sprint.
- Render gratuito: el servicio se duerme tras 15 minutos sin tráfico, el disco es efímero y la BD gratuita expira a los 30 días (ver 6.6).
- Sin cuenta de Apple Developer no se puede generar un `.ipa` firmado (ver 17).
- La app Release bloquea HTTP: todo el tráfico debe ir por HTTPS (Render lo da automáticamente).

## 6. Decisiones de arquitectura

### 6.1 Resumen de decisiones

| Tema | Decisión | Alternativas descartadas | Razón |
|---|---|---|---|
| App móvil | Expo **SDK 58** (React Native 0.88) + TypeScript + Expo Router | Flutter | Mismo lenguaje que el backend; `expo-secure-store` abstrae Keystore/Keychain; EAS Build genera `.aab` |
| Backend | NestJS (Node.js LTS) + TypeScript | FastAPI | Módulos, guards, pipes y DI nativos; `class-validator` pedido en el documento |
| Base de datos | PostgreSQL 16 (Docker en local, Render en nube) | MongoDB | Datos relacionales e integridad referencial |
| ORM y migraciones | Prisma + Prisma Migrate | Liquibase, TypeORM | Ver 6.3 |
| Contenedores | Docker Compose para backend y herramientas; imagen Docker desplegada en Render | Docker para la app móvil | Ver 6.2 |
| Autenticación | OAuth 2.0 **Authorization Code + PKCE** (servidor de autorización propio en NestJS) | Password grant, Google OAuth | Ver 6.4 |
| Hashing | Argon2id (librería `argon2`, asíncrona) | bcrypt | Recomendado por OWASP; parámetros mínimos m=19 MiB, t=2, p=1 |
| Tokens | JWT access (15 min) + refresh rotativo (7 días), firma ES256 | HS256 | Firma asimétrica y token corto |
| Almacén seguro | `expo-secure-store` | AsyncStorage | Keystore (Android) y Keychain (iOS) |
| Caché offline | `@react-native-async-storage` con contenido cifrado (XChaCha20-Poly1305 vía `@noble/ciphers`); clave de 256 bits en SecureStore | SQLCipher, MMKV | Funciona en Expo Go y en builds, sin módulos nativos extra |
| Imágenes de recetas | Columna `Bytes` en PostgreSQL, comprimidas en el cliente (≤ 1 MB) | Disco, S3 | El disco de Render es efímero (ver 6.6) |
| Validación | `class-validator` en servidor, Zod en la app | Solo validación en cliente | El servidor nunca confía en el cliente |
| CI/CD | GitHub Actions + Render (deploy hook) + EAS Build | Jenkins | Gratis y se integra con GitFlow |
| Hosting | Render (web service Docker + PostgreSQL, plan gratuito) | Railway, Fly.io | Decisión del equipo: gratis y sin tarjeta |

### 6.2 ¿Docker sí o sí? Sí para el backend; no para la app móvil

**Sí en el backend porque:**

- Cualquier compañero (o el docente) levanta API + PostgreSQL + pgAdmin con `docker compose up`.
- Render despliega directamente una imagen Docker, así que lo que corre en local es lo mismo que corre en producción.
- Separa de verdad los entornos, parte del 25% de la rúbrica de arquitectura.
- El CI corre las pruebas e2e contra un PostgreSQL real y desechable.

**No en la app móvil porque:** Metro, el emulador y el dispositivo físico necesitan acceso directo a la laptop. Los binarios se compilan con EAS Build.

### 6.3 ¿Liquibase? No. Se usa Prisma Migrate

- Prisma ya es el ORM; Prisma Migrate genera migraciones SQL versionadas (`prisma/migrations/`) que van al repositorio y se aplican con `prisma migrate deploy`.
- Liquibase brilla en ecosistemas Java o con varios servicios en distintos lenguajes sobre una misma BD. Aquí agregaría una JVM extra y un segundo sistema de versionado.
- Para SQL a mano (restricciones `CHECK`, RLS) se usa `prisma migrate dev --create-only` y se edita el SQL antes de aplicarlo.
- Regla: **nunca** `prisma db push` fuera de pruebas locales. Todo cambio de esquema pasa por una migración revisada en PR.

### 6.4 OAuth 2.0: Authorization Code + PKCE

**Decisión:** el backend implementa un servidor de autorización propio con el flujo **Authorization Code + PKCE (S256)** y entrega un JWT firmado.

**Por qué es lo mejor hoy:**

- OAuth 2.1 (el consolidado de las buenas prácticas actuales) exige PKCE en todos los clientes y **elimina el grant de contraseña (ROPC)** y el implícito. Para apps móviles, el estándar es el navegador del sistema + código + PKCE.
- El código de autorización viaja por una redirección y es inútil sin el `code_verifier` que solo la app conoce, lo que protege contra la interceptación del código.
- Cumple el requisito del documento: un endpoint que **valida credenciales** (en la pantalla de login del servidor) y devuelve un **JWT firmado**.
- Exige coincidencia **exacta** del `redirect_uri` y rotación de refresh tokens, ambos puntos de OAuth 2.1.

**Descartado:**

- `grant_type=password`: más fácil de implementar, pero es el grant que OAuth 2.1 elimina. Solo se acepta como plan B si el Sprint 1 se complica, marcado explícitamente como deuda técnica.
- Google OAuth: agrega dependencia externa, cuenta en Google Cloud y no valida credenciales propias.

**Flujo**

```mermaid
sequenceDiagram
    participant App as App Expo
    participant Nav as Navegador del sistema
    participant API as NestJS servidor de autorizacion
    App->>App: genera code_verifier, code_challenge S256 y state
    App->>Nav: abre /oauth/authorize con challenge y redirect_uri
    Nav->>API: GET /oauth/authorize
    API-->>Nav: pagina de login
    Nav->>API: POST credenciales
    API->>API: valida con Argon2id y crea code de un solo uso, 60 s
    API-->>Nav: redirect lifesync://oauth/callback con code y state
    Nav-->>App: abre la app con el code
    App->>API: POST /oauth/token con code y code_verifier
    API-->>App: access JWT ES256 y refresh token
    App->>App: guarda ambos en SecureStore
```

**Detalles de implementación**

- La app usa `expo-auth-session` y `expo-web-browser`. El registro de usuarios se hace dentro de la app (`POST /auth/register`).
- La página de login del servidor es HTML mínimo, con `state` verificado, cabecera CSP, protección CSRF y límite de intentos.
- Los `redirect_uri` permitidos se configuran por entorno y se comparan de forma exacta.
- En Expo Go el esquema de redirección es `exp://IP:PUERTO/...`, que cambia. En desarrollo se agrega esa URI exacta a la lista permitida del entorno `development`; **nunca** en producción.

### 6.5 Expo SDK 58, Expo Go y development builds

**Versión:** la más reciente es **Expo SDK 58** (React Native 0.88), publicada en octubre de 2026. `npx create-expo-app@latest` ya la recomienda.

**Ojo con Expo Go:** Expo Go solo soporta **un** SDK a la vez. Según Expo, la versión de Expo Go para SDK 58 en App Store y Google Play llegaría "en unas semanas" tras el lanzamiento, así que **el día 1 hay que verificar qué SDK soporta Expo Go en el teléfono de cada integrante**. Además, Expo Go **no aplica** la configuración nativa de `app.config` (permisos declarados, cleartext, ATS, esquema `lifesync://`).

| Capacidad | Expo Go | Development / preview build (EAS) |
|---|---|---|
| Código JS, SecureStore, cámara, GPS, sensores, notificaciones locales | Sí | Sí |
| Permisos declarados en manifiestos | No | Sí |
| Bloqueo de HTTP (Android) y ATS (iOS) | No | Sí |
| Esquema propio `lifesync://` para OAuth | No | Sí |
| Binario Release firmado | No | Sí |

**Decisión:**

1. El proyecto usa **SDK 58**.
2. Alejandro genera una **development build de Android** con EAS (APK instalable, no requiere cuenta de Apple) y se la comparte al equipo. Con ella se desarrolla y se demuestra la configuración nativa.
3. Quien tenga iPhone usa Expo Go cuando la versión de la tienda soporte SDK 58, o pide ayuda al equipo para probar con un Android.
4. **Antes de cada sprint review** se genera un build `preview` y se valida en el teléfono: permisos, red segura y login OAuth se prueban ahí, no en Expo Go.

### 6.6 Render gratuito: límites y cómo los resolvemos

| Límite del plan gratuito | Impacto | Solución |
|---|---|---|
| El servicio se duerme tras 15 min sin tráfico y tarda ≈ 1 min en despertar | La primera petición de la demo falla o tarda | Despertarlo 10 min antes de la demo; ping a `/api/v1/healthz` cada 10 min con un monitor (UptimeRobot o cron-job.org) en días de demo; la app muestra "Conectando…" con reintentos |
| Disco efímero (se pierde en cada redeploy) | Las imágenes subidas desaparecen | Imágenes como `Bytes` en PostgreSQL, comprimidas en el cliente a ≤ 1 MB y límite de 2 MB en el servidor |
| PostgreSQL gratuito **expira a los 30 días** (con 14 días de gracia para pasarlo a plan de pago), 1 GB, una por workspace | Una BD creada el día 1 vence cerca de la demo | **Crear la BD de producción al inicio del Sprint 3**, tener `prisma/seed.ts` listo para recrear datos de demo y hacer un `pg_dump` antes de la demo; poner recordatorio en el calendario |
| Una sola BD gratuita | No hay entorno "staging" en la nube | `development` en Docker local, `test` efímero en CI, `production` en Render |
| 750 horas de instancia al mes por workspace | Alcanza para un servicio activo todo el mes | Un solo servicio web |
| El filesystem no es persistente | Nada de logs ni archivos en disco | Logs a stdout; Render los muestra en el panel |

**Para mostrar la BD en la estación 1:** pgAdmin se conecta a la *External Database URL* de Render (SSL requerido). Se restringe la lista de IPs permitidas después de la demo.

### 6.7 Diagrama de arquitectura

```mermaid
flowchart LR
    subgraph Movil["App móvil (Expo SDK 58)"]
        UI["Presentación<br/>(pantallas, navegación protegida)"]
        APP["Aplicación<br/>(casos de uso, Observer, máquina de permisos)"]
        DOM["Dominio<br/>(entidades, reglas)"]
        INF["Infraestructura<br/>(API client + interceptor,<br/>SecureStore, caché cifrada,<br/>cámara, GPS, sensores)"]
        UI --> APP --> DOM
        APP --> INF
    end
    subgraph Render["Render (plan gratuito)"]
        API["NestJS en Docker<br/>OAuth PKCE, Guards, Pipes,<br/>Strategy, Singleton DB"]
        DB[("PostgreSQL<br/>datos + imágenes")]
        API --> DB
    end
    subgraph CI["GitHub"]
        GH["GitHub Actions<br/>lint, tests, SAST"]
        EAS["EAS Build<br/>.aab / development build"]
    end
    INF -- "HTTPS TLS / JWT Bearer" --> API
    GH -- "deploy hook tras CI verde" --> API
    GH --> EAS
```

### 6.8 Arquitectura por capas

**App móvil (arquitectura limpia)**

```text
apps/mobile/
├── app/                      # Expo Router: rutas
│   ├── (auth)/               # pila NO autenticada: bienvenida, registro
│   └── (app)/                # pila autenticada: perfil, medicamentos, alertas
├── src/
│   ├── domain/               # entidades y reglas puras (sin dependencias de Expo)
│   ├── application/          # casos de uso, Observer de alertas, máquina de permisos
│   ├── infrastructure/       # http (cliente + interceptor), secure-store, cache, camera, location, sensors
│   └── presentation/         # componentes UI, hooks, tema
├── app.config.ts             # permisos, ATS, cleartext, esquema lifesync://
└── eas.json                  # perfiles: development, preview, production
```

**Backend (módulos de NestJS)**

```text
apps/api/src/
├── common/                   # guards, pipes, filtros, decoradores (@CurrentUser)
├── database/                 # DatabaseConnection (Singleton) + PrismaClient
├── auth/                     # registro, servidor OAuth (authorize, token), JWT, refresh
├── health-records/           # alergias, medicamentos, contactos, perfil
├── prescriptions/            # carga y descarga autenticada de imágenes
├── incidents/                # ubicación del incidente
├── export/                   # Strategy: JSON, CSV
└── health/                   # healthz
```

La regla de dependencia va hacia adentro: presentación depende de aplicación, aplicación de dominio. El dominio no importa nada de Expo ni de Nest.

## 7. Requerimientos funcionales

Prioridad con MoSCoW; **Resp.** = responsable principal (ALE, JOS, MAR, HEC). Los **Must** son los que la rúbrica evalúa directamente.

### Sprint 1 – Planeación, arquitectura e identidad blindada

| ID | Requerimiento | Prioridad | Resp. |
|---|---|---|---|
| RF-D01 | Monorepo (npm workspaces), TypeScript estricto, ESLint, Prettier, commitlint y Husky | Must | ALE |
| RF-D02 | GitFlow, protección de `main` y `develop`, CODEOWNERS, commits firmados | Must | ALE |
| RF-D03 | Docker Compose de desarrollo (db, api, pgAdmin, túnel opcional) | Must | ALE |
| RF-D04 | CI en GitHub Actions: lint, tests, `npm audit`, Gitleaks, CodeQL, build Docker, e2e | Must | ALE |
| RF-D05 | CD a Render: `render.yaml` y deploy hook que se dispara con CI verde en `main` | Must | ALE |
| RF-D06 | `eas.json` con perfiles `development`, `preview`, `production` y `EXPO_TOKEN` en CI | Must | ALE |
| RF-D07 | Plantilla base de la app (SDK 58): capas, Expo Router con pilas `(auth)`/`(app)`, cliente HTTP, config por entorno | Must | ALE |
| RF-D08 | README, `.env.example` y guía "primer día" para que el equipo arranque | Should | ALE |
| RF-B01 | `DatabaseConnection` como Singleton (constructor privado + `getInstance()`) que envuelve a `PrismaClient` | Must | ALE |
| RF-B02 | `POST /auth/register` con validación y hash **Argon2id** asíncrono | Must | ALE |
| RF-B03 | Servidor OAuth: `GET/POST /oauth/authorize` (login propio) y `POST /oauth/token` (`authorization_code` + `code_verifier`, `refresh_token`); JWT ES256 | Must | ALE |
| RF-B04 | Refresh token rotativo: solo se guarda su hash; si se reutiliza uno viejo se revoca la familia | Should | ALE |
| RF-B05 | `POST /auth/logout` revoca el refresh token | Should | ALE |
| RF-B06 | Migraciones iniciales con Prisma Migrate y seed solo para desarrollo | Must | ALE |
| RF-M01 | Navegación con pilas separadas y guardia de sesión (esqueleto en la base, JOS lo completa) | Must | ALE + JOS |
| RF-M02 | Pantalla de bienvenida que inicia el flujo OAuth con `expo-auth-session` (PKCE S256) | Must | JOS |
| RF-M03 | Pantalla de registro con validación local (Zod) | Must | JOS |
| RF-M04 | Access y refresh token guardados en `expo-secure-store`; restauración de sesión al abrir | Must | JOS |
| RF-M05 | Cierre de sesión: borra SecureStore y la caché local | Must | JOS |
| RF-M06 | Sistema visual (colores, tipografía, componentes base) y mockups de las pantallas | Must | MAR |

### Sprint 2 – Core de historial clínico y protección contra inyecciones

| ID | Requerimiento | Prioridad | Resp. |
|---|---|---|---|
| RF-B07 | CRUD de alergias, medicamentos (con bandera `controlled`), contactos de emergencia y perfil (tipo de sangre) | Must | ALE |
| RF-B08 | Todos los endpoints protegidos por `JwtAuthGuard`; el `userId` sale del token, nunca del body ni de la URL | Must | ALE |
| RF-B09 | Validación de DTOs con `class-validator` (`whitelist`, `forbidNonWhitelisted`, tipos y longitudes) | Must | ALE |
| RF-B10 | Control IDOR: toda consulta filtra por `{ id, userId: auth.sub }`; si no es dueño responde **404** | Must | ALE |
| RF-M07 | Formularios dinámicos para el perfil del paciente | Must | JOS + MAR |
| RF-M08 | Interceptor HTTP global que lee el JWT de SecureStore e inyecta `Authorization: Bearer <JWT>` | Must | ALE |
| RF-M09 | Interceptor de respuesta: ante un 401 hace un solo refresh (single-flight) y reintenta | Should | ALE |
| RF-M10 | Validación sintáctica local antes de enviar | Must | JOS |
| RF-M11 | Caché local cifrada de alergias, medicamentos y contactos (lectura offline) | Must | ALE (cifrado) + JOS (uso) |

### Sprint 3 – Alertas, sensores nativos y estados

| ID | Requerimiento | Prioridad | Resp. |
|---|---|---|---|
| RF-B11 | Exportación con patrón **Strategy**: `GET /export?format=json\|csv` | Must | ALE (delegable a JOS) |
| RF-B12 | Escape de celdas CSV que empiezan con `=`, `+`, `-` o `@` (CSV injection) | Must | ALE (delegable a JOS) |
| RF-B13 | `POST /prescriptions` (multipart): límite de 2 MB, tipo verificado por magic bytes, guardado como `Bytes` | Must | ALE |
| RF-B14 | `GET /prescriptions/:id` autenticado y con control de propiedad | Must | ALE |
| RF-B15 | `POST /incidents/location` para el rastreo de ubicación en la nube | Must | ALE |
| RF-M12 | Módulo de alertas con patrón **Observer** y notificaciones locales (`expo-notifications`) | Must | JOS |
| RF-M13 | Anomalías: dosis crítica sin confirmar, datos sin sincronizar (ver 9.3) | Must | JOS |
| RF-M14 | Detección de posible caída con acelerómetro (`expo-sensors`) | Should | MAR |
| RF-M15 | **Máquina de estados** de permisos (cámara y GPS) | Must | JOS |
| RF-M16 | Escaneo de recetas con la cámara, compresión en el cliente y carga | Must | MAR |
| RF-M17 | Permisos declarados en `app.config.ts` (equivalente a `AndroidManifest.xml` / `Info.plist`): solo cámara y ubicación | Must | ALE |
| RF-M18 | **Graceful degradation:** sin GPS se desactiva solo el rastreo en la nube; el historial sigue funcionando offline | Must | MAR + JOS |
| RF-M19 | Banner "Sin conexión" y lectura del historial desde caché | Must | JOS |
| RF-M20 | Cola de escrituras pendientes (outbox) que se envía al volver la red | Could | JOS |
| RF-M21 | Pantalla "Tarjeta de emergencia" de lectura rápida y offline | Should | MAR |

### Sprint 4 – Pruebas, hardening y distribución

| ID | Requerimiento | Prioridad | Resp. |
|---|---|---|---|
| RF-E01 | Suite Jest del backend: parseo de datos y validación de tokens (más las demás de la sección 15) | Must | ALE |
| RF-E02 | Suite Jest de la app: máquina de permisos, Observer, interceptor, parseo | Must | HEC + JOS |
| RF-E03 | Android: `network_security_config.xml` con `cleartextTrafficPermitted="false"` | Must | ALE |
| RF-E04 | iOS: `NSAppTransportSecurity` con `NSAllowsArbitraryLoads = false` | Must | ALE |
| RF-E05 | SAST: `npm audit`, Gitleaks y CodeQL en CI; reporte documentado | Must | ALE (ejecuta) + HEC (documenta) |
| RF-E06 | Build Release de Android firmado: `.aab` | Must | ALE |
| RF-E07 | Build Release de iOS firmado: `.ipa` (depende de cuenta de Apple, ver 17) | Should | ALE |

## 8. Requerimientos de seguridad

| ID | Control | Implementación | Evidencia en demo |
|---|---|---|---|
| RS-01 | Sin contraseñas en claro | Argon2id async; el texto plano nunca se guarda ni se loguea | pgAdmin muestra `$argon2id$...` |
| RS-02 | Token en hardware seguro | `expo-secure-store` (Keystore/Keychain); no se guarda en AsyncStorage | Código + inspección del almacenamiento |
| RS-03 | JWT bien firmado y validado | ES256, `exp` corto, validación de `iss` y `aud`; se rechaza `alg: none` y tokens manipulados | Postman con token alterado devuelve 401 |
| RS-04 | OAuth seguro | Authorization Code + PKCE S256, código de un solo uso con 60 s de vida, `redirect_uri` exacto, `state` verificado, rotación de refresh | Intentar canjear un código dos veces o con otro verifier devuelve 400 |
| RS-05 | Anti-inyección SQL/NoSQL | Prisma (consultas parametrizadas), sin SQL concatenado, DTOs con `whitelist` | Payloads `' OR 1=1 --` y `{"$ne":null}` devuelven 400 |
| RS-06 | Anti-IDOR | Propiedad verificada en el servidor, IDs UUID no secuenciales (defensa adicional) | Postman con ID de otro usuario devuelve 404 |
| RS-07 | Solo TLS | Render sirve HTTPS; Android: cleartext bloqueado; iOS: ATS activo | La app Release no abre `http://` |
| RS-08 | Sin secretos en el repo | `.env` ignorado, `.env.example`, Gitleaks en CI, secretos en GitHub Secrets, EAS Secrets y variables de Render | Reporte de Gitleaks limpio |
| RS-09 | Fuerza bruta | `@nestjs/throttler` en login y token (por ejemplo 5 intentos por minuto) | Postman recibe 429 |
| RS-10 | Cabeceras seguras | `helmet`, CORS restringido, límite de tamaño de body | Revisión de respuestas |
| RS-11 | Datos médicos en reposo | Caché local cifrada (XChaCha20-Poly1305); BD de Render con acceso externo restringido por IP | Revisión de código y panel de Render |
| RS-12 | Logs sin datos personales | Nunca se registran contraseñas, tokens ni datos clínicos | Revisión de logs |
| RS-13 | Subida de archivos | Límite de tamaño, tipo verificado por magic bytes, descarga solo autenticada y con propiedad | Subir un `.exe` renombrado a `.jpg` devuelve 400 |

## 9. Patrones de diseño (evidencia para la rúbrica)

### 9.1 Singleton – conexión a la base de datos

```ts
// apps/api/src/database/database-connection.ts
import { PrismaClient } from '@prisma/client';

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  readonly client: PrismaClient;

  private constructor() {
    this.client = new PrismaClient();
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
}
// En DatabaseModule: { provide: PrismaClient, useFactory: () => DatabaseConnection.getInstance().client }
```

### 9.2 Strategy – exportación del historial

```ts
export interface ExportStrategy {
  readonly format: 'json' | 'csv';
  readonly contentType: string;
  export(record: EmergencyHistory): string;
}

export class JsonExportStrategy implements ExportStrategy { /* ... */ }
export class CsvExportStrategy implements ExportStrategy { /* escapa =,+,-,@ */ }

@Injectable()
export class ExportService {
  private readonly strategies = new Map<string, ExportStrategy>();
  constructor(@Inject(EXPORT_STRATEGIES) list: ExportStrategy[]) {
    list.forEach((s) => this.strategies.set(s.format, s));
  }
  run(format: string, record: EmergencyHistory) {
    const strategy = this.strategies.get(format);
    if (!strategy) throw new BadRequestException('Formato no soportado');
    return { body: strategy.export(record), contentType: strategy.contentType };
  }
}
```

Agregar un formato nuevo (por ejemplo PDF) solo exige una clase nueva, sin tocar el servicio (principio Abierto/Cerrado de SOLID).

### 9.3 Observer – alertas médicas y anomalías

```ts
export interface AlertObserver { update(alert: MedicalAlert): void }

export class AlertSubject {
  private observers = new Set<AlertObserver>();
  subscribe(o: AlertObserver) { this.observers.add(o); return () => this.observers.delete(o); }
  notify(alert: MedicalAlert) { this.observers.forEach((o) => o.update(alert)); }
}
// Observers: LocalNotificationObserver (expo-notifications), InAppBannerObserver, AlertLogObserver
```

**Qué entendemos por "anomalías".** El documento dice "cuando el teléfono detecte anomalías o recordatorios de medicamentos críticos". Se interpreta como eventos que la app detecta por sí misma (reglas o sensores), no solo recordatorios programados:

| Anomalía / alerta | Cómo se detecta | Prioridad |
|---|---|---|
| Recordatorio de medicamento | Notificación local programada según `frequencyHours` | Must |
| Dosis crítica sin confirmar | Medicamento `controlled` cuyo recordatorio no se confirma en 15 min | Must |
| Datos sin sincronizar | Cambios pendientes y sin red por más de N horas (`@react-native-community/netinfo`) | Must |
| Posible caída | Acelerómetro (`expo-sensors`): pico de impacto y luego inmovilidad de unos segundos; muestra una cuenta regresiva de 30 s para cancelar antes de avisar | Should |
| Historial incompleto | Falta tipo de sangre o contacto de emergencia | Could |

**Aclaraciones honestas:**

- La detección de caídas funciona solo con la app **en primer plano** y los umbrales son heurísticos que hay que calibrar; no es un dispositivo médico y la app lo dice en pantalla.
- Para la demo, una "caída" se simula con un sacudón o golpe controlado al teléfono.
- Las notificaciones son **locales**; las push remotas quedan fuera del alcance.
- Confirmar esta interpretación con el docente (ver sección 22).

### 9.4 Máquina de estados – permisos de hardware

Un estado por permiso (cámara y GPS):

| Estado actual | Evento | Estado siguiente | Efecto en la app |
|---|---|---|---|
| `undetermined` | `REQUEST` | `requesting` | Muestra el diálogo del sistema |
| `requesting` | `GRANT` | `granted` | Habilita la función |
| `requesting` | `DENY` | `denied` | Modo degradado y botón "Intentar de nuevo" |
| `denied` | `REQUEST` | `requesting` | Vuelve a pedir |
| `denied` | `BLOCK` (no se puede volver a preguntar) | `blocked` | Explica y ofrece "Abrir ajustes" |
| `blocked` | `OPEN_SETTINGS` / `APP_FOREGROUND` | `undetermined` | Se vuelve a verificar al regresar a la app |
| `granted` | `REVOKED` (el usuario lo quita en ajustes) | `denied` | Modo degradado sin crash |

Se implementa como reducer puro (fácil de probar con Jest). XState es opcional.

**Degradación:** GPS en `denied` o `blocked` desactiva solo `POST /incidents/location`; cámara en `denied` o `blocked` permite capturar la receta manualmente. El historial clínico siempre funciona offline.

## 10. Modelo de datos (Prisma)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  profile       HealthProfile?
  allergies     Allergy[]
  medications   Medication[]
  contacts      EmergencyContact[]
  prescriptions Prescription[]
  locations     IncidentLocation[]
  refreshTokens RefreshToken[]
  authCodes     AuthorizationCode[]
}

model AuthorizationCode {
  id            String    @id @default(uuid())
  userId        String
  codeHash      String    @unique
  codeChallenge String                 // S256
  redirectUri   String
  expiresAt     DateTime               // 60 s
  usedAt        DateTime?
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String    @unique
  familyId   String
  expiresAt  DateTime
  revokedAt  DateTime?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model HealthProfile {
  id        String     @id @default(uuid())
  userId    String     @unique
  bloodType BloodType?
  notes     String?    @db.VarChar(500)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Allergy {
  id       String   @id @default(uuid())
  userId   String
  name     String   @db.VarChar(100)
  severity Severity
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Medication {
  id             String    @id @default(uuid())
  userId         String
  name           String    @db.VarChar(100)
  dose           String    @db.VarChar(50)
  frequencyHours Int
  controlled     Boolean   @default(false)
  startsAt       DateTime
  endsAt         DateTime?
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model EmergencyContact {
  id           String @id @default(uuid())
  userId       String
  name         String @db.VarChar(100)
  phone        String @db.VarChar(20)
  relationship String @db.VarChar(50)
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Prescription {
  id        String   @id @default(uuid())
  userId    String
  mimeType  String
  sizeBytes Int
  data      Bytes                       // imagen comprimida (≤ 2 MB)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model IncidentLocation {
  id         String   @id @default(uuid())
  userId     String
  latitude   Float
  longitude  Float
  recordedAt DateTime
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

enum BloodType { A_POS A_NEG B_POS B_NEG AB_POS AB_NEG O_POS O_NEG }
enum Severity  { MILD MODERATE SEVERE }
```

Los códigos de autorización y los refresh tokens se guardan **hasheados**. Defensa adicional opcional: políticas **Row Level Security** de PostgreSQL por `userId` (Could).

## 11. API (prefijo `/api/v1`)

| Método y ruta | Auth | Función | Respuestas |
|---|---|---|---|
| `POST /auth/register` | No | Crea el usuario (hash Argon2id) | 201, 400, 409 |
| `GET /oauth/authorize` | No | Muestra la página de login (parámetros PKCE y `state`) | 200, 400 |
| `POST /oauth/authorize` | No | Valida credenciales y redirige con el `code` | 302, 400, 401, 429 |
| `POST /oauth/token` | No | `authorization_code` + `code_verifier`, o `refresh_token` | 200, 400, 401, 429 |
| `POST /auth/logout` | Sí | Revoca el refresh token | 204 |
| `GET /users/me` | Sí | Datos del usuario autenticado | 200 |
| `GET/PUT /health-records/profile` | Sí | Perfil clínico y tipo de sangre | 200, 400 |
| `GET/POST /health-records/allergies` | Sí | Listar y crear alergias | 200, 201, 400 |
| `PUT/DELETE /health-records/allergies/:id` | Sí | Editar y eliminar (solo dueño) | 200, 204, 404 |
| `GET/POST /health-records/medications` | Sí | Listar y crear medicamentos | 200, 201, 400 |
| `PUT/DELETE /health-records/medications/:id` | Sí | Editar y eliminar (solo dueño) | 200, 204, 404 |
| `GET/POST /health-records/contacts` | Sí | Listar y crear contactos | 200, 201, 400 |
| `PUT/DELETE /health-records/contacts/:id` | Sí | Editar y eliminar (solo dueño) | 200, 204, 404 |
| `POST /prescriptions` | Sí | Sube imagen (multipart, máx. 2 MB) | 201, 400, 413 |
| `GET /prescriptions/:id` | Sí | Descarga la imagen (solo dueño) | 200, 404 |
| `POST /incidents/location` | Sí | Registra la ubicación del incidente | 201, 400 |
| `GET /export?format=json\|csv` | Sí | Exporta el historial (Strategy) | 200, 400 |
| `GET /healthz` | No | Verificación para Docker, Render y el monitor de "despertar" | 200 |

Documentación con Swagger en `/api/docs` (solo en `development`). Errores con formato único: `statusCode`, `message`, `error`.

## 12. Docker, entornos y CI/CD

### 12.1 Estructura del repositorio

```text
lifesync/
├── apps/
│   ├── api/                 # NestJS + Prisma (Dockerfile propio)
│   └── mobile/              # Expo SDK 58
├── docker-compose.yml       # desarrollo
├── render.yaml              # Blueprint de Render (IaC)
├── .env.example
├── .github/
│   ├── workflows/ (ci.yml, security.yml, mobile-release.yml)
│   ├── dependabot.yml
│   └── CODEOWNERS
├── docs/ (PRD, ADRs, security/sast-report.md, postman/)
└── README.md
```

### 12.2 `docker-compose.yml` (desarrollo)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports: ["127.0.0.1:5432:5432"]       # solo accesible desde tu laptop
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      retries: 10

  api:
    build: { context: ., dockerfile: apps/api/Dockerfile, target: dev }
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
    ports: ["3000:3000"]
    volumes:
      - ./apps/api:/app/apps/api
      - /app/node_modules
    depends_on:
      db: { condition: service_healthy }

  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: ["tools"]
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports: ["127.0.0.1:5050:80"]
    depends_on: [db]

  tunnel:                                # HTTPS opcional para probar con el teléfono en local
    image: ngrok/ngrok:latest
    profiles: ["tunnel"]
    command: http api:3000
    environment:
      NGROK_AUTHTOKEN: ${NGROK_AUTHTOKEN}
    ports: ["127.0.0.1:4040:4040"]
    depends_on: [api]

volumes:
  pgdata:
```

**Dockerfile del API:** multi-stage con las etapas `base` → `dev` → `build` → `prod`. **`prod` debe ser la última etapa**, porque Render construye la última etapa por defecto, mientras que Compose usa `target: dev`. En `prod` se usa usuario no root y el comando de arranque ejecuta `npx prisma migrate deploy && node dist/main.js` (el plan gratuito no ofrece pre-deploy command, así que las migraciones corren al arrancar).

### 12.3 Separación real de entornos

| Entorno | Backend | BD | App (perfil EAS) | URL base |
|---|---|---|---|---|
| `development` | Docker local | `lifesync_dev` (contenedor) | `development` (dev build Android) | `http://localhost` en emulador o túnel HTTPS |
| `test` | Contenedores efímeros en GitHub Actions | `lifesync_test` (service container) | n/a | Interna |
| `production` | Render (Docker, plan gratuito) | PostgreSQL de Render | `preview` / `production` (Release) | `https://lifesync-api.onrender.com` (el nombre real lo asigna Render) |

Cada entorno tiene su propio `.env`, sus propias llaves JWT y su propia base de datos. La URL del API se inyecta por perfil de EAS (`EXPO_PUBLIC_API_URL`), nunca está hardcodeada en componentes. Las llaves JWT en Render se guardan en base64 como variables de entorno (`sync: false`).

### 12.4 Despliegue en Render (`render.yaml`)

```yaml
services:
  - type: web
    name: lifesync-api
    runtime: docker
    plan: free
    dockerfilePath: ./apps/api/Dockerfile
    dockerContext: .
    healthCheckPath: /api/v1/healthz
    autoDeploy: false                 # el deploy lo dispara GitHub Actions con CI verde
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: lifesync-db
          property: connectionString
      - key: JWT_PRIVATE_KEY_B64
        sync: false
      - key: JWT_PUBLIC_KEY_B64
        sync: false
      - key: OAUTH_REDIRECT_URIS
        value: lifesync://oauth/callback

databases:
  - name: lifesync-db
    plan: free
    databaseName: lifesync
    user: lifesync
```

Verificar la sintaxis exacta contra la documentación de Render al crear el Blueprint (los campos pueden cambiar). Recordar el límite de 30 días de la BD gratuita (6.6): **crearla al inicio del Sprint 3**.

### 12.5 Pipeline de CI/CD

**Flujo:** PR a `develop` o `main` → CI completo → merge → si la rama es `main` y todo está en verde, se llama al *deploy hook* de Render.

```yaml
# .github/workflows/ci.yml (resumen)
name: ci
on:
  pull_request: { branches: [develop, main] }
  push: { branches: [develop, main] }

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test -- --coverage

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: lifesync_test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/lifesync_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
      - run: npm run test:e2e -w apps/api

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci && npm audit --audit-level=high
      - run: docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --verbose

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -f apps/api/Dockerfile .

  deploy:
    needs: [quality, e2e, security, docker]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

- **CodeQL** va en `security.yml` (análisis semanal y en cada PR).
- **Dependabot** (`dependabot.yml`) para npm y GitHub Actions.
- Gitleaks se corre con su imagen oficial (no con la action) para evitar la licencia que la action pide a organizaciones.
- Secretos en GitHub: `RENDER_DEPLOY_HOOK_URL`, `EXPO_TOKEN`. Nada de llaves en el repositorio.
- Alternativa a revisar en la documentación de Render: despliegue automático "después de que pasen los checks de CI". El *deploy hook* es la opción explícita y la que se usa aquí.

### 12.6 CI/CD de la app móvil (EAS)

- `eas.json` con tres perfiles: `development` (development client, APK interno), `preview` (APK interno para validar manifiestos y red) y `production` (`.aab`, `autoIncrement` de versión).
- Workflow `mobile-release.yml`: se ejecuta al crear un tag `v*` en `main` y corre `eas build --platform android --profile production --non-interactive` con `EXPO_TOKEN`.
- El plan gratuito de EAS tiene cuota mensual limitada de builds y cola de espera; **programar los builds con tiempo** (verificar los límites vigentes en expo.dev/pricing).
- Credenciales de Android (keystore) administradas por EAS; hacer respaldo con `eas credentials`.

## 13. Pantallas principales (guía para el diseñador)

| Pantalla | Pila | Contenido clave | Estados a diseñar |
|---|---|---|---|
| Bienvenida / Registro | `(auth)` | Botón "Iniciar sesión" (abre el navegador del sistema), registro | Error, cargando, sin conexión |
| Página de login del servidor | Web (backend) | Correo, contraseña, estilo consistente con la app | Error de credenciales, límite de intentos |
| Inicio / Tarjeta de emergencia | `(app)` | Sangre, alergias, medicamentos y contactos de un vistazo | Offline, datos vacíos |
| Alergias, Medicamentos, Contactos | `(app)` | Lista + formulario dinámico | Vacío, error de validación, sin sincronizar |
| Escanear receta | `(app)` | Cámara, vista previa, subir | Permiso denegado, bloqueado, cargando |
| Alertas | `(app)` | Recordatorios, anomalías, cuenta regresiva de posible caída | Sin alertas |
| Ubicación del incidente | `(app)` | Coordenadas, botón de enviar | GPS denegado (función deshabilitada con explicación) |
| Exportar | `(app)` | JSON o CSV | Cargando, error |
| Ajustes | `(app)` | Cerrar sesión, estado de permisos | n/a |
| Servidor despertando | `(app)` | "Conectando…" con reintentos (por el sueño de Render) | Reintentando, falló |

Accesibilidad: contraste AA, objetivos táctiles ≥ 44 px, textos escalables y etiquetas accesibles. En una emergencia la tarjeta debe leerse en menos de 3 toques.

## 14. GitFlow y Scrum

**Ramas**

| Rama | Propósito | Reglas |
|---|---|---|
| `main` | Producción (solo releases etiquetados) | Protegida; PR desde `release/*` o `hotfix/*`; dispara el deploy a Render |
| `develop` | Integración | Protegida; PR desde `feature/*` |
| `feature/LIFE-12-descripcion` | Una historia de usuario | Sale de `develop` |
| `release/x.y.z` | Estabilización del sprint | Sale de `develop`, se fusiona a `main` y `develop` |
| `hotfix/*` | Corrección urgente en producción | Sale de `main` |

**Protección de ramas (Alejandro la configura el día 1)**

- Pull Request obligatorio con **al menos 1 aprobación del Scrum Master** (`CODEOWNERS`).
- Checks de CI obligatorios (lint, pruebas, `npm audit`, Gitleaks, CodeQL).
- **Commits firmados** (GPG o SSH) y sin push forzado.
- Mensajes con clave de Jira, por ejemplo `feat(auth): argon2id hashing [LIFE-14]`.

**Atención con GitHub:** la protección de ramas y CodeQL son gratuitas en repositorios **públicos**. En repositorios **privados** requieren un plan de pago (GitHub Pro/Team o el Student Developer Pack). Decisión: usar un **repositorio público** sin ningún secreto, o activar el Student Developer Pack. Con repo público, activar también *secret scanning* y *push protection*.

**Tablero (Jira, a cargo de Héctor y su agente)**

- Columnas: `Backlog → To Do → In Progress → In Review → QA → Done`.
- Un Epic por sprint; historias con formato "Como [rol], quiero [acción] para [beneficio]" y criterios de aceptación en Gherkin.
- Cada historia enlaza su PR; el tablero debe mostrar transiciones reales a lo largo del sprint.

**Definition of Done**

- [ ] Código revisado y aprobado en PR firmada.
- [ ] Pruebas unitarias escritas y en verde.
- [ ] CI en verde (lint, tests, audit, Gitleaks, CodeQL).
- [ ] Sin secretos ni URLs hardcodeadas.
- [ ] Criterios de aceptación verificados en un dispositivo real (historias de la app).
- [ ] Documentado en README o ADR si cambia una decisión.

**Ceremonias (sprint de 1 semana):** planning el lunes, daily de 10 min, review y retrospectiva el viernes.

## 15. Estrategia de pruebas y calidad

**Pruebas unitarias (Jest)**

| Área | Qué se prueba |
|---|---|
| Tokens | JWT válido, expirado, firma alterada, `alg: none`, `iss`/`aud` incorrectos |
| OAuth | Código de un solo uso, expiración, `code_verifier` incorrecto, `redirect_uri` distinto, `state` inválido |
| Hashing | Hash distinto por contraseña, verificación correcta e incorrecta |
| DTOs | Rechazo de tipos erróneos, campos extra, strings enormes, intentos de inyección |
| Guard de propiedad | Dueño correcto pasa; usuario ajeno recibe 404 |
| Strategy | JSON correcto, CSV correcto, escape de `=`, `+`, `-`, `@`, formato desconocido |
| Máquina de permisos | Todas las transiciones de la tabla 9.4 |
| Observer y anomalías | Suscripción, notificación, baja de observadores; reglas de dosis sin confirmar y detección de caída con datos simulados |
| Parseo de datos | Respuestas de API a entidades de dominio, valores nulos y malformados |
| Interceptor HTTP | Inyecta el header, no lo inyecta sin sesión, refresca ante 401 una sola vez |
| Cifrado de caché | Cifra y descifra; falla con clave incorrecta o dato alterado |

**Pruebas e2e (Supertest + PostgreSQL en contenedor, también en CI):** flujo OAuth completo, CRUD, y **IDOR con dos usuarios** (A intenta leer, editar y borrar registros e imágenes de B y siempre recibe 404).

**Metas:** cobertura ≥ 80% en `auth`, `common` (guards/pipes), `export` y `application/` de la app; ≥ 60% global. SOLID verificado en revisión de PR (inyección de dependencias, interfaces para estrategias y observadores, módulos con una sola responsabilidad). Cero strings confidenciales en manifiestos o componentes (lo comprueba Gitleaks).

**Pruebas manuales en el dispositivo:** modo avión, denegar y bloquear permisos, matar la app y reabrirla con sesión activa, token expirado, servidor dormido en Render.

## 16. SAST y hardening

| Herramienta | Qué busca | Cuándo corre |
|---|---|---|
| `npm audit --audit-level=high` | Vulnerabilidades conocidas en dependencias | Cada PR y semanal |
| Gitleaks | Secretos expuestos (llaves, tokens, contraseñas) | Cada PR y en el historial completo una vez |
| CodeQL | Fallos de seguridad en el código TypeScript | Cada PR y semanal |
| Dependabot | Dependencias desactualizadas o vulnerables | Continuo |
| Snyk / Trivy (opcional) | Dependencias y vulnerabilidades en la imagen Docker | Cada PR |

**Documentación del proceso (15% de la rúbrica):** `docs/security/sast-report.md` con herramientas usadas, fecha de ejecución, hallazgos, decisión por cada hallazgo (corregido, mitigado o aceptado con justificación) y comandos para reproducir. Alejandro ejecuta y Héctor documenta.

**Hardening adicional:** `helmet`, CORS con lista blanca, throttling, límite de body, usuario no root en el contenedor, llaves JWT fuera del repositorio, `strict` en TypeScript y sin `console.log` de datos sensibles.

## 17. Plan de liberación

**Android `.aab`**

1. Perfil `production` en `eas.json`.
2. Keystore administrada por EAS (respaldar con `eas credentials`); nunca en el repositorio.
3. `eas build -p android --profile production` genera el `.aab`.
4. Verificación de firma: `jarsigner -verify -verbose -certs app.aab`.

**iOS `.ipa`: ¿es necesaria la cuenta de Apple Developer?**

Para un `.ipa` **firmado para distribución** (App Store/TestFlight) **sí es necesaria**: el certificado y el perfil de aprovisionamiento salen del Apple Developer Program, que es de paga. Sin cuenta no hay forma legítima de producir ese archivo. Un build para simulador no cuenta como binario de distribución.

Opciones, en orden de preferencia:

1. **Pedir por escrito al docente** que acepte el `.aab` firmado como artefacto de liberación y que el pipeline de iOS se entregue documentado y configurado (perfil `ios` de `eas.json`, checklist y capturas del proceso), sin el binario. Hacerlo **en la semana 1**.
2. Usar una cuenta de Apple Developer de la universidad, un familiar o un compañero que ya la tenga.
3. Pagar la membresía solo si el docente exige el `.ipa` y ninguna otra opción funciona.

La rúbrica dice "listo para tiendas oficiales": sin cuenta de Apple el equipo cubre bien la mitad Android. Es un riesgo explícito (sección 21).

**Checklist de Release**

- [ ] `usesCleartextTraffic` desactivado y `network_security_config.xml` presente.
- [ ] `NSAppTransportSecurity` sin excepciones.
- [ ] Solo los permisos de cámara y ubicación en los manifiestos generados (se revisan con `npx expo prebuild`).
- [ ] URI de redirección de OAuth de producción registrada (sin `exp://`).
- [ ] Variables sensibles en EAS Secrets, ninguna en `app.config.ts` ni en el código.
- [ ] Versión y `versionCode` incrementados.
- [ ] SAST ejecutado y reporte actualizado.
- [ ] Tag `vX.Y.Z` en `main`.

## 18. Guion de demostración por estación

**Antes de empezar (T-10 min):** despertar Render (`/api/v1/healthz`), verificar que la BD gratuita no haya expirado, y tener la app `preview` o `production` instalada en el teléfono.

**Estación 1 – Backend, nube y seguridad (Alejandro)**

1. Mostrar el pipeline en verde y el servicio desplegado en Render (HTTPS).
2. Registro de dos usuarios en Postman.
3. Abrir pgAdmin contra la BD de Render y mostrar que `passwordHash` empieza con `$argon2id$`.
4. Enviar payloads corruptos (`' OR 1=1 --`, `{"$ne":null}`, campos extra, tipos erróneos) y mostrar los 400.
5. Con el token del usuario A, pedir el ID de un registro del usuario B y mostrar el 404.
6. Enviar un token alterado y uno expirado y mostrar los 401; canjear un `code` OAuth dos veces y mostrar el rechazo.
7. Mostrar `/export?format=json` y `format=csv` (Strategy).

**Estación 2 – App móvil y fallas (Jose y Mario)**

1. App en teléfono físico, login con OAuth (navegador del sistema) y navegación protegida.
2. Mostrar que el token está en SecureStore (no en AsyncStorage).
3. Denegar el permiso de GPS: la app no se cae y solo desactiva el rastreo en la nube.
4. Bloquear la cámara: se muestra "Abrir ajustes" y captura manual.
5. **Modo avión:** historial legible desde caché cifrada, banner "Sin conexión", sin crash.
6. Recordatorio de medicamento (Observer) como notificación local y, si se logra, alerta de posible caída.

**Estación 3 – Scrum, QA y auditoría (Héctor y Alejandro)**

1. Tablero con historias, transiciones y PRs enlazadas.
2. Historial de GitHub: PRs aprobadas, commits firmados, ramas GitFlow.
3. `npm test -- --coverage` en vivo.
4. Reporte de Gitleaks, `npm audit` y CodeQL.
5. Archivo `.aab` firmado, verificación con `jarsigner` y estado del `.ipa` (ver 17).

## 19. Trazabilidad con la rúbrica

| Criterio (peso) | Cómo se cubre | Evidencia |
|---|---|---|
| 1. Arquitectura, patrones y flujo ágil (25%) | Secciones 6, 9, 12 y 14: entornos separados, GitFlow, tablero, Singleton, Strategy y Observer | Código, ramas protegidas, Jira, `render.yaml` |
| 2. Codificación segura y criptografía (25%) | Sección 8: Argon2id, OAuth PKCE, SecureStore, TLS obligatorio, IDOR | Postman, pgAdmin, configuración nativa |
| 3. Core de negocio y sensores (20%) | RF-B07 a RF-B15, RF-M12 a RF-M21, sección 9.4 | Demo en dispositivo físico |
| 4. Pruebas y calidad (15%) | Sección 15 y Gitleaks | Cobertura y reportes |
| 5. Plan de liberación y artefactos (15%) | Secciones 16 y 17 | `.aab`, `sast-report.md` y estado del `.ipa` |

## 20. Cronograma por sprint

### 20.1 Resumen

| Sprint | Objetivo | Demo de cierre |
|---|---|---|
| 1 | Base del proyecto, CI/CD, Singleton, register, OAuth PKCE, SecureStore, navegación protegida | Login completo en teléfono contra el backend de Render |
| 2 | CRUD clínico, validaciones, IDOR, interceptor HTTP, formularios, caché cifrada | Postman bloqueando ataques; app guardando datos y leyéndolos offline |
| 3 | Strategy, Observer, anomalías, permisos, cámara, GPS, degradación; **crear la BD de producción en Render** | Prueba de modo avión y permisos denegados |
| 4 | Pruebas, SAST, red segura, builds firmados, ensayo | Simulacro completo de las 3 estaciones |

### 20.2 Base del proyecto (Alejandro, días 1 a 2 del Sprint 1)

- [ ] Crear el repositorio (público) y el monorepo con npm workspaces.
- [ ] `.gitignore`, `.editorconfig`, ESLint, Prettier, commitlint y Husky.
- [ ] Ramas `main` y `develop`, protecciones, CODEOWNERS y commits firmados.
- [ ] Plantilla del backend (NestJS + Prisma + Dockerfile multi-stage) y `docker-compose.yml`.
- [ ] Plantilla de la app con `npx create-expo-app@latest` (SDK 58), estructura por capas y Expo Router con pilas `(auth)` y `(app)`.
- [ ] Verificar qué SDK soporta Expo Go en los teléfonos del equipo; generar la development build de Android con EAS y compartirla.
- [ ] `ci.yml`, `security.yml`, Dependabot y secretos de GitHub.
- [ ] Crear la cuenta de Render, probar un despliegue de `/healthz` con `render.yaml` (sin crear aún la BD definitiva) y guardar el deploy hook.
- [ ] README con "primer día", `.env.example` y plantilla de PR.
- [ ] Invitar al equipo, asignar roles en `CODEOWNERS` y hacer una demo de 20 min del flujo de trabajo.

### 20.3 Ritmo semanal

Lunes planning, martes a jueves desarrollo con PRs diarias, viernes review, retrospectiva y simulacro. Los builds `preview` en dispositivo real se generan **desde el Sprint 1**, no se dejan para el final.

## 21. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| No hay cuenta de Apple Developer para el `.ipa` | Alta | Alto | Pedir aceptación por escrito al docente en la semana 1; documentar el pipeline iOS; buscar cuenta prestada (sección 17) |
| La BD gratuita de Render expira a los 30 días | Alta | Alto | Crearla al inicio del Sprint 3, seed listo, `pg_dump` antes de la demo, recordatorio en calendario |
| Render dormido durante la demo (≈ 1 min de arranque) | Alta | Alto | Despertarlo 10 min antes, monitor de ping, pantalla "Conectando…" en la app, plan B con `docker compose` + túnel HTTPS en la laptop 1 |
| Imágenes perdidas por disco efímero | Media | Medio | Guardarlas como `Bytes` en PostgreSQL, comprimidas |
| Expo Go de la tienda aún no soporta SDK 58 | Media | Medio | Development build de Android; si hace falta, usar SDK 57 hasta que salga Expo Go para 58 |
| Expo Go no aplica permisos, cleartext ni el esquema `lifesync://` | Alta | Medio | Validar en builds `preview` antes de cada review |
| App Release bloquea HTTP y falla en local | Alta | Medio | Render da HTTPS; en local usar túnel o el perfil `development` |
| Flujo OAuth PKCE se complica en el Sprint 1 | Media | Alto | Spike de 1 día; plan B documentado: `grant_type=password` temporal con deuda técnica |
| Repo privado sin protección de ramas ni CodeQL | Media | Alto | Repo público sin secretos, o Student Developer Pack |
| Alejandro sobrecargado (backend, DevOps, base) | Alta | Alto | Delegar RF-B11/B12 a Jose si el Sprint 3 aprieta; Héctor toma la documentación del SAST |
| Detección de caídas inexacta o solo en primer plano | Alta | Bajo | Priorizada como *Should*; demo con sacudón controlado |
| Tablero Scrum llenado a última hora | Media | Medio | Regla: toda rama nace de una historia y las transiciones se hacen al avanzar |
| Filtración de una llave o `.env` al repositorio | Media | Alto | `.gitignore` desde el commit 0, Gitleaks, push protection, pre-commit hook |
| Cuota mensual limitada de builds en EAS gratuito | Media | Medio | Agendar builds, usar `development` y `preview` con moderación, builds locales como respaldo |

## 22. Preguntas abiertas

1. ¿El docente acepta el `.aab` firmado y el pipeline de iOS documentado en lugar del `.ipa`? (Pedirlo por escrito en la semana 1.)
2. ¿Qué entiende el docente por "anomalías"? Se propone la definición de la sección 9.3: dosis crítica sin confirmar, datos sin sincronizar y posible caída.
3. ¿Quién del equipo tiene iPhone? Define cómo probarán iOS mientras Expo Go de la tienda no soporte SDK 58.
4. ¿Se confirma la distribución de roles entre Jose, Mario y Héctor de la sección 3?
5. ¿El repositorio puede ser público o tienen el GitHub Student Developer Pack?
6. ¿Alguien tiene ya cuenta de Render y de Expo (EAS), o las crea Alejandro?

## 23. Fuentes consultadas (14 de noviembre de 2026)

- [Expo – How to upgrade to SDK 58](https://expo.dev/blog/how-to-upgrade-to-sdk-58) y [changelog de SDK 58](https://expo.dev/changelog/sdk-58): versión vigente y estado de Expo Go.
- [Expo – Upgrade Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough): Expo Go solo soporta el SDK más reciente.
- [Expo – Upgrade to SDK 56 (dev.to)](https://dev.to/expo/how-to-upgrade-to-expo-sdk-56-o3b): Expo Go no aplica la configuración nativa de `app.json`.
- [Render – Platforms with a real free tier in 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026): servicios gratuitos que se duermen tras 15 minutos.
- [Render pricing explained (livemy.app)](https://livemy.app/blog/render-pricing) y [Render Pricing 2026 (temps.sh)](https://temps.sh/blog/render-pricing-2026): expiración a 30 días de la BD gratuita, 1 GB, 750 horas.
- [OAuth 2.1 explained](https://guptadeepak.com/ciam-compass/guides/oauth-2-1-explained/) y [OAuth 2.0 vs 2.1 (LoginRadius)](https://www.loginradius.com/blog/engineering/oauth-2-0-vs-oauth-2-1): PKCE obligatorio y ROPC eliminado.

Los límites de los planes gratuitos cambian con frecuencia; **confirmarlos en las páginas oficiales de Render y Expo** al iniciar el proyecto.
