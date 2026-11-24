# Reporte de Actividades — LM-119 Auditoría SAST y resolución de hallazgos

## Actividad

Ejecución de `npm audit`, Gitleaks y CodeQL sobre el repositorio y remediación de hallazgos (`LM-132`, `LM-133`).

## Objetivo

Integrar el Sprint 3 a `prod` y `develop` con cero alertas críticas/altas de análisis estático y cero secretos expuestos en el historial Git.

## Actividades realizadas

- **Gitleaks:** Se detectó un token de Atlassian en `tools/jira_helper.py` (commit `84c88a1`); se reescribió el historial de `merge/sprint3-LM-79-133-into-prod` y `feature/LM-85-86-87-alertas-sensores` eliminando el archivo y manteniendo commits firmados.
- **CodeQL:** Se corrigieron 5 alertas críticas de _Type confusion through parameter tampering_ en `apps/api/src/prescriptions/prescriptions.controller.ts` y `prescriptions.service.ts` validando explícitamente `Buffer.isBuffer(...)` y `.byteLength`.
- Se mantuvo actualizado `docs/security/sast-report.md`.

## Validación

- `ci/security / audit`, `ci/security / gitleaks`, `ci/security / codeql` y `CodeQL` en verde (0 alertas) en PR #34 y PR #35.

## Tiempo invertido

- ~30 minutos.
