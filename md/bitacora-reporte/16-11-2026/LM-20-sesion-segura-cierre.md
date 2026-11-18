# Reporte de Actividades — LM-20 Mantener mi sesión guardada de forma segura y poder cerrarla

## Actividad

Almacenamiento seguro de los tokens y restauración de la sesión (LM-45) y cierre de sesión que revoca en el servidor y borra SecureStore y la caché (LM-46).

## Objetivo

Que el paciente no tenga que iniciar sesión cada vez que abre la app y que, al cerrarla, no queden credenciales ni datos médicos en el teléfono.

## Actividades realizadas

- El access y el refresh token se guardan solo en `expo-secure-store` (Keystore en Android, Keychain en iOS) a través de un puerto `TokenStorage`; la aplicación no depende de Expo.
- Al abrir la app, `SessionProvider` restaura la sesión leyendo el almacén seguro. Mientras lo hace el estado es `loading` y ambas pilas muestran una pantalla de carga, así que no hay parpadeo entre `(auth)` y `(app)`. Si el almacén falla se trata como sin sesión y la app abre `(auth)`.
- El inicio de sesión guarda los tokens antes de abrir la sesión; si no se pueden guardar, no se crea sesión y se avisa.
- Se agregó la pantalla de Ajustes con «Cerrar sesión» (44 px, sin doble toque). El caso de uso `signOut` llama a `POST /auth/logout` con el refresh token y el access token como Bearer, y borra SecureStore y la caché local (`AsyncStorage.clear()`) aunque el servidor no responda, esté dormido o el token haya vencido. Si un borrado local falla se informa y se intenta igualmente el otro.
- Tras el cierre el estado pasa a `unauthenticated` y la pila `(app)` redirige con `Redirect` (reemplaza la ruta), por lo que «atrás» no regresa a `(app)`.
- `HttpClient.post` admite cabeceras adicionales para enviar el `Authorization`.
- Una prueba de arquitectura vigila que AsyncStorage solo lo use la caché local, que SecureStore solo lo use el almacén de tokens, que no haya `console.*` en el código de la app, que el dominio no importe Expo/React y que la aplicación no importe infraestructura ni presentación.

## Criterios atendidos

- Tras iniciar sesión, cerrar y reabrir la app, la sesión se restaura sin pedir login (se verifica con el almacén y el proveedor; la reapertura real en un dispositivo se comprueba en LM-14).
- No hay tokens en AsyncStorage ni en logs (prueba de arquitectura automática).
- Sin tokens guardados la app abre `(auth)`.
- Cerrar sesión llama a `POST /auth/logout`, borra SecureStore y la caché y vuelve a `(auth)`; sin red el cierre local se completa igual.

## Resultado

La sesión sobrevive al cierre de la app y el cierre de sesión no deja credenciales en el teléfono ni depende de la red.

## Validación

- 66 pruebas nuevas (172 en total): almacén seguro, restauración, cierre de sesión (con red, sin red, 401, 503, sin tokens y fallo parcial de borrado), proveedor de sesión (carga, restauración, guardado fallido, cierre), pantalla de Ajustes, guards de ambas pilas y reglas de arquitectura.
- Typecheck, lint y formato sin errores; empaquetado de Android correcto; `expo-doctor` 20/20; `npm audit --audit-level=high` sin hallazgos altos (solo avisos moderados de `glob` dentro de `jest`, igual que antes de este cambio).

## Observaciones

- El borrado de la caché usa `AsyncStorage.clear()`: hoy la app solo guarda datos propios ahí. Cuando llegue el historial médico (Sprint 2) debe vivir en un almacén cifrado que este mismo cierre también vacíe.
- La revocación del refresh token en el servidor invalida toda su familia (comportamiento de LM-17), por lo que cerrar sesión en este teléfono cierra también el resto de sesiones derivadas de ese inicio.
- La pantalla de carga de los guards se incluye aquí porque la restauración asíncrona la hace necesaria; LM-21 la completa con sus propias pruebas de navegación.
