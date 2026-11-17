# Reporte de Actividades — LM-10 Entorno Docker de desarrollo

## Actividad

Contenerización del API con un Dockerfile multi-stage (LM-28) y entorno de desarrollo con Docker Compose y plantilla de variables de entorno (LM-29).

## Objetivo

Que cualquier integrante o el docente levante API, PostgreSQL y pgAdmin con `docker compose up`, y que la imagen que corre en local sea la misma que se despliega en Render.

## Actividades realizadas

- Se creó el Dockerfile del API con las etapas base, dev, build y prod, siendo prod la última.
- La imagen de producción corre con un usuario sin privilegios y aplica las migraciones al arrancar, porque el plan gratuito de Render no ofrece comando previo al despliegue.
- Se definió el Docker Compose de desarrollo con base de datos, API, pgAdmin (perfil `tools`) y túnel HTTPS opcional (perfil `tunnel`).
- La base de datos se publica solo en la interfaz local y el API espera a que la base esté sana antes de arrancar y aplica las migraciones en desarrollo.
- El contenedor de desarrollo corre con el UID del usuario del equipo, de modo que los archivos generados en el directorio compartido sigan siendo del desarrollador.
- Se agregó `.env.example` con todas las variables (base de datos, llaves JWT, URIs de OAuth, seed, pgAdmin y túnel) sin valores reales, y un `.dockerignore`.
- Se fijó el formato de importación del cliente de base de datos para que se genere igual dentro y fuera de Docker.

## Criterios atendidos

- `docker compose up` deja la base y el API sanos y `GET http://localhost:3000/api/v1/healthz` responde 200.
- pgAdmin y el túnel solo arrancan con sus perfiles; pgAdmin queda en `127.0.0.1:5050`.
- La imagen `prod` es la última etapa del Dockerfile, se construye sin indicar etapa y corre con un usuario distinto de root.
- Al arrancar contra una base vacía, la imagen aplica las migraciones y `/api/v1/healthz` responde 200.
- El puerto de PostgreSQL solo es accesible desde 127.0.0.1.
- `.env.example` lista las variables sin secretos y `.env` está ignorado por Git.

## Resultado

El entorno completo se levanta con un solo comando y la imagen de producción queda lista para el despliegue en Render, con las migraciones aplicadas al arrancar.

## Validación

- Construcción de la imagen sin `--target` resuelve a `prod`; el proceso corre como `node` (UID 1000).
- Entorno de desarrollo sano en unos 20 segundos, migración aplicada y recarga en caliente activa; sin archivos con dueño root en el árbol del equipo tras ejecutarlo.
- Imagen de producción sobre una base vacía: migración aplicada, tablas de identidad creadas, healthz 200, consulta real a la base y Argon2id funcionando.
- pgAdmin responde 200 en 127.0.0.1:5050 y el túnel no arranca por defecto.
- Lint, formato, typecheck, 17 pruebas unitarias y 4 de la convención de commits en verde; `npm audit` sin vulnerabilidades.

## Observaciones

En equipos donde el puerto 5432 ya está en uso se puede cambiar con `DB_PORT` sin tocar el Compose. En equipos Linux cuyo UID no sea 1000 se debe ajustar `DEV_UID` y `DEV_GID`. La imagen de pgAdmin y la del túnel usan la etiqueta `latest`, como indica el PRD.
