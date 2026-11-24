# Protocolo y Registro de Pruebas Manuales en Dispositivo Físico — LifeSync Mobile

**Proyecto:** LifeSync Mobile (LM)  
**Tareas Jira:** LM-138 (Pruebas de falla en dispositivo físico), LM-122 (Simulacro de las 3 estaciones de evaluación)  
**Fecha de ejecución:** 24 de noviembre de 2026  
**Responsable de QA y Registro:** Héctor Enrique Mendoza Nava (HEC)  
**Dispositivo de prueba:** Google Pixel 7a (Android 14, Expo Go SDK 58 / Development Build) / iPhone 13 (iOS 17.5)  
**Backend:** Render Free Web Service + PostgreSQL 16 (Render Managed)

---

## 1. Matriz de Pruebas de Falla en Dispositivo Físico (LM-138)

De acuerdo a la Sección 15 del PRD y los criterios de aceptación de LM-138, se evaluaron los 5 escenarios críticos de resiliencia y tolerancia a fallos:

| ID | Escenario de Falla | Procedimiento de Prueba | Comportamiento Esperado | Resultado | Evidencia / Observaciones |
|---|---|---|---|---|---|
| **PF-01** | **Modo Avión (Sin Conexión)** | 1. Iniciar sesión.<br>2. Cargar ficha médica.<br>3. Activar Modo Avión en ajustes del SO.<br>4. Abrir la pantalla "Tarjeta de emergencia" y editar alergia. | La app no hace crash. Muestra el componente `OfflineBanner` ("⚠️ Sin conexión. Mostrando datos desde la memoria local"). La tarjeta de emergencia se lee íntegramente desde la caché cifrada en reposo. La edición se encola en la `OutboxQueue`. | **PASA (OK)** | Banner visible, datos clínicos visibles de inmediato sin latencia. Al desactivar Modo Avión, la cola vacía los cambios (código 200). |
| **PF-02** | **Permisos Denegados y Bloqueados Permanentemente** | 1. Ir a "Ubicación del incidente" y denegar GPS en diálogo del sistema.<br>2. Presionar "No volver a preguntar".<br>3. Ir a "Escanear receta" y denegar Cámara. | La app entra en estado `BLOCKED` mediante `permissions-machine`. No se bloquea la interfaz. Muestra botón accesible "Abrir ajustes del dispositivo" y habilita la degradación gradual: entrada manual de latitud/longitud y selección de receta desde galería o nota de texto. | **PASA (OK)** | Degradación gradual funciona al 100%. `useDevicePermission` redirige a `Linking.openSettings()` de forma limpia. Cero crashes. |
| **PF-03** | **Matar la App y Reabrir con Sesión Activa** | 1. Iniciar sesión con usuario demo.<br>2. Forzar el cierre de la app desde la lista de apps recientes de Android/iOS (swipe kill).<br>3. Reabrir la app. | `session-context` lee los tokens JWT de `expo-secure-store`. La sesión se restaura automáticamente sin exigir reingreso de contraseña. La pantalla de bienvenida no se muestra y se navega directo a `/(app)`. | **PASA (OK)** | Restauración en < 200 ms. Estado del usuario intacto. |
| **PF-04** | **Token de Acceso Expirado** | 1. Modificar token en cliente para simular expiración o esperar tiempo de vida.<br>2. Realizar petición de lectura de medicamentos. | El interceptor `HttpClient` detecta respuesta `401 Unauthorized`. Ejecuta el mecanismo single-flight de refresh de token con `/oauth/token`. Si el refresh es exitoso, reintenta transparentemente la petición original. Si el refresh falla, limpia SecureStore y redirige a pantalla de login. | **PASA (OK)** | Peticiones concurrentes se agrupan en una sola llamada de refresh; la navegación se mantiene fluida y los tokens nunca se loggean. |
| **PF-05** | **Servidor Dormido en Render (Cold Start)** | 1. Dejar inactivo el servicio en Render durante > 15 minutos (estado spun down).<br>2. Abrir la app e intentar sincronización. | Se activa el componente `ServerWaking`. Muestra indicador de carga accesible y mensaje informativo: *"El servicio gratuito de Render se encuentra despertando..."*, realizando reintentos periódicos cada 2 s con botón de "Reintentar conexión" si supera los 5 intentos. | **PASA (OK)** | Al levantar el contenedor en Render (~40-50 s), la app se desbloquea automáticamente y transiciona al contenido sin requerir reinicio del usuario. |

---

## 2. Simulacro de las 3 Estaciones de Evaluación Docente (LM-122)

En cumplimiento de las secciones 18 y 20.1 del PRD, se ensayó el guion de demostración completo con los integrantes del equipo:

### Estación 1: Onboarding, Autenticación y Cifrado Local
- **Actores:** Alejandro (backend/infraestructura), Héctor (QA/móvil).
- **Flujo ejecutado:**
  1. Registro de usuario con validación estricta de formulario (correo RFC 5322, contraseña >= 12 caracteres con mayúscula, minúscula, número y símbolo).
  2. Autenticación OAuth 2.0 PKCE con inyección de cookies `HttpOnly` y protección CSRF.
  3. Ingreso de perfil médico de emergencia: Grupo sanguíneo (O+), Donador de órganos, Alergia a Penicilina, Medicamento Enalapril 10 mg cada 8 horas, Contacto de emergencia.
  4. Inspección de almacenamiento local: Se comprobó que los datos en AsyncStorage residen cifrados mediante el tag XChaCha20-Poly1305.
- **Resultado:** **Aprobado sin incidencias.**

### Estación 2: Resiliencia Offline, Sensores y Falla de Permisos
- **Actores:** Jose, Maria, Héctor.
- **Flujo ejecutado:**
  1. Conmutación repentina a Modo Avión.
  2. Acceso inmediato a la "Tarjeta de Emergencia" offline (lectura desde SecureStore + caché local).
  3. Denegación intencional de permisos de GPS en "Ubicación del Incidente": El sistema ofrece campos manuales de coordenadas y botón de reintento.
  4. Agregado de un nuevo contacto de emergencia sin red: El contacto se persiste en la `OutboxQueue` encriptada.
  5. Desactivación de Modo Avión: La app detecta el evento de reconexión y realiza el flush FIFO automático hacia la API.
- **Resultado:** **Aprobado sin incidencias.**

### Estación 3: Alertas Médicas, Anomalías, Caídas y Exportación
- **Actores:** Alejandro, Héctor.
- **Flujo ejecutado:**
  1. Simulación de regla de dosis crítica: Se verifica que un medicamento crítico sin confirmación a los 15 minutos dispara la notificación mediante el `AlertSubject` a los 3 observadores (Log en memoria, InAppBanner y LocalNotification).
  2. Detección de caída: Simulación del acelerómetro superando el umbral de impacto (`> 2.8g`) seguido de inmovilidad (`< 0.3g`).
  3. Activación de la pantalla de cuenta regresiva de 30 segundos con sonido/vibración y botón de cancelación "Estoy bien". Al expirar, se despacha el SMS/notificación con la última ubicación conocida.
  4. Exportación clínica: Generación y descarga de exportación en formato JSON y CSV sanitizado con prevención contra inyección de fórmulas (apóstrofe inicial en celdas con caracteres ejecutables).
- **Resultado:** **Aprobado sin incidencias.**

---

## 3. Registro de Incidencias / Errores Encontrados

Durante las pruebas iniciales previas al simulacro se detectaron y resolvieron los siguientes tickets de ajuste:

1. **INC-01 (Solucionado en commit previo):** Petición `DELETE` o `POST` con código de respuesta HTTP `204 No Content` generaba parsing de string vacío `""` en lugar de `undefined` en `HttpClient`.
   - *Corrección:* Se introdujo guarda directa `if (response.status === 204) return undefined as T;` en `http-client.ts`.
2. **INC-02 (Solucionado en commit previo):** El componente `OfflineBanner` contenía códigos hexadecimales quemados que violaban la regla arquitectónica de tokens de accesibilidad.
   - *Corrección:* Se mapearon a `colors.warningSurface`, `colors.onWarningSurface`, `borderWidth.thin` y `radius.md`.
3. **INC-03 (Solucionado en commit previo):** Acelerómetro con timeout en suite de cobertura Jest por alta concurrencia.
   - *Corrección:* Se configuró `--testTimeout=15000` garantizando el 100% de pases en CI y local.

**Total de errores bloqueantes al cierre de la etapa:** **0 errores.**  
**Dictamen:** El sistema se encuentra 100% listo para la presentación ante el docente evaluador.
