# ADR 0002 — Validación de OAuth 2.0 Authorization Code + PKCE (S256) con Expo

- **Estado:** aceptada (2026-11-23)
- **Tarea:** LM-14
- **Decide:** ALE / JOS

## Contexto

El PRD (secciones 6.4 y 21) establece autenticación con **OAuth 2.0 Authorization Code + PKCE (`S256`)** usando el navegador del sistema (`expo-auth-session` y `expo-web-browser`) contra el servidor de autorización propio en NestJS (`/api/v1/oauth/authorize` y `/api/v1/oauth/token`).

El objetivo del spike `LM-14` fue validar la viabilidad técnica del flujo completo —apertura del navegador del sistema, redirección de vuelta a la app con `code` y `state`, verificación de `state` y canje por tokens con `code_verifier`— para tomar una decisión **go / no-go** frente al plan B (`grant_type=password` temporal como deuda técnica).

## Resultado de la validación

Se verificó de punta a punta en el backend (`apps/api/src/auth/oauth/`) y en el cliente móvil (`apps/mobile/src/infrastructure/oauth/oauth-client.ts`):

- **Generación PKCE y `state`:** `AuthSession.AuthRequest` con `responseType: Code`, `usePKCE: true` y `codeChallengeMethod: S256` genera `code_verifier`, `code_challenge` y `state` en el cliente; la app nunca manipula la contraseña del paciente.
- **Redirección (`redirect_uri`):** Se construye con `AuthSession.makeRedirectUri({ scheme: 'lifesync', path: 'oauth/callback' })`, produciendo `lifesync://oauth/callback` en builds nativas (whitelistada en `OAUTH_REDIRECT_URIS` del backend y registrada con `scheme: 'lifesync'` en `apps/mobile/app.config.ts`).
- **Canje y seguridad:** Al volver la redirección, el cliente realiza doble verificación de `state`, canjea `code` + `code_verifier` vía `AuthSession.exchangeCodeAsync` contra `POST /api/v1/oauth/token`, y guarda `accessToken` + `refreshToken` exclusivamente en `expo-secure-store`.
- **Cobertura de pruebas:** Validado con suites unitarias y E2E en verde (`apps/api/test/oauth.e2e-spec.ts`, `apps/api/src/auth/oauth/*.spec.ts`, `apps/mobile/src/infrastructure/oauth/oauth-client.test.ts` y `apps/mobile/src/application/sign-in.test.ts`).

### Diferencias entre Expo Go y Development Build

| Aspecto | Expo Go | Development Build (EAS) |
|---|---|---|
| Esquema de `redirect_uri` | Usa esquema de Expo Go (`exp://<ip>:<puerto>/--/oauth/callback`), no `lifesync://` | Respeta el esquema nativo `lifesync://oauth/callback` de `app.config.ts` |
| Configuración del backend | Requiere añadir temporalmente la URI `exp://...` a `OAUTH_REDIRECT_URIS` en `.env` local | Funciona directo con `OAUTH_REDIRECT_URIS=lifesync://oauth/callback` |
| Cierre de sesión del navegador | `WebBrowser.maybeCompleteAuthSession()` cierra la pestaña al volver | Comportamiento nativo completo (Custom Tabs en Android / ASWebAuthenticationSession en iOS) |
| Cobertura de red/permisos nativos | No aplica `network_security_config.xml` ni esquema nativo personalizado | Aplica toda la configuración nativa de producción |

## Decisión (Go / No-Go)

**GO — Se mantiene OAuth 2.0 Authorization Code + PKCE (`S256`).** Se descarta activar el plan B (`grant_type=password`).

## Consecuencias

- Las historias `LM-15`, `LM-16`, `LM-19` y `LM-20` operan sobre Authorization Code + PKCE (`S256`) sin deuda técnica de autenticación.
- Para pruebas en dispositivo físico con `lifesync://oauth/callback` se requiere la development build de Android (`LM-35`); mientras tanto, las pruebas locales con emulador o Expo Go deben declarar la `redirect_uri` correspondiente en `OAUTH_REDIRECT_URIS`.
