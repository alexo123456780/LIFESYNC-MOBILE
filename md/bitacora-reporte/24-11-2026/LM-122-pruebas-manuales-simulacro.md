# Reporte de Actividades — LM-122 Pruebas manuales en dispositivo y simulacro de las 3 estaciones

## Actividad

Validación del registro de pruebas de falla en dispositivo y simulacro de las 3 estaciones (`LM-138`, `LM-139`, `LM-140`), más conexión de las pantallas del Sprint 3 en `Home` para pruebas reales en teléfono.

## Objetivo

Asegurar que el flujo completo de las 3 estaciones (identidad/cifrado, offline/permisos, alertas/exportación) sea navegable desde la pantalla de inicio de la app.

## Actividades realizadas

- Se revisó `docs/testing/manual-device-testing.md` con los 5 escenarios `PF-01`–`PF-05` y las 3 estaciones documentadas.
- Se conectaron en `apps/mobile/app/(app)/index.tsx` los botones de navegación hacia `/emergency-card`, `/export`, `/prescriptions`, `/incident-location`, `/alerts` y `/fall-detector`.
- Se montó `OfflineBanner` en `apps/mobile/app/(app)/_layout.tsx`.

## Validación

- `apps/mobile`: 38 suites / 316 tests en verde, más verificación de endpoints Sprint 3 en Render (`healthz: 200`, `export: 401`, `prescriptions: 401`).

## Tiempo invertido

- ~15 minutos.
