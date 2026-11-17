# Reporte de Actividades — LM-5 Monorepo y estándares de calidad de código

## Actividad

Estructura base del monorepo (LM-6) y configuración de las herramientas de calidad de código y de commits (LM-7).

## Objetivo

Que cualquier integrante clone el repositorio y tenga lint, formato y convención de commits listos desde el primer commit, sobre una estructura de workspaces para el backend y la app móvil.

## Actividades realizadas

- Se confirmó que el repositorio de GitHub es público.
- Se definió el monorepo con npm workspaces para `apps/api` y `apps/mobile`.
- Se creó una configuración de TypeScript estricto compartida, que extienden ambos workspaces.
- Se agregaron `.gitignore` (excluye `.env`, `node_modules` y artefactos de build, y conserva `.env.example`) y `.editorconfig`.
- Se configuró ESLint y Prettier compartidos en la raíz, con los comandos de lint, formato y verificación de formato.
- Se configuró commitlint con la convención `tipo(ámbito): mensaje [LM-n]` y un hook `commit-msg` de Husky que la valida.
- Se agregó una prueba automatizada de la convención de commits.

## Criterios atendidos

- `npm install` en la raíz instala los workspaces `apps/api` y `apps/mobile`.
- `npm run lint`, `npm run format:check` y `npm run typecheck` pasan en un repo limpio, con `strict: true` en ambos workspaces.
- Un commit con mensaje fuera de la convención o sin clave `LM-n` es rechazado por el hook de Husky.
- Un commit como `chore(repo): configurar linting [LM-5]` es aceptado.
- `.gitignore` excluye `.env` y `node_modules` desde el primer commit y existe `.editorconfig`.

## Resultado

El repositorio queda con la estructura de monorepo y las verificaciones automáticas de estilo, tipos y mensajes de commit sobre las que se montan el backend y la app móvil. Los workspaces contienen solo un marcador mínimo, que serán reemplazados por las plantillas de NestJS y de Expo en sus tareas respectivas.

## Validación

- Instalación limpia de dependencias con ambos workspaces enlazados.
- Lint, verificación de formato y typecheck sin errores.
- Cuatro pruebas de la convención de commits en verde: mensaje válido aceptado; sin clave, con clave de otro proyecto y fuera de convención rechazados.
- Revisión de que `.env`, `node_modules` y el archivo de instrucciones del flujo de trabajo quedan ignorados por Git.

## Observaciones

La rama remota por defecto del repositorio es `prod` y no existe `main`, que el PRD define para producción. Esto se atiende en la tarea de GitFlow y protección de ramas (LM-8).
