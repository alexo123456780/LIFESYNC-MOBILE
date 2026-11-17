# Guía de despliegue: frontend en Vercel + API y Postgres en Render + CI/CD en GitHub Actions

Guía reutilizable para llevar a producción un proyecto con **frontend estático (Vite/React)**, **API en Docker (NestJS)** y **PostgreSQL con migraciones Liquibase**. Está escrita a partir del despliegue real de CivicGuard PWA (noviembre de 2026), con los errores que aparecieron en el camino. Los valores entre `<ángulos>` se sustituyen en cada proyecto.

> **Convención de esta guía:** «verificado» significa que se ejecutó y se comprobó contra los servicios reales. Lo que no se probó está marcado como **no probado**.

---

## 1. Qué se construye

```text
                    push / merge a `prod`
                            │
                  GitHub (repo único, personal)
                  │                         │
        integración Git de Vercel     GitHub Actions (ci.yml)
                  │                         │
                  │              lint-and-test ──► migrar la BD (Liquibase)
                  │                                      │
                  ▼                                      ▼
        Frontend (Vercel, HTTPS)          deploy hook ──► API (Render, Docker)
                                                              │
                                                       Postgres (Render)
```

| Pieza | Servicio | Cómo se despliega |
| --- | --- | --- |
| Frontend | Vercel | Lo construye Vercel al recibir el push a `prod` (integración Git, sin tokens en GitHub) |
| API | Render (servicio web Docker) | GitHub Actions llama al **deploy hook** con el commit exacto, después de migrar |
| Base de datos | Render Postgres | Liquibase la migra desde Actions, por conexión externa con SSL |
| Pruebas y puerta de calidad | GitHub Actions | `lint-and-test` debe pasar antes de cualquier despliegue del backend |

## 2. Decisiones y por qué

| Decisión | Motivo |
| --- | --- |
| **Un solo repositorio**, en una cuenta donde la app de GitHub de Vercel esté instalada | La app de Vercel no estaba en la organización del equipo: no podía conectar el repo. Mantener dos repos obligaba a sincronizar a mano tras cada merge |
| **Solo `prod` despliega**; `develop` nunca | Producción cambia solo cuando se decide con un PR de _release_ |
| **Frontend por integración Git de Vercel**, no por CLI en Actions | La CLI de Vercel no puede crear tokens (403). Un token de larga vida en GitHub solo para publicar estáticos es riesgo innecesario |
| **API por deploy hook de Render**, no por API key | El hook solo puede desplegar; una API key de Render controla toda la cuenta |
| **Migraciones en Actions, antes de la API** | `preDeployCommand` de Render es solo de planes de pago. Así el esquema siempre está al día cuando arranca la versión nueva |
| `autoDeployTrigger: off` en Render | El único camino de despliegue es el hook, y siempre después de migrar |
| La API lee `DATABASE_URL` | De `fromDatabase` de Render solo está documentada la `connectionString` (no `host`/`port`) |
| Interruptor `DEPLOY_ENABLED` | Sin configurar las cuentas, los jobs de despliegue se omiten y el CI no se pone en rojo; también sirve para pausar |
| Entorno `production` de GitHub restringido a `prod` | Los secretos de producción solo están al alcance de workflows que corren en `prod` |

---

## 3. Qué debe tener el repositorio

### 3.1 La API

- **Dockerfile con la imagen de producción como última etapa.** Render construye la última etapa; no hay forma documentada de elegir `target`. Usuario no root (`USER node`).
- **Endpoint de salud** que compruebe la base: `GET /api/health` → `{"status":"ok","database":"up"}` (200) o `503` sin filtrar el motivo.
- **Puerto desde `PORT`** (Render inyecta uno).
- **CORS con lista blanca** (`CORS_ORIGINS`, separada por comas) y cabeceras de seguridad.
- **Soporte de `DATABASE_URL`** (`postgresql://usuario:clave@host[:puerto]/base`) además de variables sueltas, con la contraseña decodificada y **sin incluirla jamás en mensajes de error**. Si falta, la API debe fallar al arrancar.

### 3.2 `render.yaml` (en la raíz)

```yaml
databases:
  - name: <app>-db
    databaseName: <app>
    user: <app>
    postgresMajorVersion: '16'
    plan: free # expira a los 30 días; ver límites (sección 9)

services:
  - type: web
    name: <app>-api
    runtime: docker
    dockerfilePath: ./api/Dockerfile
    dockerContext: ./api
    branch: prod
    autoDeployTrigger: 'off' # entre comillas: sin ellas YAML lo interpreta como booleano
    healthCheckPath: /api/health
    plan: free
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: <app>-db
          property: connectionString
      - key: CORS_ORIGINS
        value: https://<proyecto-vercel>.vercel.app
```

Se validó contra el JSON Schema oficial: <https://render.com/schema/render.yaml.json>. Conviene hacerlo siempre, con un control negativo (un campo inventado debe rechazarse) para saber que la validación sirve.

### 3.3 `web/vercel.json` (junto al código del frontend)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "ignoreCommand": "[ -n \"$VERCEL_GIT_COMMIT_REF\" ] && [ \"$VERCEL_GIT_COMMIT_REF\" != \"prod\" ]",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
}
```

- `rewrites`: fallback de SPA (los archivos existentes se sirven antes que el rewrite).
- Cabeceras: el Service Worker y el HTML nunca se cachean; los archivos con hash, para siempre.
- `ignoreCommand`: **código de salida 0 = Vercel omite la compilación**, 1 = compila. Omite toda rama de Git distinta de `prod`. La condición `-n` hace que un despliegue sin rama (manual por CLI o API) siga compilando. Probado con `sh` para `develop`, `prod`, una rama de trabajo y sin rama.

### 3.4 Job de despliegue en `.github/workflows/ci.yml`

Los jobs de despliegue viven **dentro del mismo `ci.yml`**, con un `if` por rama. Según la documentación de GitHub, `workflow_run` y `workflow_dispatch` requieren el archivo en la rama por defecto, lo que complica el arranque (no se probaron).

```yaml
  deploy-backend:
    name: deploy-backend
    needs: lint-and-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/prod' && vars.DEPLOY_ENABLED == 'true'
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - name: Migrar la base de producción con Liquibase
        env:
          LIQUIBASE_COMMAND_URL: ${{ secrets.DB_JDBC_URL }}
          LIQUIBASE_COMMAND_USERNAME: ${{ secrets.DB_USER }}
          LIQUIBASE_COMMAND_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: |
          set -euo pipefail
          image=$(grep -oE 'liquibase/liquibase:[0-9.]+' docker-compose.yml)
          docker run --rm -e LIQUIBASE_COMMAND_URL -e LIQUIBASE_COMMAND_USERNAME -e LIQUIBASE_COMMAND_PASSWORD \
            -v "$PWD/db/changelog:/liquibase/changelog:ro" "$image" \
            --changelog-file=changelog/db.changelog-root.yaml update
      - name: Desplegar la API en Render (el commit exacto)
        env:
          RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
        run: curl --fail --silent --show-error --get --data-urlencode "ref=${GITHUB_SHA}" --output /dev/null "$RENDER_DEPLOY_HOOK_URL"
      - name: Esperar a que la API responda sana
        env:
          API_URL: ${{ vars.API_URL }}
        run: |
          for attempt in $(seq 1 60); do
            if curl --fail --silent --show-error "$API_URL/api/health" | grep -q '"database":"up"'; then exit 0; fi
            sleep 10
          done
          echo "La API no respondió sana en 10 minutos" >&2; exit 1
```

Detalles que importan:

- Las credenciales de Liquibase van por **variables de entorno del contenedor** (`LIQUIBASE_COMMAND_*`), no por argumentos de línea de comandos.
- La URL JDBC se usó con `?sslmode=require`, que es lo que se verificó contra Render Postgres desde fuera de Render; se recomienda en toda conexión externa.
- El hook admite `ref=<sha>` para desplegar un commit concreto; se añade con `--get --data-urlencode` para no depender de si la URL ya trae `?key=`.
- **Limitación conocida:** mientras Render construye, la versión anterior sigue respondiendo y el último paso pasa igualmente. Para confirmar la versión nueva haría falta consultar la API de Render (requiere API key) o exponer el commit en `/health`.

---

## 4. Configuración única, paso a paso (en este orden)

### 4.1 GitHub

1. Crear el repositorio en la cuenta (o la organización) donde **la app de GitHub de Vercel esté instalada**. Comprobarlo antes: al importar un repositorio en Vercel deben aparecer esa cuenta u organización (en CivicGuard se comprobó listando los espacios de GitHub conectados a Vercel con el conector, y la organización del equipo no estaba).
2. Ramas `develop` y `prod`; **rama por defecto = `prod`** (de ahí sale la rama de producción de Vercel; ver 4.3).
3. Protecciones de ramas (PR + checks, sin aprobaciones si el repo tiene una sola persona):

   ```bash
   BODY='{"required_status_checks":{"strict":false,"contexts":["lint-and-test","liquibase-validate"]},"enforce_admins":false,"required_pull_request_reviews":{"required_approving_review_count":0},"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}'
   for b in develop prod; do printf '%s' "$BODY" | gh api -X PUT repos/<dueño>/<repo>/branches/$b/protection --input -; done
   ```

4. Entorno `production` restringido a `prod`:

   ```bash
   gh api -X PUT repos/<dueño>/<repo>/environments/production \
     -F 'deployment_branch_policy[protected_branches]=false' -F 'deployment_branch_policy[custom_branch_policies]=true'
   gh api -X POST repos/<dueño>/<repo>/environments/production/deployment-branch-policies -f name=prod -f type=branch
   ```

5. **Fusión automática a `develop`** (opcional): activar _Allow auto-merge_ en el repositorio y añadir `.github/workflows/auto-merge.yml`, que activa `gh pr merge --auto --merge` en cada PR hacia `develop`. GitHub fusiona cuando pasan los checks que exige la protección de la rama.

   ```bash
   gh api -X PATCH repos/<dueño>/<repo> -F allow_auto_merge=true
   ```

   El `GITHUB_TOKEN` es de solo lectura por defecto, por eso el workflow declara `contents: write` y `pull-requests: write`. El PR de _release_ a `prod` queda **manual** a propósito (es lo único que despliega). Para cancelar la fusión automática de un PR concreto: `gh pr merge <n> --disable-auto`; para quitarla de todo el repo, borrar `auto-merge.yml`. **Verificado:** el workflow activó la fusión automática 8 segundos después de abrir el PR (el workflow viajaba dentro del propio PR) y GitHub fusionó como `app/github-actions`, con merge commit, al pasar los checks (~50 s). **El push de esa fusión no lanza el CI de `develop`**, porque los eventos creados con `GITHUB_TOKEN` no disparan workflows; no importa mientras `develop` no despliegue, ya que los checks corrieron en el PR. Si hiciera falta, el workflow tendría que usar un PAT o una GitHub App.

### 4.2 Render

1. Abrir `https://render.com/deploy?repo=https://github.com/<dueño>/<repo>`, iniciar sesión.
2. **Blueprint Name:** `<app>`. **Branch:** `prod`. **Blueprint Path:** vacío. Revisar que liste la base y el servicio, y pulsar _Deploy Blueprint_.
3. Si falla con _«cannot have more than one active free tier database»_: el límite es **una base gratis por workspace**. Crear otro workspace (gratis), o suspender/borrar la base vieja, y volver a sincronizar.
4. Esperar a que la base esté _Available_ y a que el servicio termine su primer _build_ (en CivicGuard salió bien incluso sin migraciones, porque `/health` solo comprueba la conexión).
5. Copiar dos datos:
   - **Deploy Hook:** servicio → _Settings_ → _Deploy Hook_ (URL con `?key=…`).
   - **API key** (solo para leer los datos de conexión; se revoca al terminar): <https://dashboard.render.com/u/settings#api-keys> (no confundir con _CLI Tokens_).

### 4.3 Vercel

La integración con Git requiere la app de GitHub de Vercel sobre el repositorio. Camino **verificado** (CLI + API, sin tocar el panel):

```bash
npx --yes vercel@<versión> login          # flujo de dispositivo: se aprueba el código en el navegador
V="npx --yes vercel@<versión>"; SCOPE=<slug-del-equipo>

# 1) Crear el proyecto (Root Directory = carpeta del frontend)
printf '{"name":"<proyecto>","framework":"vite","rootDirectory":"web"}' | $V api /v11/projects --scope $SCOPE -X POST --input -

# 2) Node igual que en CI y protección estándar (previews protegidas, dominio de producción público)
printf '{"nodeVersion":"22.x","ssoProtection":{"deploymentType":"prod_deployment_urls_and_all_previews"}}' \
  | $V api /v9/projects/<id> --scope $SCOPE -X PATCH --input -

# 3) Conectar el repositorio (la rama de producción será la rama POR DEFECTO del repo)
printf '{"type":"github","repo":"<dueño>/<repo>"}' | $V api /v9/projects/<id>/link --scope $SCOPE -X POST --input -
```

- Vincular **no despliega** commits existentes. Para el primer despliegue: un push con un commit nuevo a `prod`, o `POST /v13/deployments` con `gitSource` (`type`, `repoId`, `ref`, `sha`).
- La rama de producción **no se cambia con `PATCH`** (`productionBranch` da 400). Para cambiarla: poner la rama deseada como rama por defecto del repositorio, desconectar (`DELETE /v9/projects/<id>/link`) y volver a conectar.
- Variables del frontend (`VITE_*`) se fijan en el proyecto, entorno _Production_, y se incrustan al construir.
- **No probado:** el camino por el panel web de Vercel (_Add New → Project_ y _Settings → Git_). Debería dar el mismo resultado.

### 4.4 Secretos y variables de GitHub

Los valores nunca deben pasar por una conversación ni por argumentos de línea de comandos. Se guardan en archivos con permisos 600 desde la propia terminal (el prompt oculta lo que se pega):

```bash
mkdir -p ~/.config/<app> && chmod 700 ~/.config/<app>
read -rsp "API key de Render: " K && printf %s "$K" > ~/.config/<app>/render-api-key && unset K && echo
read -rsp "Deploy hook de Render: " K && printf %s "$K" > ~/.config/<app>/render-deploy-hook && unset K && echo
chmod 600 ~/.config/<app>/*
```

Con la API key se leen los datos de conexión de la base **sin imprimirlos** (se cargan en variables del shell) y se suben como secretos. La guarda de «no vacío» es obligatoria:

```bash
setsecret() {  # nunca imprime el valor; se niega a guardar vacíos
  [ -n "$2" ] || { echo "ABORTO: $1 estaría vacío"; exit 1; }
  printf %s "$2" | gh secret set "$1" --env production -R <dueño>/<repo> >/dev/null && echo "secreto $1 cargado (${#2} caracteres)"; }
setsecret DB_JDBC_URL "jdbc:postgresql://$DBHOST:5432/$DBNAME?sslmode=require"
setsecret DB_USER "$DBUSER"
setsecret DB_PASSWORD "$DBPASS"
setsecret RENDER_DEPLOY_HOOK_URL "$(cat ~/.config/<app>/render-deploy-hook)"
gh variable set API_URL --env production --body https://<servicio>.onrender.com -R <dueño>/<repo>
```

`DEPLOY_ENABLED` es una variable **de repositorio** (el `if` del job la lee antes de entrar al entorno): `gh variable set DEPLOY_ENABLED --body true -R <dueño>/<repo>`.

Los datos de conexión salen de `GET https://api.render.com/v1/postgres/<id>/connection-info` (campo `externalConnectionString`). Se lee la API key con `curl -K -` para que no aparezca en los argumentos del proceso:

```bash
printf 'header = "Authorization: Bearer %s"\n' "$(cat ~/.config/<app>/render-api-key)" | curl -sS -K - https://api.render.com/v1/...
```

### 4.5 Activar

Con todo cargado: `gh variable set DEPLOY_ENABLED --body true`. A partir de ahí, cada push a `prod` que pase `lint-and-test` despliega.

---

## 5. Primer despliegue y verificación

No basta con ver el check en verde: el último paso del job pasa aunque aún responda la versión vieja. Se verifica cada pieza desde fuera.

```bash
# API
curl -sS https://<servicio>.onrender.com/api/health          # {"status":"ok","database":"up"}
curl -sS -o /dev/null -w "%{http_code}\n" https://<servicio>.onrender.com/api/docs

# CORS: el dominio del frontend debe recibir Access-Control-Allow-Origin; uno ajeno, ninguno
curl -sS -o /dev/null -D - -H "Origin: https://<frontend>.vercel.app" https://<servicio>.onrender.com/api/health | grep -i access-control-allow-origin

# Frontend: público, fallback SPA, caché de sw.js e inmutabilidad de /assets
curl -sS -o /dev/null -D - https://<frontend>.vercel.app/sw.js | grep -i cache-control        # no-cache
curl -sS -o /dev/null -w "%{http_code}\n" https://<frontend>.vercel.app/una-ruta-de-la-spa     # 200
```

- **Render recibió el hook:** `GET /v1/services/<id>/deploys` debe mostrar un deploy `live` con `trigger: deploy_hook` y el commit esperado.
- **La base tiene el esquema:** Liquibase `status` debe decir _«is up to date»_, y `information_schema.tables` lista las tablas.
- **Vercel construyó `prod` y omitió `develop`:** `GET /v6/deployments?projectId=<id>` debe mostrar `READY … prod` y `CANCELED … develop` («Canceled by Ignored Build Step»).
- **Navegador real (Playwright, Chromium y WebKit):** que el Service Worker active, que sin red una URL no guardada muestre la página offline, y que no haya errores de consola con red.
- **Despliegue por Git probado de verdad:** un push de un commit **nuevo** a una rama de prueba debe disparar un despliegue de Vercel (una rama nueva que apunta a un commit ya desplegado **no** dispara nada). Borrar la rama y el despliegue de prueba después.

## 6. Trabajo diario

1. Rama por ticket → PR a `develop` → checks → **fusión automática** si pasan (con el workflow `auto-merge.yml`; si no lo usas, merge manual).
2. Para publicar: PR de _release_ `develop` → `prod` → checks → merge. Eso dispara Vercel y `deploy-backend`.
3. **Pausar los despliegues del backend:** `gh variable set DEPLOY_ENABLED --body false`.
4. **Deshacer:** revertir el commit en `prod` (por PR) y volver a desplegar. La reversión desde los paneles de Render y Vercel existe pero **no se probó**.
5. Cada _changeset_ de Liquibase debe ser compatible con la versión anterior de la API: las migraciones corren **antes** de desplegarla.

---

## 7. Errores reales y su solución

| Síntoma | Causa | Solución |
| --- | --- | --- |
| El conector de Vercel responde `403 forbidden` al crear proyectos (también al crear con repo Git) | El conector no tiene permiso de escritura en la cuenta | Usar la CLI de Vercel con la sesión del usuario (`vercel login` + `vercel api`) |
| `Cannot create tokens for this app (403)` al crear un token con la CLI de Vercel | La sesión OAuth de la CLI no puede emitir tokens | Evitar el token: usar la integración Git de Vercel |
| No se puede conectar el repo en Vercel | La app de GitHub de Vercel no está instalada en la organización del repo | Alojar el repo donde la app sí esté, o instalarla en la organización |
| Un secreto de GitHub quedó **vacío** | `gh secret set` con stdin vacío (la fuente falló antes) guarda un secreto vacío sin avisar | Cargar el valor en una variable, exigir `[ -n "$valor" ]` y borrar el secreto si ya quedó mal |
| _«cannot have more than one active free tier database»_ | Render permite una base gratis por workspace | Otro workspace, o suspender/borrar la base antigua; luego _Manual sync_ del Blueprint |
| Se quería migrar en el despliegue de Render | `preDeployCommand` solo existe en planes de pago | Migrar desde GitHub Actions antes del hook |
| `host` y `port` no funcionan en `fromDatabase` | Solo se documenta `connectionString`, `user`, `password`, `database` | Pasar `DATABASE_URL` y que la API la interprete |
| `PATCH` del proyecto con `productionBranch` → 400 | No es un campo editable | Cambiar la rama por defecto del repo y reconectar el repositorio |
| Un push a una rama nueva no despliega | La rama apunta a un commit que ya tiene despliegue | Probar con un commit nuevo |
| El job `deploy-backend` sale _skipped_ en el push a `prod` | `prod` tenía un `ci.yml` anterior: **el PR de _release_ se fusionó antes que el de configuración** | Fusionar siempre primero la configuración en `develop` y después el _release_; comprobar con `git show origin/prod:.github/workflows/ci.yml` |
| (Prevención) `workflow_run`/`workflow_dispatch` | Según la documentación de GitHub exigen el archivo en la rama por defecto; **no se probaron** | Se evitaron: los jobs van en el mismo `ci.yml` con `if` por rama |
| Un commit empujado a la rama de un PR **ya fusionado** no llega a `develop` | El PR se fusionó (a mano o por fusión automática) antes del push: solo entra lo que había al fusionar | Comprobar `gh pr view <n> --json state` antes de empujar; si ya está fusionado, abrir un PR nuevo desde la misma rama (así se recuperó `auto-merge.yml`) |
| El hook de commitlint rechaza el commit y el `git push` siguiente publica una rama vacía | Cabecera de más de 100 caracteres | Encadenar con `&&` (`git commit … && git push …`) |
| El proyecto de Vercel usa Node 26.x por defecto | Valor por defecto del servicio | Fijar `nodeVersion` igual que CI (22.x) |
| Riesgo de un login de Vercel delante del sitio público | El proyecto nació con la protección `all_except_custom_domains`, que podría no eximir al dominio `*.vercel.app` (no se comprobó con ese valor: se cambió antes de desplegar) | Usar `prod_deployment_urls_and_all_previews` y verificar con `curl` que el dominio de producción responde 200 |
| `ignoreCommand` cancela despliegues manuales | Sin rama de Git, `VERCEL_GIT_COMMIT_REF` está vacía | Condición `[ -n "$VERCEL_GIT_COMMIT_REF" ] && …` |
| El esquema JSON de `vercel.json` no se puede validar con Ajv | Mezcla sintaxis de varios drafts | Validar el comportamiento contra la URL real |
| La salida de `vercel api` no es JSON puro | La herramienta imprime líneas de aviso antes del JSON | Filtrar con `grep -E '^\{'` |
| (PWA) Service Worker atascado en `activating` en WebKit | Se recargaba la página en el mismo instante del `controllerchange` | Recargar cuando el worker nuevo pasa a `activated` |

## 8. Seguridad

- **Cero secretos en el repositorio.** Antes de publicar una copia de un historial, buscar archivos sensibles y valores conocidos con `git log --all -S"<valor>"` (sin imprimir el valor) y revisar `git log --all --name-only`.
- Secretos en el **entorno** `production`, restringido a `prod`. Los jobs de PR no pueden leerlos.
- El hook de Render solo despliega; **preferirlo a una API key** en CI.
- **Revocar la API key de Render al terminar** y borrar los archivos locales con `shred -u`. Cerrar la sesión de la CLI de Vercel (`vercel logout`).
- Las URLs únicas de cada despliegue de Vercel quedan protegidas por login; el dominio de producción es público.
- La base de Render acepta conexiones externas desde cualquier IP (si no se define `ipAllowList`): se protege con una contraseña larga generada y SSL. Las IP de los _runners_ de GitHub cambian, así que no se puede restringir a ellas.
- Los mensajes de error de la API nunca deben contener la contraseña ni la URL de conexión.

## 9. Límites del plan gratuito

| Recurso | Límite |
| --- | --- |
| Postgres de Render (free) | **Expira a los 30 días** (14 más de gracia antes de borrarse); 1 GB; una por workspace; sin copias de seguridad |
| API de Render (free) | Se duerme tras 15 min sin tráfico; el arranque en frío tarda cerca de 1 min; 750 horas al mes |
| Vercel (Hobby) | Es el plan con el que se desplegó; revisar sus límites y términos vigentes antes de un uso comercial |
| Si el proyecto debe durar más | Un Postgres de plan de pago, o una base externa persistente (por ejemplo Neon); solo cambia `DATABASE_URL` y los secretos de Liquibase |

## 10. Resumen para replicarlo en otro proyecto

1. Preparar la API (Dockerfile con la última etapa de producción, `/health`, `DATABASE_URL`, CORS) y el frontend (`vercel.json`).
2. Añadir `render.yaml` y el job `deploy-backend`; validar `render.yaml` con el esquema y `ci.yml` con `actionlint`.
3. Repo en la cuenta con la app de Vercel; `prod` por defecto; protecciones; entorno `production` solo para `prod`; opcionalmente _Allow auto-merge_ + `auto-merge.yml`.
4. Render: Blueprint desde el enlace de despliegue → copiar hook y API key (en archivos, no por chat).
5. Vercel: `vercel login` → crear proyecto → conectar el repo.
6. Cargar secretos con la guarda de no vacío; `API_URL`; **al final** `DEPLOY_ENABLED=true`.
7. Fusionar la configuración en `develop` **antes** del _release_ a `prod`.
8. Verificar desde fuera cada pieza (sección 5), revocar la API key y cerrar la sesión de Vercel.

## Apéndice: valores de CivicGuard PWA (públicos)

| Concepto | Valor |
| --- | --- |
| Repositorio | `alexo123456780/AWP-PARCIAL3` (rama por defecto `prod`) |
| Frontend | <https://civicguard-pwa.vercel.app> |
| API | <https://civicguard-api-nhww.onrender.com> (`/api/health`, `/api/docs`) |
| Blueprint de Render | `civicguard` (base `civicguard-db` y servicio `civicguard-api`) |
| Secretos del entorno `production` | `DB_JDBC_URL`, `DB_USER`, `DB_PASSWORD`, `RENDER_DEPLOY_HOOK_URL` |
| Variables | `API_URL` (entorno), `DEPLOY_ENABLED` (repositorio) |
