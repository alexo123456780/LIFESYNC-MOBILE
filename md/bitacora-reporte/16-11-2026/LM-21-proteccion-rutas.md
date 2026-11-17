# Reporte de Actividades — LM-21 Navegar solo a las pantallas que me corresponden

## Actividad

Esqueleto de las pilas `(auth)` y `(app)` con guardia básica (LM-47) y guardia completa con restauración, carga y redirecciones (LM-48).

## Objetivo

Que ninguna pantalla de `(app)` sea alcanzable sin una sesión válida y que el paciente vaya directo a donde le corresponde.

## Actividades realizadas

- Las pilas `(auth)` y `(app)`, la guardia y la función pura `resolveGuardRedirect` ya existían desde la plantilla (LM-12); en LM-20 se conectaron a la sesión guardada en SecureStore y a la pantalla de carga durante la restauración.
- En esta historia se verificó el comportamiento completo con el enrutador real de Expo Router (`expo-router/testing-library`), con los layouts reales, la sesión real y un almacén y una API falsos: sin sesión una ruta de `(app)` lleva a la bienvenida; con sesión guardada la app abre `(app)` directo sin mostrar `(auth)`; con sesión, la bienvenida redirige a `(app)`; y tras cerrar sesión se muestra la bienvenida y «atrás» no regresa a ninguna pantalla de `(app)` (`router.back()` desde la bienvenida no recupera `(app)`).
- Se comprobó con una mutación (quitando la redirección del layout de `(app)`) que esas pruebas fallan cuando la guardia se rompe.
- Se actualizó la sección «Navegación y guardia de sesión» del README, que aún marcaba la guardia como pendiente.

## Criterios atendidos

- Sin sesión, abrir una ruta de `(app)` redirige a `(auth)`.
- Con sesión válida, abrir la app va directo a `(app)` sin ver `(auth)`; mientras se restaura se ve una pantalla de carga.
- Tras cerrar sesión, «atrás» no permite volver a `(app)`.
- La guardia queda documentada en el README.

## Resultado

La separación de pilas queda garantizada por pruebas de navegación real, no solo por pruebas de la función de decisión.

## Validación

- 4 pruebas nuevas de navegación con Expo Router real (176 en total); 2 de ellas fallan con la guardia rota.
- Typecheck, lint, formato, empaquetado de Android y `expo-doctor` sin incidencias.

## Observaciones

La prueba usa el enrutador en memoria de Jest; el gesto físico de «atrás» de Android y los enlaces profundos (`lifesync://…`) a rutas de `(app)` se comprueban en el emulador durante el spike LM-14.
