# Reporte de Actividades — LM-13 README, guía de primer día y demo del flujo de trabajo

## Actividad

Documentación de arranque del proyecto: README con la guía de primer día y plantilla de variables de entorno de la app.

## Objetivo

Que un integrante nuevo ponga el proyecto en marcha sin ayuda de quien lo configuró.

## Actividades realizadas

- Se redactó el README con requisitos, guía de primer día (instalación, variables de entorno, API con Docker y app con Expo), scripts del monorepo, estructura del repositorio y despliegue.
- Se documentó la navegación con pilas `(auth)` y `(app)` y la guardia de sesión, indicando qué completa el equipo de frontend.
- Se explicaron GitFlow, la convención de commits con `LM-n` y la plantilla de Pull Request.
- Se agregó `.env.example` a la app móvil con la URL del API y las alternativas para emulador y teléfono físico.

## Criterios atendidos

- El README explica GitFlow, la convención de commits con `LM-n` y la plantilla de PR.
- `.env.example` (raíz y app) lista todas las variables necesarias sin valores reales.
- El README guía el arranque del API con Docker y de la app con Expo.

## Resultado

El repositorio cuenta con una guía de arranque única y con las plantillas de entorno de ambos proyectos.

## Validación

- Los comandos de la guía se ejecutaron en el entorno de desarrollo: instalación limpia, API y PostgreSQL con Docker Compose y arranque de la app con Expo.
- Lint, formato y pruebas en verde.

## Observaciones

La demostración de 20 minutos del flujo de trabajo con los cuatro integrantes se da por realizada por indicación del responsable del proyecto; no hay una sesión registrada de la que dejar fecha ni asistentes. La asignación de roles en CODEOWNERS no se aplica por decisión del responsable (ver `docs/gitflow.md`).
