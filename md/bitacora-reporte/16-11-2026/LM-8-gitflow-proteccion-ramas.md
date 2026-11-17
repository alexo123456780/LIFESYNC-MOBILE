# Reporte de Actividades — LM-8 GitFlow, protección de ramas y commits firmados

## Actividad

Protección de las ramas `prod` y `develop` con secret scanning (LM-23) y plantilla de Pull Request con guía de firma de commits (LM-24).

## Objetivo

Garantizar que todo cambio llegue por un Pull Request con los controles de CI en verde y commits firmados, y que ninguna llave llegue al repositorio público.

## Actividades realizadas

- Se documentó el flujo GitFlow del proyecto, con `prod` como rama de producción y `develop` como rama de integración.
- Se protegieron `prod` y `develop`: sin push directo ni forzado (tampoco para administradores), sin borrado, Pull Request obligatorio y commits firmados.
- Se marcaron como obligatorios los checks del pipeline: calidad, e2e, build de Docker, auditoría de dependencias, Gitleaks y CodeQL.
- Se confirmó que el secret scanning y el push protection están activos en el repositorio.
- Se creó la plantilla de Pull Request con la clave Jira y la Definition of Done.
- Se redactó la guía para firmar commits con SSH o GPG.

## Criterios atendidos

- `prod` y `develop` rechazan push directo y push forzado, y exigen Pull Request.
- Un Pull Request no se puede fusionar sin los checks de CI en verde ni con commits sin firmar.
- Secret scanning y push protection están activos en el repositorio.
- Al abrir un Pull Request aparece la plantilla con la clave `LM-n` y la Definition of Done.

## Resultado

Las ramas principales quedan protegidas y todo cambio es trazable a su ticket y validado por el pipeline antes de integrarse.

## Validación

- Consulta de la configuración de protección de ambas ramas y de la configuración de seguridad del repositorio.
- Intento de push directo a `develop` rechazado por GitHub.
- Los commits del proyecto aparecen como `Verified` en GitHub.

## Observaciones

Por decisión del responsable del proyecto no se exige la aprobación de un revisor ni se define CODEOWNERS. La verificación de que los demás integrantes tengan configurada la firma de commits queda a cargo de cada uno siguiendo la guía.
