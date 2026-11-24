# Reporte de Actividades — LM-120 Build Release de Android firmado (.aab)

## Actividad

Configuración de perfil `production` y lanzamiento del build `.aab` firmado en EAS Build (`LM-134`, pendiente verificación `LM-135` al finalizar la cola).

## Objetivo

Generar el artefacto Android App Bundle (`.aab`) firmado con el keystore remoto de Expo apuntando a la API de producción en Render.

## Actividades realizadas

- Se verificó el perfil `production` en `apps/mobile/eas.json` (`android.buildType: "app-bundle"`, `autoIncrement: true`, `EXPO_PUBLIC_API_URL=https://lifesync-api-fw89.onrender.com/api/v1`).
- Se lanzó el build en EAS (`npx eas-cli build --platform android --profile production --non-interactive --no-wait`), incrementando `versionCode` de `1` a `2` y usando las credenciales remotas `Build Credentials n5cJICPex_`.
- Build ID: `e1dbd535-b680-4f2c-8ffc-258a93c11431` (`https://expo.dev/accounts/joselomalles-team/projects/lifesync/builds/e1dbd535-b680-4f2c-8ffc-258a93c11431`).

## Validación

- Build en cola (`IN_QUEUE`) en EAS sobre commit `6f29223`; pendiente descarga y verificación con `jarsigner` (`LM-135`) al completar.

## Tiempo invertido

- ~10 minutos.
