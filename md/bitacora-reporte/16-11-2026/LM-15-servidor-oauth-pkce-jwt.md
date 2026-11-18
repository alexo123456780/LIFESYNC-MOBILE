# Reporte de Actividades — LM-15 Servidor de autorización OAuth 2.0 con PKCE y JWT ES256

## Actividad

Servidor de autorización propio con Authorization Code + PKCE (S256): página de login y emisión del código (LM-36) y endpoint de tokens con JWT ES256 (LM-37).

## Objetivo

Cumplir el requisito de un endpoint que valida credenciales y regresa un JWT firmado, con las buenas prácticas de OAuth 2.1, sin que la app móvil vea la contraseña del usuario.

## Actividades realizadas

- Se implementaron `GET` y `POST /oauth/authorize`: validación de parámetros PKCE, `state` y `redirect_uri` exacto, página de login sin JavaScript con cabecera CSP y protección CSRF, verificación de credenciales con Argon2id y emisión de un código de un solo uso de 60 s que se guarda solo como hash.
- Se implementó `POST /oauth/token` para `authorization_code`: verificación del `code_verifier` contra el `code_challenge`, quema atómica del código, JWT ES256 de 15 minutos con `iss` y `aud` y refresh token de 7 días del que solo se guarda el hash.
- Se limitó a 5 intentos por minuto el login y el canje de tokens.
- Las llaves del JWT, las URIs de redirección permitidas, el emisor y la audiencia salen de variables de entorno validadas al arrancar.
- Los códigos de autorización se invalidan también cuando falla la verificación, para que no se puedan adivinar.

## Criterios atendidos

- Un código de autorización se puede canjear una sola vez y expira a los 60 s; el segundo canje devuelve 400.
- Canjear con un `code_verifier` distinto o con un `redirect_uri` que no coincide exactamente devuelve 400.
- El JWT está firmado con ES256, trae `iss`, `aud` y `exp` de 15 minutos, y las llaves salen de variables de entorno; no hay llaves en el repositorio.
- Más de 5 intentos por minuto en login o token devuelven 429.
- `GET /oauth/authorize` con un `redirect_uri` no registrado o sin `code_challenge` S256 responde 400.
- `POST /oauth/authorize` con credenciales correctas responde 302 hacia `lifesync://oauth/callback` con `code` y el mismo `state`; con credenciales incorrectas responde 401.
- En la base solo se guarda el hash del código, con vencimiento a los 60 s.

## Resultado

El API ofrece el flujo OAuth completo para la app móvil, con tokens firmados con llaves asimétricas y controles contra la repetición de códigos, la fuerza bruta y la inyección de contenido en la página de login.

## Validación

- 57 pruebas unitarias en verde: vector de la RFC 7636, validación de la petición de autorización, CSRF, escape de HTML y CSP, y tokens (firma alterada, `alg: none`, expirado, otro emisor, otra audiencia, otra llave).
- 18 pruebas e2e contra PostgreSQL real: login correcto e incorrecto, ausencia de CSRF, redirección con `code` y `state`, solo el hash en la base, canje único, verificador distinto, `redirect_uri` distinto, código vencido y límite de intentos.
- Imagen de producción ejecutada contra la base: healthz 200, login 200, `redirect_uri` ajeno 400 y cookie CSRF con `HttpOnly`, `Secure` y `SameSite=Strict`.
- Typecheck, lint, formato y `npm audit` sin hallazgos de severidad alta.

## Observaciones

El API ahora exige `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64` y `OAUTH_REDIRECT_URIS`; el README y `.env.example` indican cómo generarlas. La validación de punta a punta con la app móvil y el navegador del sistema corresponde al spike LM-14.
