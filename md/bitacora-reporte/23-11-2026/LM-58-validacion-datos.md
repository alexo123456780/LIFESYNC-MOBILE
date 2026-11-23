# Reporte de Actividades — LM-58 Validar mis datos antes de enviarlos

## Actividad

Definición de esquemas Zod clínicos en la capa de dominio (`LM-75`) e integración de validación accesible con bloqueo de envío inválido en formularios (`LM-76`).

## Objetivo

Que la app valide localmente perfil clínico, alergias, medicamentos y contactos de emergencia con las mismas reglas, longitudes y catálogos que los DTOs del servidor, muestre errores accesibles junto a cada campo y evite llamadas innecesarias a la red mientras haya datos inválidos.

## Actividades realizadas

- Se crearon en `apps/mobile/src/domain/health-schemas.ts` los catálogos (`BLOOD_TYPES`, `SEVERITIES`), límites (`HEALTH_FIELD_LIMITS`), esquemas Zod (`healthProfileSchema`, `allergySchema`, `medicationSchema`, `emergencyContactSchema`) y el helper puro `validateWithSchema`, sin dependencias de Expo ni React Native.
- Se cubrieron reglas de dominio críticas: longitudes máximas del PRD (`500`, `100`, `50`, `20`), catálogos de tipo de sangre y severidad, `frequencyHours` entero positivo, formato telefónico y validación cruzada `endsAt >= startsAt`.
- Se creó el hook `useValidatedForm` (`apps/mobile/src/presentation/forms/use-validated-form.ts`) y el contenedor `ValidatedForm` (`apps/mobile/src/presentation/forms/ValidatedForm.tsx`) conectados con `TextField` y `Button`: muestran el error junto al campo (`accessibilityLiveRegion="polite"` y `accessibilityHint`), anuncian los errores a lectores de pantalla con `AccessibilityInfo.announceForAccessibility`, bloquean el envío inválido (`canSubmit`) y limpian los errores automáticamente al corregir los datos.
- Se agregaron suites de pruebas unitarias (`health-schemas.test.ts` y `use-validated-form.test.tsx`).

## Criterios atendidos

- Cada esquema rechaza los mismos casos que su DTO: longitud excedida, catálogo inválido, frecuencia no positiva y `endsAt` anterior a `startsAt`.
- Los esquemas viven en `src/domain/` sin importar Expo, React ni React Native (verificado por `src/architecture.test.ts`).
- Con un dato inválido no se llama a la API, el error aparece junto al campo, se anuncia con lector de pantalla y el botón de guardado queda deshabilitado.
- Al corregir el dato, el error desaparece y se habilita guardar nuevamente.

## Resultado

Validación local de dominio y capa reutilizable de formularios validados lista para conectarse en las pantallas de perfil, alergias, medicamentos y contactos del Sprint 2.

## Validación

- `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` en verde en todo el monorepo (incluyendo `architecture.test.ts`, `health-schemas.test.ts` y `use-validated-form.test.tsx`).

## Tiempo invertido

- ~35 minutos (diseño de esquemas Zod, hook/componente de formularios accesibles, pruebas unitarias y documentación).
