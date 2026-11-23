# Reporte de Actividades — LM-53 Cliente HTTP con interceptores de sesión

## Actividad

Implementación del interceptor de request con JWT desde `SecureStore` (`LM-64`) y del interceptor de respuesta con refresh single-flight ante `401` (`LM-65`), integrados con `SessionProvider`.

## Objetivo

Que toda petición autenticada incluya automáticamente `Authorization: Bearer <JWT>` sin intervención de las pantallas, renueve el token una sola vez ante múltiples `401` simultáneos y cierre la sesión si el refresh falla.

## Actividades realizadas

- Se extendió `HttpClient` (`apps/mobile/src/infrastructure/http/http-client.ts`) con métodos `put`/`delete`, interceptor de request que lee el token de `TokenStorage` (omitiéndolo cuando no hay sesión) e interceptor de respuesta con `refreshSingleFlight()` (`POST /oauth/token` con `grant_type=refresh_token`).
- Se conectó `api` (`apps/mobile/src/infrastructure/http/api.ts`) con `secureTokenStorage` y se enlazó `setAuthFailureHandler` en `SessionProvider` para borrar caché y redirigir a `(auth)` cuando falla el refresh.
- Se agregaron pruebas unitarias en `apps/mobile/src/infrastructure/http/http-client.test.ts` cubriendo inyección de JWT, ausencia de sesión, 3 peticiones `401` concurrentes con un único refresh y cierre automático ante `401` del refresh.

## Validación

- `npm run lint`, `npm run format:check`, `npm run typecheck` y pruebas de `http-client.test.ts`, `session-context.test.tsx` y `architecture.test.ts` en verde.

## Tiempo invertido

- ~20 minutos.
