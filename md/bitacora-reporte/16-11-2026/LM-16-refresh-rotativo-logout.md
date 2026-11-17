# Reporte de Actividades — LM-16 Refresh token rotativo y cierre de sesión en el backend

## Actividad

Grant `refresh_token` con rotación y revocación de familia (LM-38) y endpoint de cierre de sesión (LM-39).

## Objetivo

Limitar el daño de un refresh token robado y permitir cerrar sesión de verdad, invalidando el acceso en el servidor.

## Actividades realizadas

- Se agregó el grant `refresh_token` a `POST /oauth/token`: valida el hash, revoca el token usado y emite un par nuevo dentro de la misma familia.
- Si se presenta un refresh token ya rotado se responde 401 y se revoca toda la familia; el reclamo del token es atómico para que dos peticiones simultáneas con el mismo token no puedan ambas rotarlo.
- Se creó `POST /auth/logout`, protegido con el access token, que revoca el refresh token recibido y toda su familia y responde 204; solo actúa sobre tokens del propio usuario.
- Se creó una versión mínima de `JwtAuthGuard` que valida el access token y expone el id del usuario, a completar en el Sprint 2.
- Los dos endpoints comparten la emisión del par de tokens con el canje del código de autorización.

## Criterios atendidos

- Canjear un refresh token devuelve un par de tokens nuevo y el token anterior queda invalidado.
- Reusar un refresh token ya rotado devuelve 401 y revoca toda su familia.
- En la base de datos solo existe el hash del refresh token, nunca su valor en claro.
- `POST /auth/logout` responde 204 y el refresh revocado ya no se puede canjear; sin un access token válido responde 401.

## Resultado

Una sesión robada deja de servir en cuanto el dueño legítimo usa su token, y cerrar sesión invalida de verdad el refresh token en el servidor.

## Validación

- 65 pruebas unitarias en verde, incluidas las del guard (sin encabezado, esquema incorrecto, token inválido y token sin sujeto).
- 29 pruebas e2e en verde contra PostgreSQL real: rotación, reutilización con revocación de familia, aislamiento entre familias de un mismo usuario, token desconocido, vacío o vencido, logout con 204, logout de una familia rotada, sin access token (401), sin `refresh_token` (400) y sin revocar tokens de otro usuario.
- Typecheck, lint y formato sin errores.

## Observaciones

Los 5 intentos por minuto de `/oauth/token` también aplican al grant `refresh_token`.
