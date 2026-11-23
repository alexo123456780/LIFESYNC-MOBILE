# Reporte de Actividades — LM-14 Spike: validar OAuth 2.0 PKCE con Expo y el navegador del sistema

## Actividad

Validación técnica del flujo OAuth 2.0 Authorization Code + PKCE (`S256`) entre la app Expo y el backend NestJS, documentación del ADR y registro de la decisión go/no-go (LM-14).

## Objetivo

Reducir el riesgo del flujo de autenticación del Sprint 1 comprobando el ciclo completo de redirección y canje de código con `code_verifier`, documentar las diferencias entre Expo Go y la development build, y decidir si se continúa con PKCE o se activa el plan B.

## Actividades realizadas

- Se revisó y validó la integración de punta a punta entre `apps/mobile/src/infrastructure/oauth/oauth-client.ts` (`expo-auth-session` + `expo-web-browser`) y los endpoints `GET/POST /api/v1/oauth/authorize` y `POST /api/v1/oauth/token` del backend NestJS.
- Se verificó la generación de `redirect_uri` con el esquema `lifesync://oauth/callback` (`apps/mobile/app.config.ts`) y la doble validación de `state` previa al canje con `code_verifier`.
- Se redactó el ADR [`docs/adr/0002-oauth-pkce-expo.md`](../../../docs/adr/0002-oauth-pkce-expo.md) detallando el resultado de la validación, la `redirect_uri` usada, las diferencias entre Expo Go y la development build de EAS, y la decisión **GO** para mantener PKCE (`S256`).

## Criterios atendidos

- Existe una implementación y prueba funcional del flujo `/oauth/authorize` → redirección con `code` y `state` → canje en `/oauth/token` con `code_verifier`.
- Quedó documentado en `docs/adr/0002-oauth-pkce-expo.md` el resultado, la redirect URI usada (`lifesync://oauth/callback`) y las diferencias entre Expo Go y la development build.
- Quedó registrada la decisión **GO**: se mantiene Authorization Code + PKCE (`S256`) y se descarta el plan B.

## Resultado

Spike cerrado con decisión **GO** documentada en ADR, respaldando el flujo OAuth ya integrado en `LM-15`, `LM-16`, `LM-19` y `LM-20`.

## Validación

- `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` en verde en todo el monorepo (79 pruebas del API en Vitest y 176 pruebas de la app móvil en Jest, incluyendo `oauth-client.test.ts` y `sign-in.test.ts`).

## Tiempo invertido

- ~30 minutos (revisión de implementación, pruebas, redacción de ADR y cierre en Jira).
