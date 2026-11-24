/* global process, fetch, console, setInterval */
/**
 * LifeSync Demo Ping Monitor (LM-91)
 * Realiza un ping HTTP a /api/v1/healthz para evitar que el servicio gratuito de Render
 * se suspenda (spin down) durante los ensayos o el día de la evaluación.
 */

const API_URL = process.env.API_URL || 'https://lifesync-api.onrender.com';
const INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '600000', 10); // 10 minutos por defecto

async function ping() {
  const url = `${API_URL}/api/v1/healthz`;
  const time = new Date().toISOString();
  try {
    const res = await fetch(url);
    console.log(`[${time}] PING ${url} -> Status ${res.status}`);
  } catch (err) {
    console.error(`[${time}] ERROR PING ${url} -> ${err.message}`);
  }
}

console.log(`Iniciando monitor de ping para ${API_URL} cada ${INTERVAL_MS / 1000}s...`);
ping();

if (process.argv.includes('--watch')) {
  setInterval(ping, INTERVAL_MS);
}
