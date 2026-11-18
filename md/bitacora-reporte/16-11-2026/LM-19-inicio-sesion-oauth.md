# Reporte de Actividades — LM-19 Iniciar sesión de forma segura con OAuth

## Actividad

Pantalla de bienvenida con sus estados (LM-43) y flujo Authorization Code + PKCE con `expo-auth-session` y `expo-web-browser` (LM-44).

## Objetivo

Que el paciente inicie sesión con su correo y contraseña en el navegador del sistema, sin exponer sus credenciales a la app.

## Actividades realizadas

- Se implementó el flujo PKCE (S256): la app genera `code_verifier`, `code_challenge` y `state`, abre `/oauth/authorize` en el navegador del sistema, valida el `state` al volver por `lifesync://oauth/callback` y canjea el código en `POST /oauth/token`.
- Se descarta cualquier resultado cuyo `state` no coincida o que llegue sin código, y se distinguen la cancelación, el rechazo del servidor y la falta de conexión.
- Se creó un caso de uso que primero comprueba que el servidor responda (lo que además lo despierta cuando está dormido) y solo entonces abre el navegador; sin conexión avisa sin abrirlo.
- Se construyó la pantalla de bienvenida con «Iniciar sesión» y «Crear cuenta» de al menos 44 px, estado de carga («Conectando con el servidor…» y «Abriendo el navegador…») sin doble toque, avisos de error y de sin conexión con «Reintentar», aviso de cuenta recién creada y aviso cuando se cancela el inicio.
- Los tokens obtenidos se entregan a la sesión de la app (su guardado seguro corresponde a LM-45).

## Criterios atendidos

- Al pulsar «Iniciar sesión» se abre el navegador del sistema en `/oauth/authorize` con `code_challenge` S256 y `state`.
- Con `code` y `state` coincidentes la app canjea el código con el `code_verifier` y recibe el access y el refresh token.
- Con un `state` que no coincide, un rechazo o una cancelación se muestra un mensaje y no se crea sesión.
- La pantalla de bienvenida muestra estados de carga, error y sin conexión sin que la app se cierre.

## Resultado

El paciente puede iniciar sesión por el flujo estándar de OAuth para apps móviles y la app nunca maneja su contraseña.

## Validación

- 29 pruebas nuevas de la app (106 en total): configuración PKCE S256 y redirect URI, canje con `code_verifier`, descarte por `state` distinto, cancelación, rechazo, fallo de red y respuesta sin refresh token, caso de uso con sus fases y la pantalla con todos sus estados.
- Empaquetado de Android correcto y `expo-doctor` sin incidencias; typecheck y lint sin errores.
- La verificación de punta a punta con el navegador y el servidor reales se documenta en el spike LM-14.

## Observaciones

En Expo Go la redirección es `exp://…`, que no cambia el código pero debe estar en `OAUTH_REDIRECT_URIS` del entorno de desarrollo; en producción solo se permite `lifesync://oauth/callback`.
