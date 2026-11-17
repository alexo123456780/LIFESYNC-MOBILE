# Reporte de Actividades — LM-11 Pipeline CI/CD con GitHub Actions y despliegue en Render

## Actividad

Workflows de integración continua y de seguridad (LM-30 y LM-31) y preparación del despliegue a Render (LM-32).

## Objetivo

Que ningún cambio llegue a `main` sin pasar lint, pruebas, `npm audit`, Gitleaks y CodeQL, y que el merge a `main` con todo en verde dispare el despliegue.

## Actividades realizadas

- Se creó el workflow de CI con los jobs de calidad (lint, formato, typecheck y pruebas con cobertura), e2e contra un PostgreSQL desechable, seguridad y build de la imagen Docker, disparado en PR y push a `develop` y `main`.
- Se creó el workflow de seguridad con `npm audit --audit-level=high`, Gitleaks con su imagen oficial y CodeQL; corre en cada PR (invocado por el CI) y cada lunes.
- Se configuró Dependabot para npm y GitHub Actions.
- Se creó el Blueprint `render.yaml` (servicio Docker en plan gratuito con verificación de salud) y el job `deploy`, que invoca el deploy hook solo en push a `main` y depende de los demás jobs.
- Se agregó una excepción acotada de Gitleaks para los nombres de las variables de llaves JWT, que no contienen valores, y se comprobó que sigue detectando secretos reales.
- Se ajustó el comando de pruebas raíz para que `npm test -- --coverage` llegue a las pruebas del API.

## Criterios atendidos

- Un PR a `develop` o `main` ejecuta los jobs quality, e2e, security y docker, y el PR falla si algún paso falla.
- `npm audit --audit-level=high` y Gitleaks (imagen oficial) corren en cada PR, y CodeQL corre en cada PR y cada semana.
- El job `deploy` solo corre en push a `main` y depende de quality, e2e, security y docker.
- No hay secretos en el repositorio; el deploy hook se lee únicamente desde los secretos de GitHub.

## Resultado

El repositorio dispone de un pipeline que valida cada cambio contra una base de datos real y desechable, ejecuta las revisiones de seguridad y deja preparado el despliegue automático a Render.

## Validación

- Lint, formato, typecheck, pruebas con cobertura y escaneo de secretos en verde en local con los mismos comandos del pipeline.
- Gitleaks sin hallazgos en el historial y detección confirmada de un token de prueba falso.
- Ejecución de los jobs del pipeline en el Pull Request.

## Observaciones

Quedan pendientes, por requerir cuentas y secretos externos, la creación de la cuenta y el servicio en Render, el registro de `RENDER_DEPLOY_HOOK_URL` y `EXPO_TOKEN` como secretos de GitHub, y la comprobación de que el servicio responde 200 en HTTPS tras un merge a `main`. Además, el repositorio remoto aún no tiene la rama `main` (su rama por defecto es `prod`). Render declara `autoDeploy` como obsoleto, por lo que el Blueprint usa `autoDeployTrigger: off`. Hasta el Sprint 3 el servicio necesita un `DATABASE_URL` válido para arrancar, porque la imagen aplica migraciones al iniciar.
