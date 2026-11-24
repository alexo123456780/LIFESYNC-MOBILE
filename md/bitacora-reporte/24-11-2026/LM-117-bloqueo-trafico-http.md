# Reporte de Actividades — LM-117 Bloqueo de tráfico HTTP en claro en Android e iOS

## Actividad

Configuración de transporte estrictamente HTTPS en `apps/mobile/app.config.ts` (`LM-128`, `LM-129`).

## Objetivo

Impedir que la aplicación móvil realice peticiones en texto plano (HTTP) tanto en Android como en iOS en builds nativos.

## Actividades realizadas

- **Android (`LM-128`):** Se implementó el plugin `withStrictHttpsTransport` en `apps/mobile/app.config.ts` usando `withAndroidManifest` y `withDangerousMod` para establecer `android:usesCleartextTraffic="false"` y generar `res/xml/network_security_config.xml` con `<base-config cleartextTrafficPermitted="false" />`.
- **iOS (`LM-129`):** Se configuró `ios.infoPlist.NSAppTransportSecurity` con `{ NSAllowsArbitraryLoads: false }` en `apps/mobile/app.config.ts`.

## Validación

- `npm run lint`, `npm run typecheck` y suite completa de pruebas en verde en PR #34 (`ef99077`) y PR #35 (`6f29223`).

## Tiempo invertido

- ~20 minutos.
