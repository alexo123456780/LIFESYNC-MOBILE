# Reporte de Auditoría Estática de Seguridad (SAST) — LifeSync Mobile

**Proyecto:** LifeSync Mobile (LM)  
**Fecha de ejecución:** 24 de noviembre de 2026  
**Responsables:** 
- Alejandro Magaña López (ALE) — Configuración y ejecución en CI/CD
- Héctor Enrique Mendoza Nava (HEC) — Documentación, análisis y decisiones de seguridad  
**Normativa / Rúbrica:** PRD Sección 16 (SAST y hardening), RF-E05 (15% de la rúbrica)

---

## 1. Resumen Ejecutivo

Como parte del aseguramiento de calidad y seguridad estática de LifeSync Mobile, se configuró y ejecutó el pipeline automatizado de SAST mediante GitHub Actions (`.github/workflows/security.yml`), integrando:
1. **npm audit**: Auditoría de dependencias conocidas (CVEs) en el árbol de node_modules del monorepo.
2. **Gitleaks (v8.24.0+)**: Análisis de detección de secretos, credenciales duras, llaves privadas y tokens en todo el historial git.
3. **GitHub CodeQL (v3)**: Análisis estático semántico de código fuente para JavaScript y TypeScript.
4. **ESLint & TypeScript Compiler**: Chequeos de sintaxis estricta, tipos no seguros (`no-explicit-any`), inyecciones CSV y reglas arquitectónicas de capas puras.

| Herramienta | Tipo de Escaneo | Estado en CI (`security.yml`) | Vulnerabilidades Críticas / Altas | Decisión General |
|---|---|---|---|---|
| **npm audit** | SCA (Dependencias) | **Aprobado** (`--audit-level=high`) | 0 Críticas, 0 Altas | Aceptado / Mitigado |
| **Gitleaks** | Secret Scanning | **Aprobado** | 0 Secretos filtrados | Corregido / Limpio |
| **CodeQL** | SAST Semántico | **Aprobado** | 0 Alertas CWE bloqueantes | Mitigado en código |
| **ESLint / Typecheck** | Linters & Type Safety | **Aprobado** | 0 Errores | Corregido |

---

## 2. Herramientas Utilizadas y Configuración

### 2.1. npm audit
- **Versión:** npm 11.x con Node.js 24 LTS.
- **Alcance:** Monorepo (`apps/api`, `apps/mobile`, raíz).
- **Configuración CI:** Ejecutado con umbral `--audit-level=high` para prevenir rupturas por dependencias transitivas de tooling de desarrollo.

### 2.2. Gitleaks
- **Versión:** `zricethezav/gitleaks:latest`.
- **Alcance:** Historial completo del repositorio (`fetch-depth: 0`) analizando commits, blobs y ramas.
- **Modo:** `--verbose --redact --source /repo`.

### 2.3. GitHub CodeQL
- **Versión Action:** `github/codeql-action/init@v3` y `github/codeql-action/analyze@v3`.
- **Lenguajes:** `javascript-typescript`.
- **Reglas:** Security and Quality pack (CWE-89 SQLi, CWE-79 XSS, CWE-352 CSRF, CWE-639 IDOR, CWE-1236 CSV Injection).

---

## 3. Matriz de Hallazgos y Decisiones

### Hallazgo 1: Vulnerabilidades moderadas en `glob` y `minimatch` (npm audit)
- **ID / CVE:** GHSA-3g3m-2fjr-6pw4 (`glob`), GHSA-g3hv-75wg-m249 (`minimatch`).
- **Severidad:** Moderada (22 ocurrencias en cadena de dependencias de testing).
- **Paquete afectado:** `glob@9.0.0-14.0.1`, `minimatch@7.0.0-11.0.0`.
- **Ruta de dependencia:** Introducido exclusivamente por `jest` / `jest-expo` / `@expo/fingerprint` en `devDependencies`. No forma parte del bundle de producción de la aplicación móvil (`.aab` / `.ipa`) ni del bundle compilado de Node.js de la API (`dist/`).
- **Decisión:** **Aceptado con justificación y Mitigado.**
- **Justificación técnica:** Aplicar `npm audit fix --force` forzaría un downgrade de Jest a versión 29 y Expo a versión 52, rompiendo la compatibilidad obligatoria con Expo SDK 58 y React Native 0.88. Dado que son paquetes que corren únicamente durante la ejecución de pruebas unitarias en entornos aislados de CI (runner efímero de GitHub Actions) y no procesan entradas de usuarios remotos no confiables, no representan vector de ataque en producción. El flag `--audit-level=high` en CI previene el despliegue de cualquier vulnerabilidad de severidad alta o crítica real.

### Hallazgo 2: Riesgo de Inyección de Fórmulas en Exportación CSV (CodeQL / CWE-1236)
- **Severidad:** Media / Alta en aplicaciones que generan archivos tabulares.
- **Ubicación:** `apps/api/src/export/csv-export.strategy.ts`.
- **Descripción:** Caracteres iniciales como `=`, `+`, `-`, `@`, `\t`, `\r` en nombres de medicamentos o notas médicas pueden ser interpretados como fórmulas ejecutables por Microsoft Excel o LibreOffice Calc al abrir el CSV.
- **Decisión:** **Corregido.**
- **Mitigación implementada:** Se diseñó el método de saneamiento estricto `sanitize(value)` en `CsvExportStrategy`:
  ```ts
  if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@') || s.startsWith('\t') || s.startsWith('\r')) {
    s = `'` + s;
  }
  ```
  Prefijando con apóstrofe y escapando comillas dobles según RFC 4180. Se validó con pruebas unitarias específicas en `csv-export.strategy.spec.ts`.

### Hallazgo 3: Control de Acceso y Prevención de IDOR (CWE-639)
- **Severidad:** Alta.
- **Ubicación:** Endpoints `apps/api/src/prescriptions/` y `apps/api/src/incidents/`.
- **Descripción:** Riesgo de acceso no autorizado a recetas médicas o coordenadas de incidentes de otros usuarios mediante manipulación de parámetros de ruta (`:id`).
- **Decisión:** **Corregido.**
- **Mitigación implementada:** Cada consulta y mutación en Prisma valida estrictamente la titularidad con `userId: currentUser.id`. En consultas por `:id`, si el recurso existe pero pertenece a otro usuario, el sistema responde `404 Not Found` en lugar de `403 Forbidden`, evitando la enumeración de identificadores de recursos ajenos.

### Hallazgo 4: Cifrado en Reposo de Datos Clínicos Locales (CWE-311)
- **Severidad:** Alta en dispositivos móviles compartidos o extraviados.
- **Ubicación:** `apps/mobile/src/infrastructure/cache/local-cache.ts`.
- **Descripción:** El almacenamiento de tipo de sangre, alergias, contactos y recetas en texto plano dentro de la memoria flash del dispositivo expone la privacidad médica del paciente.
- **Decisión:** **Corregido.**
- **Mitigación implementada:** Se implementó cifrado simétrico autenticado XChaCha20-Poly1305. La clave de cifrado se deriva de forma única y se almacena en el hardware seguro del dispositivo (Android Keystore / iOS Secure Enclave) mediante `expo-secure-store`. En pruebas unitarias se verifica que los datos en AsyncStorage residen cifrados y que la corrupción del tag de autenticación aborta la lectura.

### Hallazgo 5: Detección de Falsos Positivos de Secretos en Repositorio (Gitleaks)
- **Severidad:** Informativa / Baja.
- **Ubicación:** Archivos `.env.example`, pruebas unitarias de JWT y certificados dummy.
- **Descripción:** Gitleaks detecta tokens o llaves de ejemplo en strings literales de pruebas (p. ej. `JWT_SECRET_DEV_ONLY_NOT_FOR_PROD`).
- **Decisión:** **Mitigado / Corregido.**
- **Mitigación implementada:** Se utiliza `.gitleaksignore` y redacción de valores dummy identificados con prefijos de test (`dummy-token`, `mock-key`). En producción, las variables de entorno reales se inyectan como secretos cifrados en el panel de Render y en GitHub Secrets.

---

## 4. Comandos para Reproducir los Análisis

Para reproducir localmente de manera determinista cada una de las verificaciones estáticas de seguridad:

### 4.1. Auditoría de Dependencias (npm audit)
```bash
# Ejecutar auditoría estándar
npm audit

# Ejecutar con el umbral de falla configurado en CI (debe salir código 0)
npm audit --audit-level=high
```

### 4.2. Escaneo de Secretos con Gitleaks
```bash
# Requiere Docker
docker run --rm -v "$PWD:/repo" --entrypoint sh zricethezav/gitleaks:latest -c \
  "git config --global --add safe.directory /repo && gitleaks detect --source /repo --verbose --redact"
```

### 4.3. Verificación de Tipos y Reglas de Arquitectura
```bash
# Comprobación de tipos en todo el monorepo
npm run typecheck

# Comprobación de linters y reglas de seguridad
npm run lint

# Pruebas arquitectónicas de pureza y límites de capas
npm test --workspace=apps/mobile -- src/architecture.test.ts
```

---

## 5. Conclusiones y Certificación

El código auditado cumple con los estándares exigidos para la entrega de la Etapa 4:
1. No existen vulnerabilidades de severidad alta o crítica sin mitigar en las dependencias.
2. El repositorio no contiene credenciales de producción ni secretos comprometidos.
3. Las mitigaciones para inyección de fórmulas CSV, anti-IDOR y cifrado en reposo están completamente implementadas y cubiertas por pruebas automatizadas con 100% de éxito.

**Firma:** Héctor Enrique Mendoza Nava (QA & Scrum Master)  
**Fecha:** 24 de noviembre de 2026
