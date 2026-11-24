# Plan de Base de Datos en Render y Respaldo (LM-79, LM-90, LM-91)

Este documento detalla el ciclo de vida, plan de contingencia por expiración y monitoreo de la base de datos PostgreSQL de producción en Render para LifeSync Mobile.

---

## 1. Conexión de la BD en Render (`render.yaml`)

- **Nombre de la BD**: `lifesync-db` (plan free PostgreSQL en Render).
- **Inyección de variables**:
  En `render.yaml`, el servicio web `lifesync-api` consume automáticamente la cadena de conexión mediante `fromDatabase`:
  ```yaml
  databases:
    - name: lifesync-db
      plan: free
      databaseName: lifesync
      user: lifesync

  services:
    - type: web
      name: lifesync-api
      envVars:
        - key: DATABASE_URL
          fromDatabase:
            name: lifesync-db
            property: connectionString
  ```
- **Migraciones al arranque**: El contenedor ejecuta `npx prisma migrate deploy` en su `CMD` antes de iniciar la app NestJS, garantizando la consistencia del esquema.
- **Acceso para pgAdmin (Estación 1)**: Conectarse utilizando la **External Database URL** con SSL (`require`). Tras la evaluación, revocar accesos externos o restringir por IP en el panel de Render.

---

## 2. Mitigación del Riesgo de Expiración a los 30 días

Las bases de datos gratuitas de Render expiran exactamente a los **30 días** desde su creación, con un período de gracia de 14 días.

### Plan de Acción
1. **Fecha de Creación**: Inicio del Sprint 3.
2. **Recordatorio de Calendario**: Agendado para el **Día 25** (5 días antes de la expiración) para los responsables de DevOps y Backend.
3. **Respaldo Fuera de Render**:
   - Se ejecuta periódicamente `bash tools/dump-demo.sh` generando `docs/database/lifesync-demo-backup.sql`.
   - El backup queda almacenado en control de versiones y en disco local del equipo, inmune a caídas de Render.
4. **Comando Explícito de Seed**:
   - `npm run seed:demo -w apps/api` ejecuta el script `prisma/seed.ts` con protección `ALLOW_DEMO_SEED=true`.
   - **Garantía de seguridad**: Este comando **nunca** se ejecuta automáticamente al iniciar el contenedor (protegido por `seed-guard.ts`).

---

## 3. Monitor de Ping para Días de Evaluación

Los servicios gratuitos de Render se duermen tras 15 minutos de inactividad. Para evitar demoras en la primera petición durante las estaciones de evaluación:

1. **Herramienta**: UptimeRobot o cron-job.org apuntando a:
   `https://lifesync-api.onrender.com/api/v1/healthz`
2. **Frecuencia**: Cada 10 minutos.
3. **Monitor Local Alternativo**:
   ```bash
   node tools/ping-monitor.mjs --watch
   ```
