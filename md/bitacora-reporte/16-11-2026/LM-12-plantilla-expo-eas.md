# Reporte de Actividades — LM-12 Plantilla de la app Expo SDK 58 y perfiles de EAS

## Actividad

Plantilla base de la app móvil (LM-33), cliente HTTP y configuración por entorno (LM-34) y perfiles de EAS (parte de LM-35).

## Objetivo

Que el equipo arranque directamente en pantallas, sobre una app con arquitectura limpia por capas, navegación con pilas separadas y la URL del API definida por perfil de compilación.

## Actividades realizadas

- Se generó la app con Expo SDK 58 (React Native 0.88) y TypeScript estricto, con Expo Router y las pilas `(auth)` y `(app)`, cada una con una pantalla de ejemplo.
- Se crearon las capas `domain`, `application`, `infrastructure` y `presentation`; el dominio no importa Expo, React ni React Native.
- Se implementó el esqueleto de sesión: un contexto de sesión y una guardia que redirige a la pila correcta según haya o no sesión, con la regla de redirección como función pura probada.
- Se creó el cliente HTTP base, con errores diferenciados para respuestas no exitosas y para fallos de red, y la configuración por entorno que lee `EXPO_PUBLIC_API_URL` y falla al arrancar si falta.
- Se definió `eas.json` con los perfiles `development`, `preview` y `production`, cada uno con la URL del API.
- Se unificó la versión de React en todo el monorepo para evitar duplicados que rompen los componentes en ejecución.

## Criterios atendidos

- La app compila con Expo SDK 58 y existen las carpetas `src/domain`, `src/application`, `src/infrastructure` y `src/presentation`.
- La URL del API sale de `EXPO_PUBLIC_API_URL` por perfil de EAS y no está escrita en ningún componente.
- `eas.json` define los perfiles `development`, `preview` y `production`.
- Existen `app/(auth)` y `app/(app)` con una pantalla de ejemplo cada una.
- Una llamada a `GET /healthz` desde el cliente HTTP de la app obtiene 200.

## Resultado

La app dispone de la estructura sobre la que se construyen las pantallas, con la guardia de sesión en su versión básica y la configuración por entorno lista para los tres perfiles de compilación.

## Validación

- `expo-doctor`: 20 de 20 comprobaciones sin incidencias.
- Empaquetado de Android con Metro correcto (bundle Hermes).
- Typecheck estricto, lint y formato sin errores; 9 pruebas de la app (regla de redirección y cliente HTTP) y 17 del API en verde.
- El cliente HTTP de la app obtuvo `{"status":"ok"}` de un API en ejecución y falla con un mensaje claro si falta la variable de entorno.
- Instalación limpia desde cero con una única copia de React; `npm audit` sin vulnerabilidades altas ni críticas.

## Observaciones

Quedan pendientes, por requerir una cuenta de Expo y un teléfono físico, el registro de `EXPO_TOKEN` como secreto de GitHub, la inicialización del proyecto en EAS, la generación de la development build de Android y la verificación del SDK que soporta Expo Go en el teléfono de cada integrante. Las rutas viven en `app/` como define el PRD, y no en `src/app/` como lo hace la plantilla actual de Expo. El dominio de producción de la URL del API en los perfiles `preview` y `production` es provisional hasta que Render asigne el nombre real.
