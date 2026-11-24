# Reporte de Actividades — LM-121 Pipeline iOS y .ipa firmado

## Actividad

Preparación de configuración iOS en `app.config.ts` y `eas.json` (`LM-136`) y registro de requerimiento de cuenta Apple Developer (`LM-137`).

## Objetivo

Dejar lista la configuración base de iOS (`bundleIdentifier`, permisos `Info.plist`, `NSAppTransportSecurity`, perfil `production` en `eas.json`) y documentar el requisito para emitir `.ipa`.

## Actividades realizadas

- Se verificó en `apps/mobile/app.config.ts` la configuración `ios.bundleIdentifier: 'com.lifesync.mobile'`, `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` y `NSAppTransportSecurity.NSAllowsArbitraryLoads: false`.
- Se verificó el perfil `production` en `apps/mobile/eas.json`.
- **Bloqueo externo (`LM-137`):** La generación de un `.ipa` firmado en EAS requiere membresía activa de **Apple Developer Program**; queda pendiente de credencial Apple Developer si se requiere entrega iOS.

## Validación

- `tsc --noEmit` y `eslint` en verde sobre `apps/mobile/app.config.ts`.

## Tiempo invertido

- ~10 minutos.
